export const CLAVE_NOTIFICACIONES =
    'tablero_incidentes_notificaciones';

export const EVENTO_NOTIFICACIONES =
    'tablero-incidentes-notificaciones';

export function obtenerNotificaciones() {
    try {
        const guardadas = localStorage.getItem(
            CLAVE_NOTIFICACIONES
        );

        if (!guardadas) {
            return [];
        }

        return JSON.parse(guardadas);
    } catch {
        return [];
    }
}

function emitirNotificaciones(notificaciones) {
    localStorage.setItem(
        CLAVE_NOTIFICACIONES,
        JSON.stringify(notificaciones)
    );

    window.dispatchEvent(
        new CustomEvent(EVENTO_NOTIFICACIONES, {
            detail: notificaciones
        })
    );
}

export function agregarNotificacion(notificacion) {
    const siguiente = [
        {
            id: `${Date.now()}-${Math.random()}`,
            fecha: new Date().toISOString(),
            ...notificacion
        },
        ...obtenerNotificaciones()
    ].slice(0, 30);

    emitirNotificaciones(siguiente);

    return siguiente[0];
}

export function eliminarNotificacion(id) {
    const siguiente = obtenerNotificaciones().filter(
        (notificacion) => notificacion.id !== id
    );

    emitirNotificaciones(siguiente);
}

export function limpiarNotificaciones() {
    emitirNotificaciones([]);
}
