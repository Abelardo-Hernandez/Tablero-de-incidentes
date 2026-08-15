const db = require('../config/db');

async function obtenerNotificaciones(req, res) {
    try {
        const condiciones = ['n.leida = 0'];
        const valores = [];

        condiciones.push('n.usuario_id = ?');
        valores.push(req.user.id);

        const [notificaciones] = await db.query(
            `
            SELECT
                n.id,
                n.usuario_id,
                n.area_id,
                n.incidencia_id,
                n.tipo,
                n.titulo,
                n.mensaje,
                n.leida,
                n.fecha_creacion
            FROM notificaciones n
            WHERE ${condiciones.join(' AND ')}
            ORDER BY n.fecha_creacion DESC, n.id DESC
            LIMIT 30
            `,
            valores
        );

        return res.json({
            success: true,
            data: notificaciones.map((item) => ({
                ...item,
                leida: Boolean(item.leida)
            }))
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener las notificaciones'
        });
    }
}

async function marcarNotificacionLeida(req, res) {
    try {
        const { id } = req.params;
        const [resultado] = await db.query(
            `
            UPDATE notificaciones n
            SET n.leida = 1,
                n.fecha_lectura = CURRENT_TIMESTAMP
            WHERE n.id = ?
              AND n.usuario_id = ?
            `,
            [
                id,
                req.user.id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notificacion no encontrada'
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificacion:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible actualizar la notificacion'
        });
    }
}

module.exports = {
    marcarNotificacionLeida,
    obtenerNotificaciones
};
