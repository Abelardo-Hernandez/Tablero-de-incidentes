const API_BASE = 'https://api.telegram.org';

function obtenerToken() {
    return String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function telegramConfigurado() {
    return Boolean(obtenerToken());
}

async function llamarTelegram(metodo, datos = {}, timeoutMs = 15000) {
    const token = obtenerToken();

    if (!token) {
        throw new Error('Falta TELEGRAM_BOT_TOKEN en la configuracion del servidor');
    }

    const respuesta = await fetch(`${API_BASE}/bot${token}/${metodo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        signal: AbortSignal.timeout(timeoutMs)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
        throw new Error(resultado.description || `Telegram rechazo ${metodo}`);
    }

    return resultado.result;
}

async function obtenerIdentidadBot() {
    const usernameConfigurado = String(
        process.env.TELEGRAM_BOT_USERNAME || ''
    ).trim().replace(/^@/, '');

    if (usernameConfigurado) {
        return { username: usernameConfigurado };
    }

    return llamarTelegram('getMe');
}

async function enviarMensaje(chatId, texto, opciones = {}) {
    return llamarTelegram('sendMessage', {
        chat_id: chatId,
        text: texto,
        ...opciones
    });
}

async function responderCallback(callbackQueryId, texto = '') {
    return llamarTelegram('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: texto,
        show_alert: false
    });
}

module.exports = {
    enviarMensaje,
    llamarTelegram,
    obtenerIdentidadBot,
    responderCallback,
    telegramConfigurado
};
