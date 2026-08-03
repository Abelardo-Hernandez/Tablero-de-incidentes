const nodemailer = require('nodemailer');

function correoConfigurado() {
    return Boolean(
        (process.env.SMTP_SERVICE === 'gmail' ||
            process.env.SMTP_HOST) &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD
    );
}

function crearTransporter() {
    const connectionTimeout =
        Number(process.env.SMTP_CONNECTION_TIMEOUT) || 10000;
    const greetingTimeout =
        Number(process.env.SMTP_GREETING_TIMEOUT) || 10000;
    const socketTimeout =
        Number(process.env.SMTP_SOCKET_TIMEOUT) || 15000;

    if (process.env.SMTP_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            connectionTimeout,
            greetingTimeout,
            socketTimeout,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
}

async function enviarCorreo({
    para,
    asunto,
    texto,
    html
}) {
    if (!correoConfigurado()) {
        console.warn(
            'Correo no enviado: faltan variables SMTP en .env'
        );
        return {
            enviado: false,
            razon: 'smtp_no_configurado'
        };
    }

    const transporter = crearTransporter();
    const sendTimeout =
        Number(process.env.SMTP_SEND_TIMEOUT) || 12000;

    try {
        await Promise.race([
            transporter.sendMail({
                from:
                    process.env.SMTP_FROM ||
                    process.env.SMTP_USER,
                to: para,
                subject: asunto,
                text: texto,
                html
            }),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(
                        new Error(
                            `Tiempo de espera SMTP agotado (${sendTimeout} ms)`
                        )
                    );
                }, sendTimeout);
            })
        ]);
    } finally {
        transporter.close();
    }

    return {
        enviado: true
    };
}

module.exports = {
    enviarCorreo
};
