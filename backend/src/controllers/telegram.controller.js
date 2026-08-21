const crypto = require('crypto');

const db = require('../config/db');
const {
    obtenerIdentidadBot,
    telegramConfigurado
} = require('../services/telegram-api.service');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function filtroUnidad(req) {
    if (req.user.rol === 'super_admin') {
        return { sql: '', valores: [] };
    }

    return {
        sql: 'AND unidad_negocio_id = ?',
        valores: [req.user.unidad_negocio_id]
    };
}

async function generarVinculacion(req, res) {
    try {
        if (!telegramConfigurado()) {
            return res.status(503).json({
                success: false,
                message: 'Configura TELEGRAM_BOT_TOKEN antes de generar vinculaciones'
            });
        }

        const usuarioId = Number(req.params.id);
        const alcance = filtroUnidad(req);
        const [usuarios] = await db.query(
            `SELECT id, nombre, activo FROM usuarios
             WHERE id = ? ${alcance.sql} LIMIT 1`,
            [usuarioId, ...alcance.valores]
        );

        if (!usuarios[0]) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        if (!usuarios[0].activo) {
            return res.status(409).json({ success: false, message: 'Activa al usuario antes de vincular Telegram' });
        }

        const token = crypto.randomBytes(24).toString('base64url');
        await db.query(
            `INSERT INTO telegram_vinculaciones
                (usuario_id, token_hash, creado_por, fecha_expiracion)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE
                token_hash = VALUES(token_hash), creado_por = VALUES(creado_por),
                fecha_expiracion = VALUES(fecha_expiracion), fecha_uso = NULL,
                fecha_creacion = CURRENT_TIMESTAMP`,
            [usuarioId, hashToken(token), req.user.id]
        );

        const bot = await obtenerIdentidadBot();
        const url = `https://t.me/${bot.username}?start=${token}`;

        return res.json({
            success: true,
            message: 'Liga de vinculacion generada; vence en 24 horas',
            data: { url, expira_en_horas: 24 }
        });
    } catch (error) {
        console.error('Error al generar vinculacion de Telegram:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'No fue posible generar la vinculacion'
        });
    }
}

async function desvincularTelegram(req, res) {
    const connection = await db.getConnection();

    try {
        const usuarioId = Number(req.params.id);
        const alcance = filtroUnidad(req);
        await connection.beginTransaction();
        const [usuarios] = await connection.query(
            `SELECT id, telegram_habilitado FROM usuarios
             WHERE id = ? ${alcance.sql} FOR UPDATE`,
            [usuarioId, ...alcance.valores]
        );

        if (!usuarios[0]) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        await connection.query(
            `UPDATE usuarios SET telegram_user_id = NULL, telegram_chat_id = NULL,
             telegram_habilitado = 0, telegram_vinculado_at = NULL WHERE id = ?`,
            [usuarioId]
        );
        await connection.query('DELETE FROM telegram_vinculaciones WHERE usuario_id = ?', [usuarioId]);
        await connection.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuarioId]);
        await connection.commit();

        return res.json({ success: true, message: 'Cuenta de Telegram desvinculada' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al desvincular Telegram:', error);
        return res.status(500).json({ success: false, message: 'No fue posible desvincular Telegram' });
    } finally {
        connection.release();
    }
}

module.exports = { desvincularTelegram, generarVinculacion, hashToken };
