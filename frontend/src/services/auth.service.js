import api from './api';

const TOKEN_KEY = 'tablero_incidentes_token';
const USER_KEY = 'tablero_incidentes_usuario';

export async function iniciarSesion(credenciales) {
    const response = await api.post(
        '/auth/login',
        credenciales
    );

    const { token, data } = response.data;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(
        USER_KEY,
        JSON.stringify(data)
    );

    return response.data;
}

export async function obtenerSesion() {
    const response = await api.get('/auth/sesion');

    if (response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
    }

    localStorage.setItem(
        USER_KEY,
        JSON.stringify(response.data.data)
    );

    return response.data;
}

export async function obtenerResumenDiarioLogin() {
    const response = await api.get('/auth/resumen-diario');

    return response.data;
}

export function obtenerUsuarioGuardado() {
    try {
        const usuario = localStorage.getItem(USER_KEY);

        return usuario
            ? JSON.parse(usuario)
            : null;
    } catch {
        return null;
    }
}

export function obtenerToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
