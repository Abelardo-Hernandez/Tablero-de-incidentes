const db = require('../config/db');

const {
    enviarCorreo
} = require('./correo.service');

const estadosAbiertos = [
    'nueva',
    'asignada',
    'en_proceso'
];

const estadosResueltos = [
    'resuelta',
    'cerrada'
];

const etiquetasEstado = {
    nueva: 'Nueva',
    asignada: 'Asignada',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada'
};

const etiquetasPrioridad = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
};

function escaparHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function fechaLocalISO(fecha = new Date()) {
    return fecha.toLocaleDateString('en-CA', {
        timeZone:
            process.env.APP_TIMEZONE || 'America/Mexico_City'
    });
}

function horaLocal(fecha = new Date()) {
    return fecha.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone:
            process.env.APP_TIMEZONE || 'America/Mexico_City'
    });
}

function minutosEntre(inicio, fin) {
    if (!inicio || !fin) {
        return null;
    }

    const fechaInicio = new Date(String(inicio).replace(' ', 'T'));
    const fechaFin = new Date(String(fin).replace(' ', 'T'));

    if (
        Number.isNaN(fechaInicio.getTime()) ||
        Number.isNaN(fechaFin.getTime())
    ) {
        return null;
    }

    return Math.max(
        0,
        Math.round((fechaFin - fechaInicio) / 60000)
    );
}

function formatearMinutos(valor) {
    if (valor === null || valor === undefined) {
        return 'Sin datos';
    }

    if (valor < 60) {
        return `${valor} min`;
    }

    const horas = Math.floor(valor / 60);
    const minutos = valor % 60;

    return `${horas} h ${minutos} min`;
}

