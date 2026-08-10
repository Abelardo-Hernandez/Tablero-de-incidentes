const db = require('../config/db');

const {
    normalizarClave,
    obtenerTiposFallaCatalogo,
    asegurarCatalogoTiposFalla
} = require('../services/tipos-falla.service');

function unidadConsulta(req) {
    return req.user?.rol === 'super_admin'
        ? undefined
        : req.user.unidad_negocio_id;
}

function esSuperAdmin(req) {
    return req.user?.rol === 'super_admin';
}

async function obtenerUnidadObjetivo(req, unidadNegocioId) {
    const unidadObjetivoId =
        esSuperAdmin(req) && unidadNegocioId
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

async function obtenerTiposFalla(req, res) {
    try {
        const tipos = await obtenerTiposFallaCatalogo({
            ...req.query,
            unidadNegocioId: unidadConsulta(req)
        });

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
        const {
            nombre,
            unidad_negocio_id,
            activo = true
        } = req.body;

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

        await asegurarCatalogoTiposFalla(unidadObjetivoId);

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
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                nombreLimpio,
                unidadObjetivoId
            ]
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
                  AND unidad_negocio_id = ?
                LIMIT 1
                `,
                [
                    clave,
                    unidadObjetivoId
                ]
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
                unidad_negocio_id,
                activo,
                sistema
            )
            VALUES (?, ?, ?, ?, 0)
            `,
            [
                clave,
                nombreLimpio,
                unidadObjetivoId,
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
        await asegurarCatalogoTiposFalla(
            req.user.unidad_negocio_id
        );

        const { id } = req.params;
        const {
            nombre,
            activo
        } = req.body;

        const [tipos] = await db.query(
            `
            SELECT id, nombre, activo, unidad_negocio_id
            FROM tipos_falla
            WHERE id = ?
            ${
                esSuperAdmin(req)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            LIMIT 1
            `,
            esSuperAdmin(req)
                ? [id]
                : [
                    id,
                    req.user.unidad_negocio_id
                ]
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
            ${
                esSuperAdmin(req)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            `,
            [
                nuevoNombre,
                nuevoActivo,
                id,
                ...(
                    esSuperAdmin(req)
                        ? []
                        : [req.user.unidad_negocio_id]
                )
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
        await asegurarCatalogoTiposFalla(
            req.user.unidad_negocio_id
        );

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
            ${
                esSuperAdmin(req)
                    ? ''
                    : 'AND unidad_negocio_id = ?'
            }
            `,
            [
                Boolean(activo),
                id,
                ...(
                    esSuperAdmin(req)
                        ? []
                        : [req.user.unidad_negocio_id]
                )
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
