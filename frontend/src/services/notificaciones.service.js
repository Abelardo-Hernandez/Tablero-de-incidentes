import api from './api';

export async function obtenerNotificacionesServidor() {
    const respuesta = await api.get('/notificaciones');
    return respuesta.data;
}

export async function marcarNotificacionLeida(id) {
    const respuesta = await api.patch(`/notificaciones/${id}/leida`);
    return respuesta.data;
}
