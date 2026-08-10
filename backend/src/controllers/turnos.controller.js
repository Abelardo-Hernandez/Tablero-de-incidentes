const db = require('../config/db');

function convertirTurno(turno) {
    return {
        ...turno,
        activo: Boolean(turno.activo)
    };
}

function esSuperAdmin(usuario) {
    return usuario?.rol === 'super_admin';
}

function filtroUnidad(req, alias = 't') {
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

async function obtenerTurnos(req, res) {
    try {
        const { activo } = req.query;

        const filtro = filtroUnidad(req);
        const condiciones = filtro.sql
            ? [filtro.sql]
            : [];
        const valores = [...filtro.valores];

        if (activo !== undefined && activo !== '') {
            condiciones.push('t.activo = ?');
            valores.push(
                activo === 'true' || activo === '1' ? 1 : 0
            );
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [turnos] = await db.query(
            `
            SELECT
                t.id,
                t.unidad_negocio_id,
                un.nombre AS unidad_negocio_nombre,
                t.nombre,
                t.hora_inicio,
                t.hora_fin,
                t.activo,
                t.fecha_creacion
            FROM turnos t
            INNER JOIN unidades_negocio un
                ON un.id = t.unidad_negocio_id
            ${where}
            ORDER BY un.nombre ASC, t.hora_inicio ASC, t.nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: turnos.map(convertirTurno)
        });
    } catch (error) {
        console.error('Error al obtener turnos:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener los turnos'
        });
    }
}

async function crearTurno(req, res) {
    try {
        const {
            nombre,
            hora_inicio,
            hora_fin,
            unidad_negocio_id,
            activo = true
        } = req.body;

        if (!nombre || !hora_inicio || !hora_fin) {
            return res.status(400).json({
                success: false,
                message:
                    'Nombre, hora de inicio y hora de fin son obligatorios'
            });
        }

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
            FROM turnos
            WHERE LOWER(nombre) = LOWER(?)
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                nombre.trim(),
                unidadObjetivoId
            ]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un turno con ese nombre'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO turnos (
                nombre,
                hora_inicio,
                hora_fin,
                unidad_negocio_id,
                activo
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                nombre.trim(),
                hora_inicio,
                hora_fin,
                unidadObjetivoId,
                Boolean(activo)
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Turno creado correctamente',
            data: {
                id: resultado.insertId
            }
        });
    } catch (error) {
        console.error('Error al crear turno:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear el turno'
        });
    }
}

async function actualizarTurno(req, res) {
    try {
        const { id } = req.params;

        const {
            nombre,
            hora_inicio,
            hora_fin,
            activo
        } = req.body;

        const [turnos] = await db.query(
            `
            SELECT *
            FROM turnos
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

        if (turnos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const actual = turnos[0];

        const nuevoNombre =
            nombre !== undefined
                ? nombre.trim()
                : actual.nombre;

        const nuevaHoraInicio =
            hora_inicio !== undefined
                ? hora_inicio
                : actual.hora_inicio;

        const nuevaHoraFin =
            hora_fin !== undefined
                ? hora_fin
                : actual.hora_fin;

        const nuevoActivo =
            activo !== undefined
                ? Boolean(activo)
                : Boolean(actual.activo);

        const [duplicados] = await db.query(
            `
            SELECT id
            FROM turnos
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
                message: 'Ya existe un turno con ese nombre'
            });
        }

        await db.query(
            `
            UPDATE turnos
            SET
                nombre = ?,
                hora_inicio = ?,
                hora_fin = ?,
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
                nuevaHoraInicio,
                nuevaHoraFin,
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
            message: 'Turno actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar turno:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar el turno'
        });
    }
}

async function cambiarEstadoTurno(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el estado del turno'
            });
        }

        const [resultado] = await db.query(
            `
            UPDATE turnos
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
                message: 'Turno no encontrado'
            });
        }

        return res.json({
            success: true,
            message: activo
                ? 'Turno activado correctamente'
                : 'Turno desactivado correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado del turno:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado del turno'
        });
    }
}

module.exports = {
    obtenerTurnos,
    crearTurno,
    actualizarTurno,
    cambiarEstadoTurno
};