function agruparPor(incidencias, resolverNombre) {
    const mapa = new Map();

    incidencias.forEach((incidencia) => {
        const nombre = resolverNombre(incidencia) || 'Sin dato';
        mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    });

    return [...mapa.entries()]
        .map(([nombre, cantidad]) => ({
            nombre,
            cantidad
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

async function obtenerIncidenciasDia({
    unidadNegocioId,
    fecha
}) {
    const [incidencias] = await db.query(
        `
        SELECT
            i.id,
            i.titulo,
            i.tipo,
            i.prioridad,
            i.estado,
            i.fecha_creacion,
            i.fecha_asignacion,
            i.fecha_inicio_atencion,
            i.fecha_resolucion,
            i.fecha_cierre,
            a.nombre AS area_nombre,
            l.nombre AS linea_nombre,
            responsable.nombre AS responsable_nombre,
            tf.nombre AS tipo_nombre
        FROM incidencias i
        LEFT JOIN areas a
            ON a.id = i.area_responsable_id
        LEFT JOIN lineas l
            ON l.id = i.linea_id
        LEFT JOIN usuarios responsable
            ON responsable.id = i.usuario_asignado_id
        LEFT JOIN tipos_falla tf
            ON tf.clave = i.tipo
           AND tf.unidad_negocio_id = i.unidad_negocio_id
        WHERE i.unidad_negocio_id = ?
          AND DATE(i.fecha_creacion) = ?
        ORDER BY i.fecha_creacion ASC, i.id ASC
        `,
        [
            unidadNegocioId,
            fecha
        ]
    );

    return incidencias.map((incidencia) => ({
        ...incidencia,
        folio: `INC-${String(incidencia.id).padStart(6, '0')}`
    }));
}

function construirResumen(incidencias) {
    const tiemposAtencion = incidencias
        .map((incidencia) =>
            minutosEntre(
                incidencia.fecha_inicio_atencion ||
                    incidencia.fecha_asignacion,
                incidencia.fecha_resolucion ||
                    incidencia.fecha_cierre
            )
        )
        .filter((valor) => valor !== null);

    return {
        total: incidencias.length,
        abiertas: incidencias.filter((incidencia) =>
            estadosAbiertos.includes(incidencia.estado)
        ).length,
        resueltas: incidencias.filter((incidencia) =>
            estadosResueltos.includes(incidencia.estado)
        ).length,
        cerradas: incidencias.filter(
            (incidencia) => incidencia.estado === 'cerrada'
        ).length,
        canceladas: incidencias.filter(
            (incidencia) => incidencia.estado === 'cancelada'
        ).length,
        criticas: incidencias.filter(
            (incidencia) => incidencia.prioridad === 'critica'
        ).length,
        sinResponsable: incidencias.filter(
            (incidencia) => !incidencia.responsable_nombre
        ).length,
        promedioAtencion: tiemposAtencion.length
            ? Math.round(
                tiemposAtencion.reduce(
                    (total, valor) => total + valor,
                    0
                ) / tiemposAtencion.length
            )
            : null
    };
}

function construirHtml({
    unidadNombre,
    fecha,
    incidencias,
    resumen
}) {
    const kpis = [
        ['Reportes creados', resumen.total],
        ['Abiertos', resumen.abiertas],
        ['Resueltos/cerrados', resumen.resueltas],
        ['Cerrados', resumen.cerradas],
        ['Cancelados', resumen.canceladas],
        ['Criticos', resumen.criticas],
        ['Sin responsable', resumen.sinResponsable],
        [
            'Promedio atencion',
            formatearMinutos(resumen.promedioAtencion)
        ]
    ];

    const rankings = [
        [
            'Por area que atiende',
            agruparPor(
                incidencias,
                (incidencia) => incidencia.area_nombre
            )
        ],
        [
            'Por linea',
            agruparPor(
                incidencias,
                (incidencia) => incidencia.linea_nombre
            )
        ],
        [
            'Por prioridad',
            agruparPor(
                incidencias,
                (incidencia) =>
                    etiquetasPrioridad[incidencia.prioridad] ||
                    incidencia.prioridad
            )
        ],
        [
            'Por estado',
            agruparPor(
                incidencias,
                (incidencia) =>
                    etiquetasEstado[incidencia.estado] ||
                    incidencia.estado
            )
        ],
        [
            'Tipos de falla',
            agruparPor(
                incidencias,
                (incidencia) =>
                    incidencia.tipo_nombre || incidencia.tipo
            )
        ]
    ];

    const kpisHtml = kpis
        .map(
            ([etiqueta, valor]) => `
                <article class="kpi">
                    <span>${escaparHtml(etiqueta)}</span>
                    <strong>${escaparHtml(valor)}</strong>
                </article>
            `
        )
        .join('');

    const rankingsHtml = rankings
        .map(([titulo, datos]) => `
            <section class="ranking">
                <h2>${escaparHtml(titulo)}</h2>
                ${
                    datos.length
                        ? datos
                            .map(
                                (item) => `
                                    <div class="ranking-row">
                                        <span>${escaparHtml(item.nombre)}</span>
                                        <strong>${item.cantidad}</strong>
                                    </div>
                                `
                            )
                            .join('')
                        : '<p class="empty">Sin datos.</p>'
                }
            </section>
        `)
        .join('');

    const filasHtml = incidencias.length
        ? incidencias
            .map((incidencia) => `
                <tr>
                    <td>${escaparHtml(incidencia.folio)}</td>
                    <td>${escaparHtml(String(incidencia.fecha_creacion).slice(11, 16))}</td>
                    <td>${escaparHtml(incidencia.titulo)}</td>
                    <td>${escaparHtml(incidencia.linea_nombre || 'Sin linea')}</td>
                    <td>${escaparHtml(incidencia.area_nombre || 'Sin area')}</td>
                    <td>${escaparHtml(incidencia.responsable_nombre || 'Sin responsable')}</td>
                    <td>${escaparHtml(etiquetasPrioridad[incidencia.prioridad] || incidencia.prioridad)}</td>
                    <td>${escaparHtml(etiquetasEstado[incidencia.estado] || incidencia.estado)}</td>
                    <td>${escaparHtml(formatearMinutos(
                        minutosEntre(
                            incidencia.fecha_inicio_atencion ||
                                incidencia.fecha_asignacion,
                            incidencia.fecha_resolucion ||
                                incidencia.fecha_cierre
                        )
                    ))}</td>
                </tr>
            `)
            .join('')
        : '<tr><td colspan="9">Sin reportes creados hoy.</td></tr>';

    return `
        <!doctype html>
        <html lang="es">
            <head>
                <meta charset="utf-8" />
                <style>
                    body {
                        color: #0f172a;
                        font-family: Arial, sans-serif;
                        line-height: 1.45;
                        margin: 0;
                    }

                    h1 {
                        font-size: 22px;
                        margin: 0 0 6px;
                    }

                    h2 {
                        font-size: 15px;
                        margin: 0 0 10px;
                    }

                    .meta {
                        color: #64748b;
                        font-size: 13px;
                        margin-bottom: 18px;
                    }

                    .kpis,
                    .rankings {
                        display: grid;
                        gap: 10px;
                        grid-template-columns: repeat(4, 1fr);
                        margin-bottom: 18px;
                    }

                    .kpi,
                    .ranking {
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 12px;
                    }

                    .kpi span,
                    .empty {
                        color: #64748b;
                        font-size: 12px;
                    }

                    .kpi strong {
                        display: block;
                        font-size: 20px;
                        margin-top: 4px;
                    }

                    .ranking-row {
                        display: flex;
                        font-size: 13px;
                        justify-content: space-between;
                        padding: 5px 0;
                    }

                    table {
                        border-collapse: collapse;
                        font-size: 12px;
                        width: 100%;
                    }

                    th,
                    td {
                        border-bottom: 1px solid #e2e8f0;
                        padding: 8px;
                        text-align: left;
                        vertical-align: top;
                    }

                    th {
                        background: #f8fafc;
                        color: #334155;
                    }
                </style>
            </head>

            <body>
                <h1>Resumen diario de incidencias</h1>
                <div class="meta">
                    Unidad: ${escaparHtml(unidadNombre)}
                    &middot; Fecha: ${escaparHtml(fecha)}
                    &middot; Generado: ${escaparHtml(new Date().toLocaleString('es-MX'))}
                </div>

                <section class="kpis">${kpisHtml}</section>
                <section class="rankings">${rankingsHtml}</section>

                <table>
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Hora</th>
                            <th>Titulo</th>
                            <th>Linea</th>
                            <th>Area</th>
                            <th>Responsable</th>
                            <th>Prioridad</th>
                            <th>Estado</th>
                            <th>Tiempo</th>
                        </tr>
                    </thead>
                    <tbody>${filasHtml}</tbody>
                </table>
            </body>
        </html>
    `;
}

async function generarResumenDiario({
    unidadNegocioId,
    fecha = fechaLocalISO()
}) {
    const [[unidad]] = await db.query(
        `
        SELECT nombre
        FROM unidades_negocio
        WHERE id = ?
        LIMIT 1
        `,
        [unidadNegocioId]
    );

    const incidencias = await obtenerIncidenciasDia({
        unidadNegocioId,
        fecha
    });
    const resumen = construirResumen(incidencias);

    return {
        asunto: `Resumen diario de incidencias - ${unidad?.nombre || 'Unidad'} - ${fecha}`,
        texto: [
            `Resumen diario de incidencias`,
            `Unidad: ${unidad?.nombre || 'Unidad'}`,
            `Fecha: ${fecha}`,
            '',
            `Reportes creados: ${resumen.total}`,
            `Abiertos: ${resumen.abiertas}`,
            `Resueltos/cerrados: ${resumen.resueltas}`,
            `Criticos: ${resumen.criticas}`,
            `Sin responsable: ${resumen.sinResponsable}`,
            `Promedio atencion: ${formatearMinutos(resumen.promedioAtencion)}`
        ].join('\n'),
        html: construirHtml({
            unidadNombre: unidad?.nombre || 'Unidad',
            fecha,
            incidencias,
            resumen
        })
    };
}

async function enviarResumenDiario({
    unidadNegocioId,
    destinatarios,
    fecha = fechaLocalISO()
}) {
    if (!destinatarios.length) {
        return {
            enviado: false,
            razon: 'sin_destinatarios'
        };
    }

    const resumen = await generarResumenDiario({
        unidadNegocioId,
        fecha
    });

    return enviarCorreo({
        para: destinatarios,
        asunto: resumen.asunto,
        texto: resumen.texto,
        html: resumen.html
    });
}

module.exports = {
    enviarResumenDiario,
    fechaLocalISO,
    generarResumenDiario,
    horaLocal
};
