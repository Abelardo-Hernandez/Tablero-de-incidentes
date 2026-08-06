const express = require('express');

const {
    obtenerTiposFalla,
    crearTipoFalla,
    actualizarTipoFalla,
    cambiarEstadoTipoFalla
} = require('../controllers/tipos-falla.controller');

const {
    verificarToken,
    soloAdministrador
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerTiposFalla);

router.post('/', soloAdministrador, crearTipoFalla);
router.put('/:id', soloAdministrador, actualizarTipoFalla);
router.patch(
    '/:id/estado',
    soloAdministrador,
    cambiarEstadoTipoFalla
);

module.exports = router;
