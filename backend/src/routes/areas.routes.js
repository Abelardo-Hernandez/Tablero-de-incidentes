const express = require('express');

const {
    obtenerAreas,
    obtenerAreaPorId,
    crearArea,
    actualizarArea,
    cambiarEstadoArea
} = require('../controllers/areas.controller');

const {
    verificarToken,
    soloAdministrador
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerAreas);
router.get('/:id', obtenerAreaPorId);

router.post('/', soloAdministrador, crearArea);
router.put('/:id', soloAdministrador, actualizarArea);
router.patch(
    '/:id/estado',
    soloAdministrador,
    cambiarEstadoArea
);

module.exports = router;