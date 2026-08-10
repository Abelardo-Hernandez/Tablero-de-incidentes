import api from './api';

export async function obtenerAreasActivas() {
    const response = await api.get('/areas', {
        params: {
            activo: true
        }
    });

    return response.data;
}

export async function obtenerAreas(filtros = {}) {
    const response = await api.get('/areas', {
        params: filtros
    });

    return response.data;
}

export async function crearArea(datos) {
    const response = await api.post('/areas', datos);

    return response.data;
}

export async function actualizarArea(id, datos) {
    const response = await api.put(`/areas/${id}`, datos);

    return response.data;
}

export async function cambiarEstadoArea(id, activo) {
    const response = await api.patch(
        `/areas/${id}/estado`,
        { activo }
    );

    return response.data;
}

export async function obtenerLineasActivas() {
    const response = await api.get('/lineas', {
        params: {
            activo: true
        }
    });

    return response.data;
}

export async function obtenerLineas(filtros = {}) {
    const response = await api.get('/lineas', {
        params: filtros
    });

    return response.data;
}

export async function crearLinea(datos) {
    const response = await api.post('/lineas', datos);

    return response.data;
}

export async function actualizarLinea(id, datos) {
    const response = await api.put(`/lineas/${id}`, datos);

    return response.data;
}

export async function cambiarEstadoLinea(id, activo) {
    const response = await api.patch(
        `/lineas/${id}/estado`,
        { activo }
    );

    return response.data;
}

export async function obtenerTurnosActivos() {
    const response = await api.get('/turnos', {
        params: {
            activo: true
        }
    });

    return response.data;
}

export async function obtenerTurnos(filtros = {}) {
    const response = await api.get('/turnos', {
        params: filtros
    });

    return response.data;
}

export async function crearTurno(datos) {
    const response = await api.post('/turnos', datos);

    return response.data;
}

export async function actualizarTurno(id, datos) {
    const response = await api.put(`/turnos/${id}`, datos);

    return response.data;
}

export async function cambiarEstadoTurno(id, activo) {
    const response = await api.patch(
        `/turnos/${id}/estado`,
        { activo }
    );

    return response.data;
}

export async function obtenerTiposFallaActivos() {
    const response = await api.get('/tipos-falla', {
        params: {
            activo: true
        }
    });

    return response.data;
}

export async function obtenerTiposFalla(filtros = {}) {
    const response = await api.get('/tipos-falla', {
        params: filtros
    });

    return response.data;
}

export async function crearTipoFalla(datos) {
    const response = await api.post('/tipos-falla', datos);

    return response.data;
}

export async function actualizarTipoFalla(id, datos) {
    const response = await api.put(
        `/tipos-falla/${id}`,
        datos
    );

    return response.data;
}

export async function cambiarEstadoTipoFalla(id, activo) {
    const response = await api.patch(
        `/tipos-falla/${id}/estado`,
        { activo }
    );

    return response.data;
}

export async function obtenerUnidadesNegocio(filtros = {}) {
    const response = await api.get('/unidades-negocio', {
        params: filtros
    });

    return response.data;
}

export async function crearUnidadNegocio(datos) {
    const response = await api.post('/unidades-negocio', datos);

    return response.data;
}

export async function actualizarUnidadNegocio(id, datos) {
    const response = await api.put(
        `/unidades-negocio/${id}`,
        datos
    );

    return response.data;
}

export async function cambiarEstadoUnidadNegocio(id, activo) {
    const response = await api.patch(
        `/unidades-negocio/${id}/estado`,
        { activo }
    );

    return response.data;
}
