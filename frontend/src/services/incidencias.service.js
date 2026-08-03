import api from './api';

export async function obtenerIncidencias(filtros = {}) {
    const respuesta = await api.get('/incidencias', {
        params: filtros
    });

    return respuesta.data;
}

export async function obtenerIncidenciaPorId(id) {
    const respuesta = await api.get(`/incidencias/${id}`);

    return respuesta.data;
}

export async function obtenerResponsablesIncidencias() {
    const respuesta = await api.get('/incidencias/responsables');

    return respuesta.data;
}

export async function crearIncidencia(datos) {
    const respuesta = await api.post('/incidencias', datos);

    return respuesta.data;
}

export async function actualizarIncidencia(id, datos) {
    const respuesta = await api.put(
        `/incidencias/${id}`,
        datos
    );

    return respuesta.data;
}

export async function asignarIncidencia(
    id,
    responsableUsuarioId,
    comentario = ''
) {
    const respuesta = await api.patch(
        `/incidencias/${id}/asignar`,
        {
            responsable_usuario_id: responsableUsuarioId,
            comentario
        }
    );

    return respuesta.data;
}

export async function cambiarEstadoIncidencia(
    id,
    estado,
    datos = {}
) {
    const respuesta = await api.patch(
        `/incidencias/${id}/estado`,
        {
            estado,
            ...datos
        }
    );

    return respuesta.data;
}

export async function agregarComentarioIncidencia(
    id,
    comentario
) {
    const respuesta = await api.post(
        `/incidencias/${id}/comentarios`,
        { comentario }
    );

    return respuesta.data;
}
