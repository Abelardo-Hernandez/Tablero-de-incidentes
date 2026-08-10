const db = require('../config/db');

function convertirArea(area) {
    return {
        ...area,
        activo: Boolean(area.activo)
    };
}

function esSuperAdmin(usuario) {
    return usuario?.rol === 'super_admin';
}

function filtroUnidad(req, alias = 'a') {
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

async function obtenerAreas(req, res) {
    try {
        const { activo, buscar } = req.query;

        const filtro = filtroUnidad(req);
        const condiciones = filtro.sql
            ? [filtro.sql]
            : [];
        const valores = [...filtro.valores];

        if (activo !== undefined && activo !== '') {
            condiciones.push('a.activo = ?');
            valores.push(
                activo === 'true' || activo === '1' ? 1 : 0
            );
        }

        if (buscar) {
            condiciones.push(`
                (
                    a.nombre LIKE ?
                    OR a.descripcion LIKE ?
                    OR un.nombre LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;
            valores.push(termino, termino, termino);
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [areas] = await db.query(
            `
            SELECT
                a.id,
                a.unidad_negocio_id,
                un.nombre AS unidad_negocio_nombre,
                a.nombre,
                a.descripcion,
                a.activo,
                a.fecha_creacion
            FROM areas a
            INNER JOIN unidades_negocio un
                ON un.id = a.unidad_negocio_id
            ${where}
            ORDER BY a.activo DESC, un.nombre ASC, a.nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: areas.map(convertirArea)
        });
    } catch (error) {
        console.error('Error al obtener áreas:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener las áreas'
        });
    }
}

async function obtenerAreaPorId(req, res) {
    try {
        const { id } = req.params;

        const [areas] = await db.query(
            `
            SELECT
                id,
                unidad_negocio_id,
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM areas
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

        if (areas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }

        return res.json({
            success: true,
            data: convertirArea(areas[0])
        });
    } catch (error) {
        console.error('Error al obtener área:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener el área'
        });
    }
}

async function crearArea(req, res) {
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
                message: 'El nombre del área es obligatorio'
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
            FROM areas
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
                message: 'Ya existe un área con ese nombre'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO areas (
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
            message: 'Área creada correctamente',
            data: {
                id: resultado.insertId
            }
        });
    } catch (error) {
        console.error('Error al crear área:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear el área'
        });
    }
}

async function actualizarArea(req, res) {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            activo
        } = req.body;

        const [areas] = await db.query(
            `
            SELECT
                id,
                nombre,
                descripcion,
                unidad_negocio_id,
                activo
            FROM areas
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

        if (areas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada'
            });
        }

        const actual = areas[0];

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
                message: 'El nombre del área es obligatorio'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM areas
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
                message: 'Ya existe un área con ese nombre'
            });
        }

        await db.query(
            `
            UPDATE areas
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
            message: 'Área actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar área:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar el área'
        });
    }
}

async function cambiarEstadoArea(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado del área'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE areas
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
                message: 'Área no encontrada'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Área activada correctamente'
                : 'Área desactivada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado del área:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado del área'
        });
    }
}

module.exports = {
    obtenerAreas,
    obtenerAreaPorId,
    crearArea,
    actualizarArea,
    cambiarEstadoArea
};
