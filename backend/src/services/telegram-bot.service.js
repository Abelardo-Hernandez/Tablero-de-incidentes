const db = require('../config/db');
const { hashToken } = require('../controllers/telegram.controller');
const {
    enviarMensaje,
    llamarTelegram,
    responderCallback,
    telegramConfigurado
} = require('./telegram-api.service');
const {
    procesarAccionCallback,
    procesarReporte
} = require('./telegram-reportes.service');

let ejecutandose = false;
let siguienteUpdateId = 0;

async function vincularCuenta(update) {
    const mensaje = update.message;
    const chatId = mensaje.chat.id;
    const telegramUserId = mensaje.from.id;
    const texto = String(mensaje.text || '').trim();
    const coincidencia = texto.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/);
    const token = coincidencia?.[1];

    if (mensaje.chat.type !== 'private') {
        await enviarMensaje(chatId, 'La vinculacion debe realizarse en una conversacion privada con el bot.');
        return;
    }

    if (!token) {
        await enviarMensaje(chatId, 'Hola. Solicita a un administrador tu liga personal de vinculacion desde el tablero.');
        return;
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [vinculaciones] = await connection.query(
            `SELECT v.id, v.usuario_id, u.nombre, u.activo
             FROM telegram_vinculaciones v
             INNER JOIN usuarios u ON u.id = v.usuario_id
             WHERE v.token_hash = ? AND v.fecha_uso IS NULL
               AND v.fecha_expiracion > NOW()
             FOR UPDATE`,
            [hashToken(token)]
        );
        const vinculacion = vinculaciones[0];

        if (!vinculacion || !vinculacion.activo) {
            await connection.rollback();
            await enviarMensaje(chatId, 'La liga no es valida, ya fue utilizada o vencio. Solicita una nueva al administrador.');
            return;
        }

        const [ocupadas] = await connection.query(
            `SELECT id, nombre FROM usuarios
             WHERE (telegram_user_id = ? OR telegram_chat_id = ?)
               AND id <> ? LIMIT 1 FOR UPDATE`,
            [telegramUserId, chatId, vinculacion.usuario_id]
        );
        if (ocupadas[0]) {
            await connection.rollback();
            await enviarMensaje(chatId, 'Esta cuenta de Telegram ya esta vinculada a otro usuario. Pide apoyo a un administrador.');
            return;
        }

        await connection.query(
            `UPDATE usuarios SET telegram_user_id = ?, telegram_chat_id = ?,
             telegram_habilitado = 1, telegram_vinculado_at = NOW()
             WHERE id = ?`,
            [telegramUserId, chatId, vinculacion.usuario_id]
        );
        await connection.query(
            'UPDATE telegram_vinculaciones SET fecha_uso = NOW() WHERE id = ?',
            [vinculacion.id]
        );
        await connection.commit();
        await enviarMensaje(
            chatId,
            `Listo, ${vinculacion.nombre}. Tu cuenta quedo vinculada al Centro de incidencias.\n\nUsa /reporte para crear una incidencia o /estado para consultar tus reportes.`
        );
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function procesarUpdate(update) {
    if (update.callback_query) {
        const callback = update.callback_query;
        const [usuarios] = await db.query(
            `SELECT id, nombre, rol, unidad_negocio_id, area_id, linea_id,
                    telegram_chat_id
             FROM usuarios WHERE telegram_user_id = ? AND telegram_habilitado = 1
               AND activo = 1 LIMIT 1`,
            [callback.from.id]
        );
        if (usuarios[0]) {
            await procesarAccionCallback(usuarios[0], callback);
        } else {
            await responderCallback(callback.id, 'Tu cuenta no esta vinculada');
        }
        return;
    }

    if (!update.message?.text) return;

    try {
        const [resultado] = await db.query(
            `INSERT IGNORE INTO telegram_eventos
                (telegram_update_id, telegram_chat_id, direccion, tipo, estado)
             VALUES (?, ?, 'entrada', 'mensaje', 'recibido')`,
            [update.update_id, update.message.chat.id]
        );
        if (resultado.affectedRows === 0) return;

        if (/^\/start(?:@\w+)?(?:\s|$)/.test(update.message.text.trim())) {
            await vincularCuenta(update);
            await db.query(
                `UPDATE telegram_eventos e
                 LEFT JOIN usuarios u ON u.telegram_chat_id = e.telegram_chat_id
                 SET e.usuario_id = u.id, e.estado = 'procesado', e.fecha_actualizacion = NOW()
                 WHERE e.telegram_update_id = ?`,
                [update.update_id]
            );
            return;
        }

        const [usuarios] = await db.query(
            `SELECT id, nombre, rol, unidad_negocio_id, area_id, linea_id,
                    telegram_chat_id
             FROM usuarios
             WHERE telegram_chat_id = ? AND telegram_habilitado = 1 AND activo = 1 LIMIT 1`,
            [update.message.chat.id]
        );
        if (!usuarios[0]) {
            await enviarMensaje(
                update.message.chat.id,
                'Tu cuenta aun no esta vinculada. Solicita a un administrador tu liga personal.'
            );
            return;
        }

        if (!usuarios[0].unidad_negocio_id || !usuarios[0].area_id) {
            await enviarMensaje(
                update.message.chat.id,
                'Tu usuario necesita una unidad de negocio y un area asignadas antes de reportar. Contacta al administrador.'
            );
            return;
        }

        await procesarReporte(
            usuarios[0],
            update.message.text,
            update.update_id
        );
        await db.query(
            `UPDATE telegram_eventos SET usuario_id = ?, estado = 'procesado',
             fecha_actualizacion = NOW() WHERE telegram_update_id = ?`,
            [usuarios[0].id, update.update_id]
        );
    } catch (error) {
        console.error('No fue posible procesar un mensaje de Telegram:', error.message);
    }
}

async function cicloPolling() {
    while (ejecutandose) {
        try {
            const updates = await llamarTelegram('getUpdates', {
                offset: siguienteUpdateId,
                timeout: 25,
                allowed_updates: ['message', 'callback_query']
            }, 35000);

            for (const update of updates) {
                siguienteUpdateId = update.update_id + 1;
                await procesarUpdate(update);
            }
        } catch (error) {
            console.error('Error temporal en Telegram:', error.message);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}

async function iniciarBotTelegram() {
    const habilitado = String(process.env.TELEGRAM_POLLING_ENABLED || '').toLowerCase() === 'true';
    if (!habilitado || !telegramConfigurado()) {
        console.log(' Telegram: desactivado hasta configurar token y polling');
        return;
    }

    try {
        await llamarTelegram('deleteWebhook', { drop_pending_updates: false });
        await llamarTelegram('setMyCommands', {
            commands: [
                { command: 'reporte', description: 'Crear una incidencia' },
                { command: 'estado', description: 'Consultar mis reportes' },
                { command: 'cancelar', description: 'Cancelar el reporte en curso' },
                { command: 'ayuda', description: 'Mostrar ayuda' }
            ]
        });
        ejecutandose = true;
        cicloPolling();
        console.log(' Telegram: bot conectado mediante polling');
    } catch (error) {
        console.error(' No fue posible iniciar Telegram:', error.message);
    }
}

module.exports = { iniciarBotTelegram };
