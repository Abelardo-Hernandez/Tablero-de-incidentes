import api from './api';

export async function obtenerVideosLocales() {
    const respuesta = await api.get('/videos');

    return respuesta.data;
}
