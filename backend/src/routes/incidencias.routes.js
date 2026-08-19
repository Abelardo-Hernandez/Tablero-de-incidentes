const express = require('express');

const {
    obtenerIncidencias,
    obtenerResponsables,
    obtenerIncidenciaPorId,
    crearIncidencia,
    asignarIncidencia,
    cambiarEstadoIncidencia,
    cerrarIncidenciaAdministrativamente,
    agregarComentario
} = require('../controllers/incidencias.controller');

const {
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerIncidencias);
router.get('/responsables', obtenerResponsables);
router.get('/:id', obtenerIncidenciaPorId);
router.post('/', crearIncidencia);
router.patch('/:id/asignar', asignarIncidencia);
router.patch('/:id/estado', cambiarEstadoIncidencia);
router.post(
    '/:id/cierre-administrativo',
    cerrarIncidenciaAdministrativamente
);
router.post('/:id/comentarios', agregarComentario);

module.exports = router;
