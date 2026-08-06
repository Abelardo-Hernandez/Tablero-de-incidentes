const db = require('../config/db');

const {
    normalizarClave,
    obtenerTiposFallaCatalogo,
    asegurarCatalogoTiposFalla
} = require('../services/tipos-falla.service');

async function obtenerTiposFalla(req, res) {
    try {
        const tipos = await obtenerTiposFallaCatalogo(req.query);

        return res.json({
            success: true,
            data: tipos
        });
    } catch (error) {
        console.error('Error al obtener tipos de falla:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener los tipos de falla'
        });
    }
}

async function crearTipoFalla(req, res) {
    try {
        await asegurarCatalogoTiposFalla();

        const {
            nombre,
            activo = true
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del tipo de falla es obligatorio'
            });
        }

        const nombreLimpio = nombre.trim();
        let clave = normalizarClave(nombreLimpio);

        if (!clave) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe incluir letras o numeros'
            });
        }

        const [porNombre] = await db.query(
            `
            SELECT id
            FROM tipos_falla
            WHERE LOWER(nombre) = LOWER(?)
            LIMIT 1
            `,
            [nombreLimpio]
        );

        if (porNombre.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un tipo de falla con ese nombre'
            });
        }

        const claveBase = clave;
        let consecutivo = 2;

        while (true) {
            const [existentes] = await db.query(
                `
                SELECT id
                FROM tipos_falla
                WHERE clave = ?
                LIMIT 1
                `,
                [clave]
            );

            if (existentes.length === 0) {
                break;
            }

            clave = `${claveBase}_${consecutivo}`;
            consecutivo += 1;
        }

        const [resultado] = await db.query(
            `
            INSERT INTO tipos_falla (
                clave,
                nombre,
                activo,
                sistema
            )
            VALUES (?, ?, ?, 0)
            `,
            [
                clave,
                nombreLimpio,
                Boolean(activo)
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Tipo de falla creado correctamente',
            data: {
                id: resultado.insertId,
                clave
            }
        });
    } catch (error) {
        console.error('Error al crear tipo de falla:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear el tipo de falla'
        });
    }
}

async function actualizarTipoFalla(req, res) {
    try {
        await asegurarCatalogoTiposFalla();

        const { id } = req.params;
        const {
            nombre,
            activo
        } = req.body;

        const [tipos] = await db.query(
            `
            SELECT id, nombre, activo
            FROM tipos_falla
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (tipos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de falla no encontrado'
            });
        }

        const actual = tipos[0];
        const nuevoNombre =
            nombre !== undefined
                ? nombre.trim()
                : actual.nombre;
        const nuevoActivo =
            activo !== undefined
                ? Boolean(activo)
                : Boolean(actual.activo);

        if (!nuevoNombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del tipo de falla es obligatorio'
            });
        }

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM tipos_falla
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
                message: 'Ya existe un tipo de falla con ese nombre'
            });
        }

        await db.query(
            `
            UPDATE tipos_falla
            SET
                nombre = ?,
                activo = ?
            WHERE id = ?
            `,
            [
                nuevoNombre,
                nuevoActivo,
                id
            ]
        );

        return res.json({
            success: true,
            message: 'Tipo de falla actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar tipo de falla:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar el tipo de falla'
        });
    }
}

async function cambiarEstadoTipoFalla(req, res) {
    try {
        await asegurarCatalogoTiposFalla();

        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado del tipo de falla'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE tipos_falla
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
                message: 'Tipo de falla no encontrado'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Tipo de falla activado correctamente'
                : 'Tipo de falla desactivado correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar tipo de falla:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado del tipo de falla'
        });
    }
}

module.exports = {
    obtenerTiposFalla,
    crearTipoFalla,
    actualizarTipoFalla,
    cambiarEstadoTipoFalla
};
