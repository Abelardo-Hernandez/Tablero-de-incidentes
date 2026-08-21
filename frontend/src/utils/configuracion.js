export const EVENTO_CONFIGURACION =
    'tablero-incidentes-configuracion';

export const configuracionInicial = {
    nombreSistema: 'Centro de incidencias',
    empresa: 'Confecciones Punto Textil',
    zonaHoraria: 'America/Mexico_City',
    prioridadDefault: 'media',
    tiempoPrimeraRespuesta: 15,
    tiempoResolucion: 120,
    refrescoTv: 30,
    mostrarVideosTv: true,
    mostrarCerradasTv: false,
    notificacionesPantalla: true,
    sonidoAlertas: false,
    resumenDiario: true,
    rutaVideos: ''
};

export const prioridadesConfiguracion = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica'
};

export const zonasHorariasConfiguracion = {
    'America/Mexico_City': 'Ciudad de México',
    'America/Monterrey': 'Monterrey',
    'America/Tijuana': 'Tijuana',
    UTC: 'UTC'
};

let configuracionActual = configuracionInicial;

export function cargarConfiguracion() {
    return configuracionActual;
}

export function guardarConfiguracion(datos) {
    const siguiente = {
        ...configuracionInicial,
        ...datos
    };

    configuracionActual = siguiente;

    window.dispatchEvent(
        new CustomEvent(EVENTO_CONFIGURACION, {
            detail: siguiente
        })
    );

    return siguiente;
}
