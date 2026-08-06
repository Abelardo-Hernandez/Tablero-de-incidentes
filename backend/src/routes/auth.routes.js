const express = require('express');

const {
    iniciarSesion,
    obtenerSesion,
    obtenerResumenDiario
} = require('../controllers/auth.controller');

const {
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

router.post('/login', iniciarSesion);
router.get('/resumen-diario', obtenerResumenDiario);
router.get('/sesion', verificarToken, obtenerSesion);

module.exports = router;
