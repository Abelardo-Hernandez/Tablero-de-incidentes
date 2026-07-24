import api from './api';

export async function obtenerUsuarios(filtros = {}) {
    const response = await api.get('/usuarios', {
        params: filtros
    });

    return response.data;
}

export async function obtenerUsuarioPorId(id) {
    const response = await api.get(`/usuarios/${id}`);

    return response.data;
}

export async function crearUsuario(datos) {
    const response = await api.post('/usuarios', datos);

    return response.data;
}

export async function actualizarUsuario(id, datos) {
    const response = await api.put(
        `/usuarios/${id}`,
        datos
    );

    return response.data;
}

export async function cambiarEstadoUsuario(id, activo) {
    const response = await api.patch(
        `/usuarios/${id}/estado`,
        { activo }
    );

    return response.data;
}

export async function cambiarPasswordUsuario(
    id,
    nuevaPassword
) {
    const response = await api.patch(
        `/usuarios/${id}/password`,
        {
            nueva_password: nuevaPassword
        }
    );

    return response.data;
}