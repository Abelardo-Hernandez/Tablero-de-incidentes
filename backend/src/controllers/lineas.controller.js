const db = require('../config/db');

function convertirLinea(linea) {
    return {
        ...linea,
        activo: Boolean(linea.activo)
    };
}

function esSuperAdmin(usuario) {
    return usuario?.rol === 'super_admin';
}

function filtroUnidad(req, alias = 'l') {
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

async function obtenerUnidadObjetivo(req, unidadNegocioId) {
    const unidadObjetivoId =
        esSuperAdmin(req.user) && unidadNegocioId
            ? Number(unidadNegocioId)
            : req.user.unidad_negocio_id;

    const [unidades] = await db.query(
        `
        SELECT id, activo
        FROM unidades_negocio
        WHERE id = ?
        LIMIT 1
        `,
        [unidadObjetivoId]
    );

    if (unidades.length === 0 || !unidades[0].activo) {
        return null;
    }

    return unidadObjetivoId;
}

async function obtenerLineas(req, res) {
    try {
        const { activo, buscar } = req.query;

        const filtro = filtroUnidad(req);
        const condiciones = filtro.sql
            ? [filtro.sql]
            : [];
        const valores = [...filtro.valores];

        if (activo !== undefined && activo !== '') {
            condiciones.push('l.activo = ?');
            valores.push(
                activo === 'true' || activo === '1' ? 1 : 0
            );
        }

        if (buscar) {
            condiciones.push(`
                (
                    l.nombre LIKE ?
                    OR l.descripcion LIKE ?
                    OR un.nombre LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;
            valores.push(termino, termino, termino);
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [lineas] = await db.query(
            `
            SELECT
                l.id,
                l.unidad_negocio_id,
                un.nombre AS unidad_negocio_nombre,
                l.nombre,
                l.descripcion,
                l.activo,
                l.fecha_creacion
            FROM lineas l
            INNER JOIN unidades_negocio un
                ON un.id = l.unidad_negocio_id
            ${where}
            ORDER BY l.activo DESC, un.nombre ASC, l.nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: lineas.map(convertirLinea)
        });
    } catch (error) {
        console.error('Error al obtener líneas:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener las líneas'
        });
    }
}

async function obtenerLineaPorId(req, res) {
    try {
        const { id } = req.params;

        const [lineas] = await db.query(
            `
            SELECT
                id,
                unidad_negocio_id,
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM lineas
            WHERE id = ?
            ${
                esSuperAdmin(req.user)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            LIMIT 1
            `,
            esSuperAdmin(req.user)
                ? [id]
                : [
                    id,
                    req.user.unidad_negocio_id
                ]
        );

        if (lineas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Línea no encontrada'
            });
        }

        return res.json({
            success: true,
            data: convertirLinea(lineas[0])
        });
    } catch (error) {
        console.error('Error al obtener línea:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener la línea'
        });
    }
}

async function crearLinea(req, res) {
    try {
        const {
            nombre,
            descripcion = null,
            unidad_negocio_id,
            activo = true
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la línea es obligatorio'
            });
        }

        const nombreLimpio = nombre.trim();
        const unidadObjetivoId = await obtenerUnidadObjetivo(
            req,
            unidad_negocio_id
        );

        if (!unidadObjetivoId) {
            return res.status(400).json({
                success: false,
                message: 'La unidad de negocio seleccionada no existe o esta desactivada'
            });
        }

        const [existentes] = await db.query(
            `
            SELECT id
            FROM lineas
            WHERE LOWER(nombre) = LOWER(?)
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                nombreLimpio,
                unidadObjetivoId
            ]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una línea con ese nombre'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO lineas (
                nombre,
                descripcion,
                unidad_negocio_id,
                activo
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                nombreLimpio,
                descripcion?.trim() || null,
                unidadObjetivoId,
                Boolean(activo)
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Línea creada correctamente',
            data: {
                id: resultado.insertId
            }
        });
    } catch (error) {
        console.error('Error al crear línea:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear la línea'
        });
    }
}

async function actualizarLinea(req, res) {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            activo
        } = req.body;

        const [lineas] = await db.query(
            `
            SELECT *
            FROM lineas
            WHERE id = ?
            ${
                esSuperAdmin(req.user)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            LIMIT 1
            `,
            esSuperAdmin(req.user)
                ? [id]
                : [
                    id,
                    req.user.unidad_negocio_id
                ]
        );

        if (lineas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Línea no encontrada'
            });
        }

        const actual = lineas[0];

        const nuevoNombre =
            nombre !== undefined
                ? nombre.trim()
                : actual.nombre;

        const nuevaDescripcion =
            descripcion !== undefined
                ? descripcion?.trim() || null
                : actual.descripcion;

        const nuevoActivo =
            activo !== undefined
                ? Boolean(activo)
                : Boolean(actual.activo);

        if (!nuevoNombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la línea es obligatorio'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM lineas
            WHERE LOWER(nombre) = LOWER(?)
              AND unidad_negocio_id = ?
              AND id <> ?
            LIMIT 1
            `,
            [
                nuevoNombre,
                actual.unidad_negocio_id,
                id
            ]
        );

        if (duplicados.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una línea con ese nombre'
            });
        }

        await db.query(
            `
            UPDATE lineas
            SET
                nombre = ?,
                descripcion = ?,
                activo = ?
            WHERE id = ?
            ${
                esSuperAdmin(req.user)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            `,
            [
                nuevoNombre,
                nuevaDescripcion,
                nuevoActivo,
                id,
                ...(
                    esSuperAdmin(req.user)
                        ? []
                        : [req.user.unidad_negocio_id]
                )
            ]
        );

        return res.json({
            success: true,
            message: 'Línea actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar línea:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar la línea'
        });
    }
}

async function cambiarEstadoLinea(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado de la línea'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE lineas
            SET activo = ?
            WHERE id = ?
            ${
                esSuperAdmin(req.user)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            `,
            [
                Boolean(activo),
                id,
                ...(
                    esSuperAdmin(req.user)
                        ? []
                        : [req.user.unidad_negocio_id]
                )
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Línea no encontrada'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Línea activada correctamente'
                : 'Línea desactivada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado de línea:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado de la línea'
        });
    }
}

module.exports = {
    obtenerLineas,
    obtenerLineaPorId,
    crearLinea,
    actualizarLinea,
    cambiarEstadoLinea
};
