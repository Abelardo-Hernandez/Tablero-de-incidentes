const express = require('express');

const {
    desactivarSuscripcion,
    obtenerConfiguracionPush,
    registrarSuscripcion
} = require('../controllers/push.controller');

const {
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/configuracion', obtenerConfiguracionPush);
router.post('/suscripciones', registrarSuscripcion);
router.delete('/suscripciones', desactivarSuscripcion);

module.exports = router;
