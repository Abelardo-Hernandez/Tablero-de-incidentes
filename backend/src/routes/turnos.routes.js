const express = require('express');

const {
    obtenerTurnos,
    crearTurno,
    actualizarTurno,
    cambiarEstadoTurno
} = require('../controllers/turnos.controller');

const {
    verificarToken,
    soloAdministrador
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerTurnos);

router.post('/', soloAdministrador, crearTurno);
router.put('/:id', soloAdministrador, actualizarTurno);
router.patch(
    '/:id/estado',
    soloAdministrador,
    cambiarEstadoTurno
);

module.exports = router;