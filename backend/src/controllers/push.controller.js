const {
    eliminarSuscripcion,
    guardarSuscripcion,
    obtenerClavePublica,
    pushConfigurado
} = require('../services/push.service');

function obtenerConfiguracionPush(req, res) {
    return res.json({
        success: true,
        data: {
            disponible: pushConfigurado(),
            publicKey: obtenerClavePublica()
        }
    });
}

async function registrarSuscripcion(req, res) {
    try {
        if (!pushConfigurado()) {
            return res.status(503).json({
                success: false,
                message: 'Las notificaciones push no estan configuradas en el servidor'
            });
        }

        await guardarSuscripcion({
            usuario: req.user,
            suscripcion: req.body?.subscription,
            userAgent: req.headers['user-agent']
        });

        return res.status(201).json({
            success: true,
            message: 'Dispositivo registrado para notificaciones'
        });
    } catch (error) {
        console.error('Error al registrar push:', error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.statusCode === 400
                    ? error.message
                    : 'No fue posible registrar las notificaciones'
        });
    }
}

async function desactivarSuscripcion(req, res) {
    try {
        await eliminarSuscripcion({
            usuarioId: req.user.id,
            endpoint: req.body?.endpoint
        });

        return res.json({
            success: true,
            message: 'Notificaciones desactivadas para este dispositivo'
        });
    } catch (error) {
        console.error('Error al desactivar push:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible desactivar las notificaciones'
        });
    }
}

module.exports = {
    desactivarSuscripcion,
    obtenerConfiguracionPush,
    registrarSuscripcion
};
