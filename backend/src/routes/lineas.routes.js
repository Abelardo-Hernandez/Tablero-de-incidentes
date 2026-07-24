const express = require('express');

const {
    obtenerLineas,
    obtenerLineaPorId,
    crearLinea,
    actualizarLinea,
    cambiarEstadoLinea
} = require('../controllers/lineas.controller');

const {
    verificarToken,
    soloAdministrador
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerLineas);
router.get('/:id', obtenerLineaPorId);

router.post('/', soloAdministrador, crearLinea);
router.put('/:id', soloAdministrador, actualizarLinea);
router.patch(
    '/:id/estado',
    soloAdministrador,
    cambiarEstadoLinea
);

module.exports = router;