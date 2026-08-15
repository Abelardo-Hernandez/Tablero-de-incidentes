import api from './api';

export async function obtenerVideosLocales() {
    const respuesta = await api.get('/videos');

    const apiBase = api.defaults.baseURL.replace(/\/$/, '');

    respuesta.data.data = (respuesta.data.data || []).map((video) => ({
        ...video,
        src: video.src.startsWith('http')
            ? video.src
            : `${apiBase}${video.src}`
    }));

    return respuesta.data;
}

export async function validarRutaVideos(ruta) {
    const respuesta = await api.post('/videos/validar-ruta', { ruta });
    return respuesta.data;
}
