import api from './api';

export async function obtenerConfiguracionGeneral() {
    const response = await api.get('/configuracion/general');
    return response.data;
}

export async function guardarConfiguracionGeneral(datos) {
    const response = await api.put('/configuracion/general', datos);
    return response.data;
}

export async function obtenerConfigEnvioDiario() {
    const response = await api.get('/configuracion/envio-diario');

    return response.data;
}

export async function guardarConfigEnvioDiario(datos) {
    const response = await api.put(
        '/configuracion/envio-diario',
        datos
    );

    return response.data;
}

export async function enviarResumenDiarioPrueba() {
    const response = await api.post(
        '/configuracion/envio-diario/enviar-prueba'
    );

    return response.data;
}
