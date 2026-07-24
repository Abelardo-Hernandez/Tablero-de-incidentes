const express = require('express');

const {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    cambiarPassword,
    cambiarEstadoUsuario
} = require('../controllers/usuarios.controller');

const {
    verificarToken,
    soloAdministrador
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);
router.use(soloAdministrador);

router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuarioPorId);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.patch('/:id/password', cambiarPassword);
router.patch('/:id/estado', cambiarEstadoUsuario);

module.exports = router;