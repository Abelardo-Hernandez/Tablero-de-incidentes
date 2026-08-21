const bcrypt = require('bcrypt');

const db = require('../config/db');

function convertirBooleanos(usuario) {
    return {
        ...usuario,
        es_lider: Boolean(usuario.es_lider),
        telegram_habilitado: Boolean(usuario.telegram_habilitado),
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

function normalizarTelefonoContacto(telefono) {
    if (!telefono) return null;

    const normalizado = String(telefono)
        .trim()
        .replace(/^00/, '')
        .replace(/\D/g, '');

    return normalizado || null;
}

function telefonoContactoValido(telefono) {
    return !telefono || /^\d{10,15}$/.test(telefono);
}

function esSuperAdmin(usuario) {
    return usuario?.rol === 'super_admin';
}

function condicionUnidad(req, alias = 'u') {
    if (esSuperAdmin(req.user)) {
        return {
            sql: '',
            valores: []
        };
    }

    return {
        sql: `${alias}.unidad_negocio_id = ?`,
        valores: [req.user.unidad_negocio_id]
    };
}

async function validarUnidadActiva(unidadNegocioId) {
    const [unidades] = await db.query(
        `
        SELECT id, activo
        FROM unidades_negocio
        WHERE id = ?
        LIMIT 1
        `,
        [unidadNegocioId]
    );

    return unidades.length > 0 && Boolean(unidades[0].activo);
}

async function validarAreaYLinea({
    rol,
    areaId,
    lineaId,
    unidadNegocioId
}) {
    const rolResponsable =
        rol === 'administrador' || rol === 'super_admin';

    if (rolResponsable && !areaId && !lineaId) {
        return {
            valido: true,
            areaId: null,
            lineaId: null
        };
    }

    if (!rolResponsable && !areaId) {
        return {
            valido: false,
            mensaje: 'El area es obligatoria para usuarios normales'
        };
    }

    if (lineaId && !areaId) {
        return {
            valido: false,
            mensaje: 'Selecciona un area antes de asignar una linea'
        };
    }

    if (!areaId) {
        return {
            valido: true,
            areaId: null,
            lineaId: null
        };
    }

    const [areas] = await db.query(
        `
        SELECT id, nombre, activo
        FROM areas
        WHERE id = ?
          AND unidad_negocio_id = ?
        LIMIT 1
        `,
        [
            areaId,
            unidadNegocioId
        ]
    );

    if (areas.length === 0) {
        return {
            valido: false,
            mensaje: 'El area seleccionada no existe'
        };
    }

    if (!areas[0].activo) {
        return {
            valido: false,
            mensaje: 'El area seleccionada esta desactivada'
        };
    }

    const areaEsProduccion =
        areas[0].nombre.trim().toLowerCase() === 'produccion' ||
        areas[0].nombre.trim().toLowerCase() === 'producción';

    if (rol === 'usuario' && areaEsProduccion && !lineaId) {
        return {
            valido: false,
            mensaje: 'La linea es obligatoria para usuarios de Produccion'
        };
    }

    if (lineaId) {
        const [lineas] = await db.query(
            `
            SELECT id, activo
            FROM lineas
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                lineaId,
                unidadNegocioId
            ]
        );

        if (lineas.length === 0) {
            return {
                valido: false,
                mensaje: 'La linea seleccionada no existe'
            };
        }

        if (!lineas[0].activo) {
            return {
                valido: false,
                mensaje: 'La linea seleccionada esta desactivada'
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

        const filtroUnidad = condicionUnidad(req);
        const condiciones = filtroUnidad.sql
            ? [filtroUnidad.sql]
            : [];
        const valores = [...filtroUnidad.valores];

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
                    OR un.nombre LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;

            valores.push(
                termino,
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
                u.telefono_contacto,
                u.telegram_user_id,
                u.telegram_chat_id,
                u.telegram_habilitado,
                u.telegram_vinculado_at,
                u.rol,
                u.unidad_negocio_id,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                u.fecha_creacion,
                un.nombre AS unidad_negocio_nombre,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            INNER JOIN unidades_negocio un
                ON un.id = u.unidad_negocio_id
            LEFT JOIN areas a
                ON a.id = u.area_id
               AND a.unidad_negocio_id = u.unidad_negocio_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
               AND l.unidad_negocio_id = u.unidad_negocio_id
            ${where}
            ORDER BY
                u.activo DESC,
                un.nombre ASC,
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
        const filtroUnidad = condicionUnidad(req);
        const whereUnidad = filtroUnidad.sql
            ? `AND ${filtroUnidad.sql}`
            : '';

        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.telefono_contacto,
                u.telegram_user_id,
                u.telegram_chat_id,
                u.telegram_habilitado,
                u.telegram_vinculado_at,
                u.rol,
                u.unidad_negocio_id,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                u.fecha_creacion,
                un.nombre AS unidad_negocio_nombre,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            INNER JOIN unidades_negocio un
                ON un.id = u.unidad_negocio_id
            LEFT JOIN areas a
                ON a.id = u.area_id
               AND a.unidad_negocio_id = u.unidad_negocio_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
               AND l.unidad_negocio_id = u.unidad_negocio_id
            WHERE u.id = ?
            ${whereUnidad}
            LIMIT 1
            `,
            [
                id,
                ...filtroUnidad.valores
            ]
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
            telefono_contacto,
            password,
            rol = 'usuario',
            unidad_negocio_id,
            area_id,
            linea_id,
            es_lider = false,
            activo = true
        } = req.body;

        if (!nombre || !usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, usuario y contrasena son obligatorios'
            });
        }

        if (
            !['super_admin', 'administrador', 'usuario'].includes(rol)
        ) {
            return res.status(400).json({
                success: false,
                message: 'El rol seleccionado no es valido'
            });
        }

        if (rol === 'super_admin' && !esSuperAdmin(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo un super admin puede crear otro super admin'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contrasena debe tener al menos 8 caracteres'
            });
        }

        const unidadObjetivoId =
            esSuperAdmin(req.user) && unidad_negocio_id
                ? Number(unidad_negocio_id)
                : req.user.unidad_negocio_id;

        if (!await validarUnidadActiva(unidadObjetivoId)) {
            return res.status(400).json({
                success: false,
                message: 'La unidad de negocio seleccionada no existe o esta desactivada'
            });
        }

        const usuarioNormalizado = usuario.trim().toLowerCase();
        const correoNormalizado = normalizarCorreo(correo);
        const telefonoContactoNormalizado =
            normalizarTelefonoContacto(telefono_contacto);

        if (!correoValido(correoNormalizado)) {
            return res.status(400).json({
                success: false,
                message: 'El correo no tiene un formato valido'
            });
        }

        if (!telefonoContactoValido(telefonoContactoNormalizado)) {
            return res.status(400).json({
                success: false,
                message: 'El telefono de contacto debe incluir de 10 a 15 digitos'
            });
        }

        const [existentes] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE usuario = ?
              OR (? IS NOT NULL AND correo = ?)
              OR (? IS NOT NULL AND telefono_contacto = ?)
            LIMIT 1
            `,
            [
                usuarioNormalizado,
                correoNormalizado,
                correoNormalizado,
                telefonoContactoNormalizado,
                telefonoContactoNormalizado
            ]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El usuario, correo o telefono de contacto ya esta registrado'
            });
        }

        const validacion = await validarAreaYLinea({
            rol,
            areaId: area_id || null,
            lineaId: linea_id || null,
            unidadNegocioId: unidadObjetivoId
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
                telefono_contacto,
                password,
                rol,
                unidad_negocio_id,
                area_id,
                linea_id,
                es_lider,
                activo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                nombre.trim(),
                usuarioNormalizado,
                correoNormalizado,
                telefonoContactoNormalizado,
                passwordHash,
                rol,
                unidadObjetivoId,
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
            telefono_contacto,
            rol,
            unidad_negocio_id,
            area_id,
            linea_id,
            es_lider,
            activo
        } = req.body;

        const filtroUnidad = condicionUnidad(req);
        const whereUnidad = filtroUnidad.sql
            ? `AND ${filtroUnidad.sql}`
            : '';

        const [usuariosActuales] = await db.query(
            `
            SELECT
                id,
                nombre,
                usuario,
                correo,
                telefono_contacto,
                telegram_user_id,
                telegram_chat_id,
                telegram_habilitado,
                rol,
                unidad_negocio_id,
                area_id,
                linea_id,
                es_lider,
                activo
            FROM usuarios u
            WHERE id = ?
            ${whereUnidad}
            LIMIT 1
            `,
            [
                id,
                ...filtroUnidad.valores
            ]
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
        const nuevoTelefonoContacto = telefono_contacto !== undefined
            ? normalizarTelefonoContacto(telefono_contacto)
            : actual.telefono_contacto;
        const nuevoRol = rol || actual.rol;
        const nuevaUnidadNegocioId =
            esSuperAdmin(req.user) && unidad_negocio_id !== undefined
                ? Number(unidad_negocio_id)
                : actual.unidad_negocio_id;
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

        if (!correoValido(nuevoCorreo)) {
            return res.status(400).json({
                success: false,
                message: 'El correo no tiene un formato valido'
            });
        }

        if (!telefonoContactoValido(nuevoTelefonoContacto)) {
            return res.status(400).json({
                success: false,
                message: 'El telefono de contacto debe incluir de 10 a 15 digitos'
            });
        }

        if (
            !['super_admin', 'administrador', 'usuario'].includes(nuevoRol)
        ) {
            return res.status(400).json({
                success: false,
                message: 'El rol seleccionado no es valido'
            });
        }

        if (nuevoRol === 'super_admin' && !esSuperAdmin(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo un super admin puede asignar ese rol'
            });
        }

        if (!await validarUnidadActiva(nuevaUnidadNegocioId)) {
            return res.status(400).json({
                success: false,
                message: 'La unidad de negocio seleccionada no existe o esta desactivada'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE (
                usuario = ?
                OR (? IS NOT NULL AND correo = ?)
                OR (? IS NOT NULL AND telefono_contacto = ?)
            )
              AND id <> ?
            LIMIT 1
            `,
            [
                nuevoUsuario,
                nuevoCorreo,
                nuevoCorreo,
                nuevoTelefonoContacto,
                nuevoTelefonoContacto,
                id
            ]
        );

        if (duplicados.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El usuario, correo o telefono de contacto ya esta registrado'
            });
        }

        const validacion = await validarAreaYLinea({
            rol: nuevoRol,
            areaId: nuevaAreaId,
            lineaId: nuevaLineaId,
            unidadNegocioId: nuevaUnidadNegocioId
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
            UPDATE usuarios u
            SET
                nombre = ?,
                usuario = ?,
                correo = ?,
                telefono_contacto = ?,
                rol = ?,
                unidad_negocio_id = ?,
                area_id = ?,
                linea_id = ?,
                es_lider = ?,
                activo = ?
            WHERE id = ?
            ${whereUnidad}
            `,
            [
                nuevoNombre,
                nuevoUsuario,
                nuevoCorreo,
                nuevoTelefonoContacto,
                nuevoRol,
                nuevaUnidadNegocioId,
                validacion.areaId,
                validacion.lineaId,
                nuevoEsLider,
                nuevoActivo,
                id,
                ...filtroUnidad.valores
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
                message: 'La nueva contrasena es obligatoria'
            });
        }

        if (nueva_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contrasena debe tener al menos 8 caracteres'
            });
        }

        const filtroUnidad = condicionUnidad(req);
        const whereUnidad = filtroUnidad.sql
            ? `AND ${filtroUnidad.sql}`
            : '';

        const [usuarios] = await db.query(
            `
            SELECT id
            FROM usuarios u
            WHERE id = ?
            ${whereUnidad}
            LIMIT 1
            `,
            [
                id,
                ...filtroUnidad.valores
            ]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const passwordHash = await bcrypt.hash(nueva_password, 12);

        await db.query(
            `
            UPDATE usuarios u
            SET password = ?
            WHERE id = ?
            ${whereUnidad}
            `,
            [
                passwordHash,
                id,
                ...filtroUnidad.valores
            ]
        );

        return res.json({
            success: true,
            message: 'Contrasena actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar contrasena:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar la contrasena'
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

        const filtroUnidad = condicionUnidad(req);
        const whereUnidad = filtroUnidad.sql
            ? `AND ${filtroUnidad.sql}`
            : '';

        const [resultado] = await db.query(
            `
            UPDATE usuarios u
            SET activo = ?
            WHERE id = ?
            ${whereUnidad}
            `,
            [
                Boolean(activo),
                id,
                ...filtroUnidad.valores
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
