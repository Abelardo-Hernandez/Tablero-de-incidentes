const express = require('express');

const {
    obtenerUnidadesNegocio,
    crearUnidadNegocio,
    actualizarUnidadNegocio,
    cambiarEstadoUnidadNegocio
} = require('../controllers/unidades-negocio.controller');

const {
    verificarToken,
    soloSuperAdmin
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);
router.use(soloSuperAdmin);

router.get('/', obtenerUnidadesNegocio);
router.post('/', crearUnidadNegocio);
router.put('/:id', actualizarUnidadNegocio);
router.patch('/:id/estado', cambiarEstadoUnidadNegocio);

module.exports = router;
