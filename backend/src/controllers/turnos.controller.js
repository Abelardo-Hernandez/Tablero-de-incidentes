const db = require('../config/db');

function convertirTurno(turno) {
    return {
        ...turno,
        activo: Boolean(turno.activo)
    };
}

async function obtenerTurnos(req, res) {
    try {
        const { activo } = req.query;

        const condiciones = [];
        const valores = [];

        if (activo !== undefined && activo !== '') {
            condiciones.push('activo = ?');
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
                id,
                nombre,
                hora_inicio,
                hora_fin,
                activo,
                fecha_creacion
            FROM turnos
            ${where}
            ORDER BY hora_inicio ASC, nombre ASC
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
            activo = true
        } = req.body;

        if (!nombre || !hora_inicio || !hora_fin) {
            return res.status(400).json({
                success: false,
                message:
                    'Nombre, hora de inicio y hora de fin son obligatorios'
            });
        }

        const [existentes] = await db.query(
            `
            SELECT id
            FROM turnos
            WHERE LOWER(nombre) = LOWER(?)
            LIMIT 1
            `,
            [nombre.trim()]
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
                activo
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                nombre.trim(),
                hora_inicio,
                hora_fin,
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
            LIMIT 1
            `,
            [id]
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
              AND id <> ?
            LIMIT 1
            `,
            [nuevoNombre, id]
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
            `,
            [
                nuevoNombre,
                nuevaHoraInicio,
                nuevaHoraFin,
                nuevoActivo,
                id
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
            `,
            [Boolean(activo), id]
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