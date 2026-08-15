const express = require('express');

const {
    marcarNotificacionLeida,
    obtenerNotificaciones
} = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);
router.get('/', obtenerNotificaciones);
router.patch('/:id/leida', marcarNotificacionLeida);

module.exports = router;
