const db = require('../config/db');

function convertirLinea(linea) {
    return {
        ...linea,
        activo: Boolean(linea.activo)
    };
}

async function obtenerLineas(req, res) {
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

        const [lineas] = await db.query(
            `
            SELECT
                id,
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM lineas
            ${where}
            ORDER BY activo DESC, nombre ASC
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
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM lineas
            WHERE id = ?
            LIMIT 1
            `,
            [id]
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
            activo = true
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la línea es obligatorio'
            });
        }

        const nombreLimpio = nombre.trim();

        const [existentes] = await db.query(
            `
            SELECT id
            FROM lineas
            WHERE LOWER(nombre) = LOWER(?)
            LIMIT 1
            `,
            [nombreLimpio]
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
            LIMIT 1
            `,
            [id]
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
              AND id <> ?
            LIMIT 1
            `,
            [nuevoNombre, id]
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
            `,
            [Boolean(activo), id]
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