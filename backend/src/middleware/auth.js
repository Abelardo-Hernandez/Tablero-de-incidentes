const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Token requerido'
            });
        }

        const partes = authHeader.split(' ');

        if (partes.length !== 2 || partes[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                message: 'Formato de token inválido'
            });
        }

        const token = partes[1];

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = usuario;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
}

function soloAdministrador(req, res, next) {
    if (
        !req.user ||
        ![
            'administrador',
            'super_admin'
        ].includes(req.user.rol)
    ) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta accion'
        });
    }

    next();
}

function soloSuperAdmin(req, res, next) {
    if (!req.user || req.user.rol !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Solo un super administrador puede realizar esta accion'
        });
    }

    next();
}

module.exports = {
    verificarToken,
    soloAdministrador,
    soloSuperAdmin
};
