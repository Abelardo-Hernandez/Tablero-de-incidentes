export const CLAVE_CONFIGURACION =
    'tablero_incidentes_configuracion';

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
    mostrarCerradasTv: false,
    notificacionesPantalla: true,
    sonidoAlertas: false,
    resumenDiario: true
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

export function cargarConfiguracion() {
    try {
        const guardada = localStorage.getItem(
            CLAVE_CONFIGURACION
        );

        if (!guardada) {
            return configuracionInicial;
        }

        return {
            ...configuracionInicial,
            ...JSON.parse(guardada)
        };
    } catch {
        return configuracionInicial;
    }
}

export function guardarConfiguracion(datos) {
    const siguiente = {
        ...configuracionInicial,
        ...datos
    };

    localStorage.setItem(
        CLAVE_CONFIGURACION,
        JSON.stringify(siguiente)
    );

    window.dispatchEvent(
        new CustomEvent(EVENTO_CONFIGURACION, {
            detail: siguiente
        })
    );

    return siguiente;
}
