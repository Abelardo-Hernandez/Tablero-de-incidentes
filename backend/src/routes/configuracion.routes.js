const express = require('express');

const {
    enviarResumenDiarioPrueba,
    guardarConfigEnvioDiario,
    obtenerConfigEnvioDiario
} = require('../controllers/configuracion.controller');

const {
    soloAdministrador,
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);
router.use(soloAdministrador);

router.get('/envio-diario', obtenerConfigEnvioDiario);
router.put('/envio-diario', guardarConfigEnvioDiario);
router.post('/envio-diario/enviar-prueba', enviarResumenDiarioPrueba);

module.exports = router;
