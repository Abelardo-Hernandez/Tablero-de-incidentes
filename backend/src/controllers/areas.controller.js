const db = require('../config/db');

function convertirArea(area) {
    return {
        ...area,
        activo: Boolean(area.activo)
    };
}

async function obtenerAreas(req, res) {
    try {
        const { activo, buscar } = req.query;

        const condiciones = [];
        const valores = [];

        if (activo !== undefined && activo !== '') {
            condiciones.push('activo = ?');
            valores.push(
                activo === 'true' || activo === '1' ? 1 : 0
            );
        }

        if (buscar) {
            condiciones.push(`
                (
                    nombre LIKE ?
                    OR descripcion LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;
            valores.push(termino, termino);
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [areas] = await db.query(
            `
            SELECT
                id,
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM areas
            ${where}
            ORDER BY activo DESC, nombre ASC
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
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM areas
            WHERE id = ?
            LIMIT 1
            `,
            [id]
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
            activo = true
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del área es obligatorio'
            });
        }

        const nombreLimpio = nombre.trim();

        const [existentes] = await db.query(
            `
            SELECT id
            FROM areas
            WHERE LOWER(nombre) = LOWER(?)
            LIMIT 1
            `,
            [nombreLimpio]
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
                activo
            )
            VALUES (?, ?, ?)
            `,
            [
                nombreLimpio,
                descripcion?.trim() || null,
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
                activo
            FROM areas
            WHERE id = ?
            LIMIT 1
            `,
            [id]
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
              AND id <> ?
            LIMIT 1
            `,
            [nuevoNombre, id]
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
            `,
            [
                nuevoNombre,
                nuevaDescripcion,
                nuevoActivo,
                id
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
            `,
            [Boolean(activo), id]
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