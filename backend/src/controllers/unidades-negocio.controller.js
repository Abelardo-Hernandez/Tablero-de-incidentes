const db = require('../config/db');

function convertirUnidad(unidad) {
    return {
        ...unidad,
        activo: Boolean(unidad.activo)
    };
}

async function obtenerUnidadesNegocio(req, res) {
    try {
        const {
            activo,
            buscar
        } = req.query;

        const condiciones = [];
        const valores = [];

        if (activo !== undefined && activo !== '') {
            condiciones.push('activo = ?');
            valores.push(
                activo === 'true' || activo === '1' ? 1 : 0
            );
        }

        if (buscar) {
            condiciones.push(
                '(nombre LIKE ? OR descripcion LIKE ?)'
            );

            const termino = `%${buscar.trim()}%`;
            valores.push(termino, termino);
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [unidades] = await db.query(
            `
            SELECT
                id,
                nombre,
                descripcion,
                activo,
                fecha_creacion
            FROM unidades_negocio
            ${where}
            ORDER BY activo DESC, nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: unidades.map(convertirUnidad)
        });
    } catch (error) {
        console.error('Error al obtener unidades:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener las unidades de negocio'
        });
    }
}

async function crearUnidadNegocio(req, res) {
    try {
        const {
            nombre,
            descripcion = null,
            activo = true
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la unidad es obligatorio'
            });
        }

        const nombreLimpio = nombre.trim();

        const [existentes] = await db.query(
            `
            SELECT id
            FROM unidades_negocio
            WHERE LOWER(nombre) = LOWER(?)
            LIMIT 1
            `,
            [nombreLimpio]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una unidad con ese nombre'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO unidades_negocio (
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
            message: 'Unidad creada correctamente',
            data: {
                id: resultado.insertId
            }
        });
    } catch (error) {
        console.error('Error al crear unidad:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear la unidad de negocio'
        });
    }
}

async function actualizarUnidadNegocio(req, res) {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            activo
        } = req.body;

        const [unidades] = await db.query(
            `
            SELECT id, nombre, descripcion, activo
            FROM unidades_negocio
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (unidades.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unidad de negocio no encontrada'
            });
        }

        const actual = unidades[0];
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
                message: 'El nombre de la unidad es obligatorio'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM unidades_negocio
            WHERE LOWER(nombre) = LOWER(?)
              AND id <> ?
            LIMIT 1
            `,
            [
                nuevoNombre,
                id
            ]
        );

        if (duplicados.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una unidad con ese nombre'
            });
        }

        await db.query(
            `
            UPDATE unidades_negocio
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
            message: 'Unidad actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar unidad:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar la unidad'
        });
    }
}

async function cambiarEstadoUnidadNegocio(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado de la unidad'
            });
        }

        if (
            Number(id) === Number(req.user.unidad_negocio_id) &&
            Boolean(activo) === false
        ) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu unidad actual'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE unidades_negocio
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
                message: 'Unidad de negocio no encontrada'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Unidad activada correctamente'
                : 'Unidad desactivada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado de unidad:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado de la unidad'
        });
    }
}

module.exports = {
    obtenerUnidadesNegocio,
    crearUnidadNegocio,
    actualizarUnidadNegocio,
    cambiarEstadoUnidadNegocio
};
