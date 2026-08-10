export const CLAVE_NOTIFICACIONES =
    'tablero_incidentes_notificaciones';

export const EVENTO_NOTIFICACIONES =
    'tablero-incidentes-notificaciones';

function obtenerClaveNotificaciones(unidadNegocioId) {
    return unidadNegocioId
        ? `${CLAVE_NOTIFICACIONES}:unidad_${unidadNegocioId}`
        : CLAVE_NOTIFICACIONES;
}

export function obtenerNotificaciones(unidadNegocioId) {
    try {
        const guardadas = localStorage.getItem(
            obtenerClaveNotificaciones(unidadNegocioId)
        );

        if (!guardadas) {
            return [];
        }

        return JSON.parse(guardadas);
    } catch {
        return [];
    }
}

function emitirNotificaciones(
    notificaciones,
    unidadNegocioId
) {
    localStorage.setItem(
        obtenerClaveNotificaciones(unidadNegocioId),
        JSON.stringify(notificaciones)
    );

    window.dispatchEvent(
        new CustomEvent(EVENTO_NOTIFICACIONES, {
            detail: {
                unidadNegocioId,
                notificaciones
            }
        })
    );
}

export function agregarNotificacion(
    notificacion,
    unidadNegocioId
) {
    const siguiente = [
        {
            id: `${Date.now()}-${Math.random()}`,
            fecha: new Date().toISOString(),
            unidad_negocio_id: unidadNegocioId || null,
            ...notificacion
        },
        ...obtenerNotificaciones(unidadNegocioId)
    ].slice(0, 30);

    emitirNotificaciones(siguiente, unidadNegocioId);

    return siguiente[0];
}

export function eliminarNotificacion(id, unidadNegocioId) {
    const siguiente = obtenerNotificaciones(
        unidadNegocioId
    ).filter((notificacion) => notificacion.id !== id);

    emitirNotificaciones(siguiente, unidadNegocioId);
}

export function limpiarNotificaciones(unidadNegocioId) {
    emitirNotificaciones([], unidadNegocioId);
}
