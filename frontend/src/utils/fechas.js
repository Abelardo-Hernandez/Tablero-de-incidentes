export function obtenerTiempoTranscurrido(fecha) {
    if (!fecha) {
        return 'Sin fecha';
    }

    const fechaInicio = new Date(fecha);

    if (Number.isNaN(fechaInicio.getTime())) {
        return 'Fecha inválida';
    }

    const diferencia = Math.max(
        0,
        Date.now() - fechaInicio.getTime()
    );

    const segundos = Math.floor(diferencia / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
        return `${dias} d ${horas % 24} h`;
    }

    if (horas > 0) {
        return `${horas} h ${minutos % 60} min`;
    }

    if (minutos > 0) {
        return `${minutos} min`;
    }

    return `${segundos} s`;
}

export function formatearFechaHora(fecha) {
    if (!fecha) {
        return 'Sin fecha';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return 'Fecha inválida';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(valor);
}