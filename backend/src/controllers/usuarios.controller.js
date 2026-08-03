const bcrypt = require('bcrypt');

const db = require('../config/db');

function convertirBooleanos(usuario) {
    return {
        ...usuario,
        es_lider: Boolean(usuario.es_lider),
        activo: Boolean(usuario.activo)
    };
}

function normalizarCorreo(correo) {
    return correo
        ? correo.trim().toLowerCase()
        : null;
}

function correoValido(correo) {
    if (!correo) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

async function validarAreaYLinea({
    rol,
    areaId,
    lineaId
}) {
    if (rol === 'administrador') {
        return {
            valido: true,
            areaId: areaId || null,
            lineaId: lineaId || null
        };
    }

    if (!areaId) {
        return {
            valido: false,
            mensaje: 'El área es obligatoria para usuarios normales'
        };
    }

    const [areas] = await db.query(
        `
        SELECT id, nombre, activo
        FROM areas
        WHERE id = ?
        LIMIT 1
        `,
        [areaId]
    );

    if (areas.length === 0) {
        return {
            valido: false,
            mensaje: 'El área seleccionada no existe'
        };
    }

    if (!areas[0].activo) {
        return {
            valido: false,
            mensaje: 'El área seleccionada está desactivada'
        };
    }

    const areaEsProduccion =
        areas[0].nombre.trim().toLowerCase() === 'producción' ||
        areas[0].nombre.trim().toLowerCase() === 'produccion';

    if (areaEsProduccion && !lineaId) {
        return {
            valido: false,
            mensaje: 'La línea es obligatoria para usuarios de Producción'
        };
    }

    if (lineaId) {
        const [lineas] = await db.query(
            `
            SELECT id, activo
            FROM lineas
            WHERE id = ?
            LIMIT 1
            `,
            [lineaId]
        );

        if (lineas.length === 0) {
            return {
                valido: false,
                mensaje: 'La línea seleccionada no existe'
            };
        }

        if (!lineas[0].activo) {
            return {
                valido: false,
                mensaje: 'La línea seleccionada está desactivada'
            };
        }
    }

    return {
        valido: true,
        areaId,
        lineaId: lineaId || null
    };
}

async function obtenerUsuarios(req, res) {
    try {
        const {
            area_id,
            linea_id,
            rol,
            activo,
            buscar
        } = req.query;

        const condiciones = [];
        const valores = [];

        if (area_id) {
            condiciones.push('u.area_id = ?');
            valores.push(area_id);
        }

        if (linea_id) {
            condiciones.push('u.linea_id = ?');
            valores.push(linea_id);
        }

        if (rol) {
            condiciones.push('u.rol = ?');
            valores.push(rol);
        }

        if (activo !== undefined && activo !== '') {
            condiciones.push('u.activo = ?');
            valores.push(activo === 'true' || activo === '1' ? 1 : 0);
        }

        if (buscar) {
            condiciones.push(`
                (
                    u.nombre LIKE ?
                    OR u.usuario LIKE ?
                    OR u.correo LIKE ?
                    OR a.nombre LIKE ?
                    OR l.nombre LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;

            valores.push(
                termino,
                termino,
                termino,
                termino,
                termino
            );
        }

        const where = condiciones.length > 0
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.rol,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                u.fecha_creacion,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            LEFT JOIN areas a
                ON a.id = u.area_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
            ${where}
            ORDER BY
                u.activo DESC,
                u.nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: usuarios.map(convertirBooleanos)
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener los usuarios'
        });
    }
}

async function obtenerUsuarioPorId(req, res) {
    try {
        const { id } = req.params;

        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.rol,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                u.fecha_creacion,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            LEFT JOIN areas a
                ON a.id = u.area_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
            WHERE u.id = ?
            LIMIT 1
            `,
            [id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        return res.json({
            success: true,
            data: convertirBooleanos(usuarios[0])
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener el usuario'
        });
    }
}

async function crearUsuario(req, res) {
    try {
        const {
            nombre,
            usuario,
            correo,
            password,
            rol = 'usuario',
            area_id,
            linea_id,
            es_lider = false,
            activo = true
        } = req.body;

        if (!nombre || !usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, usuario y contraseña son obligatorios'
            });
        }

        if (!['administrador', 'usuario'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'El rol seleccionado no es válido'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        const usuarioNormalizado = usuario.trim().toLowerCase();
        const correoNormalizado = normalizarCorreo(correo);

        if (!correoValido(correoNormalizado)) {
            return res.status(400).json({
                success: false,
                message: 'El correo no tiene un formato válido'
            });
        }

        const [existentes] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE usuario = ?
              OR (? IS NOT NULL AND correo = ?)
            LIMIT 1
            `,
            [
                usuarioNormalizado,
                correoNormalizado,
                correoNormalizado
            ]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El usuario o correo ya está registrado'
            });
        }

        const validacion = await validarAreaYLinea({
            rol,
            areaId: area_id || null,
            lineaId: linea_id || null
        });

        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                message: validacion.mensaje
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [resultado] = await db.query(
            `
            INSERT INTO usuarios (
                nombre,
                usuario,
                correo,
                password,
                rol,
                area_id,
                linea_id,
                es_lider,
                activo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                nombre.trim(),
                usuarioNormalizado,
                correoNormalizado,
                passwordHash,
                rol,
                validacion.areaId,
                validacion.lineaId,
                Boolean(es_lider),
                Boolean(activo)
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            data: {
                id: resultado.insertId
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear el usuario'
        });
    }
}

async function actualizarUsuario(req, res) {
    try {
        const { id } = req.params;

        const {
            nombre,
            usuario,
            correo,
            rol,
            area_id,
            linea_id,
            es_lider,
            activo
        } = req.body;

        const [usuariosActuales] = await db.query(
            `
            SELECT
                id,
                nombre,
                usuario,
                correo,
                rol,
                area_id,
                linea_id,
                es_lider,
                activo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (usuariosActuales.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const actual = usuariosActuales[0];

        const nuevoNombre = nombre?.trim() || actual.nombre;
        const nuevoUsuario = usuario
            ? usuario.trim().toLowerCase()
            : actual.usuario;
        const nuevoCorreo = correo !== undefined
            ? normalizarCorreo(correo)
            : actual.correo;
        const nuevoRol = rol || actual.rol;

        if (!correoValido(nuevoCorreo)) {
            return res.status(400).json({
                success: false,
                message: 'El correo no tiene un formato válido'
            });
        }

        const nuevaAreaId = area_id !== undefined
            ? area_id || null
            : actual.area_id;

        const nuevaLineaId = linea_id !== undefined
            ? linea_id || null
            : actual.linea_id;

        const nuevoEsLider = es_lider !== undefined
            ? Boolean(es_lider)
            : Boolean(actual.es_lider);

        const nuevoActivo = activo !== undefined
            ? Boolean(activo)
            : Boolean(actual.activo);

        if (!['administrador', 'usuario'].includes(nuevoRol)) {
            return res.status(400).json({
                success: false,
                message: 'El rol seleccionado no es válido'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE (
                usuario = ?
                OR (? IS NOT NULL AND correo = ?)
            )
              AND id <> ?
            LIMIT 1
            `,
            [
                nuevoUsuario,
                nuevoCorreo,
                nuevoCorreo,
                id
            ]
        );

        if (duplicados.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El usuario o correo ya está registrado'
            });
        }

        const validacion = await validarAreaYLinea({
            rol: nuevoRol,
            areaId: nuevaAreaId,
            lineaId: nuevaLineaId
        });

        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                message: validacion.mensaje
            });
        }

        if (
            Number(id) === Number(req.user.id) &&
            nuevoActivo === false
        ) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propio usuario'
            });
        }

        await db.query(
            `
            UPDATE usuarios
            SET
                nombre = ?,
                usuario = ?,
                correo = ?,
                rol = ?,
                area_id = ?,
                linea_id = ?,
                es_lider = ?,
                activo = ?
            WHERE id = ?
            `,
            [
                nuevoNombre,
                nuevoUsuario,
                nuevoCorreo,
                nuevoRol,
                validacion.areaId,
                validacion.lineaId,
                nuevoEsLider,
                nuevoActivo,
                id
            ]
        );

        return res.json({
            success: true,
            message: 'Usuario actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar el usuario'
        });
    }
}

async function cambiarPassword(req, res) {
    try {
        const { id } = req.params;
        const { nueva_password } = req.body;

        if (!nueva_password) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña es obligatoria'
            });
        }

        if (nueva_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        const [usuarios] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const passwordHash = await bcrypt.hash(
            nueva_password,
            12
        );

        await db.query(
            `
            UPDATE usuarios
            SET password = ?
            WHERE id = ?
            `,
            [passwordHash, id]
        );

        return res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar la contraseña'
        });
    }
}

async function cambiarEstadoUsuario(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado del usuario'
            });
        }

        if (
            Number(id) === Number(req.user.id) &&
            Boolean(activo) === false
        ) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propio usuario'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE usuarios
            SET activo = ?
            WHERE id = ?
            `,
            [
                Boolean(activo),
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Usuario activado correctamente'
                : 'Usuario desactivado correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado del usuario'
        });
    }
}

module.exports = {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    cambiarPassword,
    cambiarEstadoUsuario
};
