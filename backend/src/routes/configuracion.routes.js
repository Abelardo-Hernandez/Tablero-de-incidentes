const express = require('express');

const {
    enviarResumenDiarioPrueba,
    guardarConfigEnvioDiario,
    guardarConfiguracionGeneral,
    guardarConfiguracionTv,
    obtenerConfigEnvioDiario,
    obtenerConfiguracionGeneral,
    obtenerConfiguracionTv
} = require('../controllers/configuracion.controller');

const {
    soloAdministrador,
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/general', obtenerConfiguracionGeneral);

router.use(soloAdministrador);

router.put('/general', guardarConfiguracionGeneral);
router.get('/tv', obtenerConfiguracionTv);
router.put('/tv', guardarConfiguracionTv);
router.get('/envio-diario', obtenerConfigEnvioDiario);
router.put('/envio-diario', guardarConfigEnvioDiario);
router.post('/envio-diario/enviar-prueba', enviarResumenDiarioPrueba);

module.exports = router;
