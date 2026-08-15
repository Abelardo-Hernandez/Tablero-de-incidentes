import {
    AlertTriangle,
    ArrowLeft,
    ChevronDown,
    Clock3,
    Download,
    FileDown,
    Filter,
    History,
    MessageSquare,
    Printer,
    RotateCcw,
    Search,
    Trophy,
    X
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    obtenerAreasActivas,
    obtenerLineasActivas,
    obtenerTiposFallaActivos,
    obtenerTurnosActivos,
    obtenerUnidadesNegocio
} from '../../services/catalogos.service';

import {
    obtenerIncidenciaPorId,
    obtenerIncidencias,
    obtenerResponsablesIncidencias
} from '../../services/incidencias.service';

import useAuth from '../../hooks/useAuth';

const estadosAbiertos = [
    'nueva',
    'asignada',
    'en_proceso'
];

const estadosResueltos = [
    'resuelta',
    'cerrada'
];

const prioridades = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
};

const estados = {
    nueva: 'Nueva',
    asignada: 'Asignada',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada'
};

const tiposBase = {
    falla_equipo: 'Falla de equipo',
    falta_material: 'Falta de material',
    calidad: 'Calidad',
    seguridad: 'Seguridad',
    proceso: 'Proceso',
    otro: 'Otro'
};

const filtrosIniciales = {
    unidad_negocio_id: '',
    fecha_inicial: '',
    fecha_final: '',
    area_id: '',
    linea_id: '',
    responsable_id: '',
    estado: '',
    prioridad: '',
    turno_id: '',
    usuario_reporta_id: '',
    tipo: '',
    buscar: ''
};

function minutosEntre(inicio, fin) {
    if (!inicio || !fin) {
        return null;
    }

    const inicioMs = new Date(inicio).getTime();
    const finMs = new Date(fin).getTime();

    if (
        Number.isNaN(inicioMs) ||
        Number.isNaN(finMs)
    ) {
        return null;
    }

    return Math.max(
        0,
        Math.round((finMs - inicioMs) / 60000)
    );
}

function formatearMinutos(minutos) {
    if (minutos === null || minutos === undefined) {
        return 'Sin datos';
    }

    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return `${horas} h ${resto} min`;
}

function obtenerFinOperativo(incidencia) {
    return (
        incidencia.fecha_cierre ||
        incidencia.fecha_resolucion ||
        new Date()
    );
}

function calcularTiempoEspera(incidencia) {
    return minutosEntre(
        incidencia.fecha_creacion,
        incidencia.fecha_inicio_atencion ||
            obtenerFinOperativo(incidencia)
    );
}

function calcularTiempoAtencion(incidencia) {
    if (!incidencia.fecha_inicio_atencion) {
        return 0;
    }

    return minutosEntre(
        incidencia.fecha_inicio_atencion,
        obtenerFinOperativo(incidencia)
    );
}

function calcularTiempoTotal(incidencia) {
    return minutosEntre(
        incidencia.fecha_creacion,
        obtenerFinOperativo(incidencia)
    );
}

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Sin fecha';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium'
    }).format(valor);
}

function formatearHora(fecha) {
    if (!fecha) {
        return '--:--';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return '--:--';
    }

    return new Intl.DateTimeFormat('es-MX', {
        timeStyle: 'short'
    }).format(valor);
}

function obtenerFechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
}

function agruparPor(lista, obtenerClave) {
    const mapa = new Map();

    lista.forEach((item) => {
        const clave = obtenerClave(item) || 'Sin dato';

        mapa.set(
            clave,
            (mapa.get(clave) || 0) + 1
        );
    });

    return Array.from(mapa.entries())
        .map(([nombre, cantidad]) => ({
            nombre,
            cantidad
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function mismoId(valor, filtro) {
    if (!filtro) {
        return true;
    }

    if (valor === null || valor === undefined || valor === '') {
        return false;
    }

    return Number(valor) === Number(filtro);
}

function ReportesPage() {
    const {
        usuario
    } = useAuth();

    const esAdministrador =
        ['administrador', 'super_admin'].includes(usuario?.rol);
    const esSuperAdmin = usuario?.rol === 'super_admin';

    const [incidencias, setIncidencias] = useState([]);
    const [areas, setAreas] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [tiposFalla, setTiposFalla] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [orden, setOrden] = useState({
        campo: 'fecha_creacion',
        direccion: 'desc'
    });
    const [busquedaAvanzada, setBusquedaAvanzada] =
        useState(false);
    const [detalleSeleccionado, setDetalleSeleccionado] =
        useState(null);
    const [cargandoDetalle, setCargandoDetalle] =
        useState(false);
    const [errorDetalle, setErrorDetalle] = useState('');

    const [filtros, setFiltros] = useState(() => ({
        ...filtrosIniciales,
        unidad_negocio_id:
            usuario?.rol === 'super_admin'
                ? usuario?.unidad_negocio_id || ''
                : ''
    }));

    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const [
                respuestaIncidencias,
                respuestaAreas,
                respuestaLineas,
                respuestaTurnos,
                respuestaTiposFalla,
                respuestaUsuarios,
                respuestaUnidades
            ] = await Promise.allSettled([
                obtenerIncidencias(
                    esSuperAdmin && filtros.unidad_negocio_id
                        ? { unidad_negocio_id: filtros.unidad_negocio_id }
                        : {}
                ),
                obtenerAreasActivas(),
                obtenerLineasActivas(),
                obtenerTurnosActivos(),
                obtenerTiposFallaActivos(),
                obtenerResponsablesIncidencias(),
                esSuperAdmin
                    ? obtenerUnidadesNegocio({ activo: true })
                    : Promise.resolve({ data: [] })
            ]);

            if (
                respuestaIncidencias.status === 'fulfilled'
            ) {
                setIncidencias(
                    respuestaIncidencias.value.data || []
                );
            }

            if (respuestaAreas.status === 'fulfilled') {
                setAreas(respuestaAreas.value.data || []);
            }

            if (respuestaLineas.status === 'fulfilled') {
                setLineas(respuestaLineas.value.data || []);
            }

            if (respuestaTurnos.status === 'fulfilled') {
                setTurnos(respuestaTurnos.value.data || []);
            }

            if (respuestaTiposFalla.status === 'fulfilled') {
                setTiposFalla(
                    respuestaTiposFalla.value.data || []
                );
            }

            if (respuestaUsuarios.status === 'fulfilled') {
                setUsuarios(
                    respuestaUsuarios.value.data || []
                );
            }

            if (respuestaUnidades.status === 'fulfilled') {
                setUnidades(respuestaUnidades.value.data || []);
            }
        } catch (errorSolicitud) {
            console.error(
                'Error al cargar reportes:',
                errorSolicitud
            );

            setError(
                'No fue posible cargar la información de reportes.'
            );
        } finally {
            setCargando(false);
        }
    }, [esSuperAdmin, filtros.unidad_negocio_id]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const tipos = useMemo(
        () => ({
            ...tiposBase,
            ...Object.fromEntries(
                tiposFalla.map((tipo) => [
                    tipo.clave,
                    tipo.nombre
                ])
            )
        }),
        [tiposFalla]
    );

    const unidadSeleccionada = filtros.unidad_negocio_id;
    const filtrarPorUnidad = useCallback(
        (lista) => !unidadSeleccionada
            ? lista
            : lista.filter((item) =>
                Number(item.unidad_negocio_id) ===
                    Number(unidadSeleccionada)
            ),
        [unidadSeleccionada]
    );
    const areasDisponibles = filtrarPorUnidad(areas);
    const lineasDisponibles = filtrarPorUnidad(lineas);
    const turnosDisponibles = filtrarPorUnidad(turnos);
    const usuariosDisponibles = filtrarPorUnidad(usuarios);
    const tiposDisponibles = useMemo(
        () => ({
            ...Object.fromEntries(
                filtrarPorUnidad(tiposFalla).map((tipo) => [
                    tipo.clave,
                    tipo.nombre
                ])
            )
        }),
        [filtrarPorUnidad, tiposFalla]
    );

    function manejarFiltro(evento) {
        const {
            name,
            value
        } = evento.target;

        setFiltros((actual) => ({
            ...actual,
            [name]: value,
            ...(name === 'unidad_negocio_id'
                ? {
                    area_id: '',
                    linea_id: '',
                    responsable_id: '',
                    turno_id: '',
                    usuario_reporta_id: '',
                    tipo: ''
                }
                : {})
        }));
    }

    function limpiarFiltros() {
        setFiltros({
            ...filtrosIniciales,
            unidad_negocio_id:
                esSuperAdmin
                    ? usuario?.unidad_negocio_id || ''
                    : ''
        });
        setOrden({
            campo: 'fecha_creacion',
            direccion: 'desc'
        });
        cerrarDetalle();
    }

    const incidenciasFiltradas = useMemo(() => {
        const texto = filtros.buscar
            .trim()
            .toLowerCase();

        return incidencias.filter((incidencia) => {
            const fecha = incidencia.fecha_creacion
                ? new Date(incidencia.fecha_creacion)
                : null;

            if (
                filtros.fecha_inicial &&
                fecha &&
                fecha <
                    new Date(`${filtros.fecha_inicial}T00:00:00`)
            ) {
                return false;
            }

            if (
                filtros.fecha_final &&
                fecha &&
                fecha >
                    new Date(`${filtros.fecha_final}T23:59:59`)
            ) {
                return false;
            }

            if (
                filtros.area_id &&
                !mismoId(
                    incidencia.area_responsable_id ||
                        incidencia.area_destino_id,
                    filtros.area_id
                )
            ) {
                return false;
            }

            if (
                filtros.linea_id &&
                !mismoId(incidencia.linea_id, filtros.linea_id)
            ) {
                return false;
            }

            if (
                filtros.responsable_id &&
                !mismoId(
                    incidencia.usuario_asignado_id ||
                        incidencia.responsable_usuario_id,
                    filtros.responsable_id
                )
            ) {
                return false;
            }

            if (
                esAdministrador &&
                filtros.usuario_reporta_id &&
                !mismoId(
                    incidencia.usuario_creador_id,
                    filtros.usuario_reporta_id
                )
            ) {
                return false;
            }

            if (
                filtros.estado &&
                incidencia.estado !== filtros.estado
            ) {
                return false;
            }

            if (
                filtros.prioridad &&
                incidencia.prioridad !== filtros.prioridad
            ) {
                return false;
            }

            if (
                filtros.turno_id &&
                !mismoId(incidencia.turno_id, filtros.turno_id)
            ) {
                return false;
            }

            if (
                filtros.tipo &&
                incidencia.tipo !== filtros.tipo
            ) {
                return false;
            }

            if (!texto) {
                return true;
            }

            return [
                incidencia.folio,
                incidencia.titulo,
                incidencia.descripcion,
                incidencia.linea_nombre,
                incidencia.area_nombre,
                incidencia.responsable_nombre,
                incidencia.reporta_nombre
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(texto);
            });
    }, [incidencias, filtros, esAdministrador]);

    const incidenciasUltimas48Horas = useMemo(() => {
        const limite = Date.now() - (48 * 60 * 60 * 1000);

        return incidencias.filter((incidencia) => {
            if (!incidencia.fecha_creacion) {
                return false;
            }

            const fecha = new Date(
                incidencia.fecha_creacion
            ).getTime();

            return !Number.isNaN(fecha) && fecha >= limite;
        });
    }, [incidencias]);

    const incidenciasBase = busquedaAvanzada
        ? incidenciasFiltradas
        : incidenciasUltimas48Horas;

    const incidenciasOrdenadas = useMemo(() => {
        const multiplicador =
            orden.direccion === 'asc' ? 1 : -1;

        return [...incidenciasBase].sort((a, b) => {
            const obtenerValor = (incidencia) => {
                if (orden.campo === 'tiempo_total') {
                    return calcularTiempoTotal(incidencia) || 0;
                }

                if (orden.campo === 'tiempo_espera') {
                    return calcularTiempoEspera(incidencia) || 0;
                }

                if (orden.campo === 'tiempo_atencion') {
                    return calcularTiempoAtencion(incidencia) || 0;
                }

                if (orden.campo === 'prioridad') {
                    return [
                        'baja',
                        'media',
                        'alta',
                        'critica'
                    ].indexOf(incidencia.prioridad);
                }

                return incidencia[orden.campo] || '';
            };

            const valorA = obtenerValor(a);
            const valorB = obtenerValor(b);

            if (
                orden.campo.includes('fecha') ||
                [
                    'tiempo_total',
                    'tiempo_espera',
                    'tiempo_atencion'
                ].includes(orden.campo)
            ) {
                return (
                    (new Date(valorA).getTime?.() || valorA) -
                    (new Date(valorB).getTime?.() || valorB)
                ) * multiplicador;
            }

            return String(valorA).localeCompare(
                String(valorB),
                'es',
                {
                    numeric: true
                }
            ) * multiplicador;
        });
    }, [incidenciasBase, orden]);

    const kpis = useMemo(() => {
        const tiempos = incidenciasBase
            .map((incidencia) =>
                minutosEntre(
                    incidencia.fecha_inicio_atencion ||
                        incidencia.fecha_asignacion ||
                        incidencia.fecha_creacion,
                    incidencia.fecha_resolucion ||
                        incidencia.fecha_cierre
                )
            )
            .filter((valor) => valor !== null);

        const total = incidenciasBase.length;
        const resueltas = incidenciasBase.filter(
            (incidencia) =>
                estadosResueltos.includes(incidencia.estado)
        ).length;

        const promedio = tiempos.length
            ? Math.round(
                tiempos.reduce(
                    (suma, valor) => suma + valor,
                    0
                ) / tiempos.length
            )
            : null;

        return {
            total,
            abiertas: incidenciasBase.filter(
                (incidencia) =>
                    estadosAbiertos.includes(incidencia.estado)
            ).length,
            resueltas,
            promedio,
            maximo: tiempos.length
                ? Math.max(...tiempos)
                : null,
            minimo: tiempos.length
                ? Math.min(...tiempos)
                : null,
            porcentajeAtendidas: total
                ? Math.round((resueltas / total) * 100)
                : 0,
            criticas: incidenciasBase.filter(
                (incidencia) =>
                    incidencia.prioridad === 'critica'
            ).length
        };
    }, [incidenciasBase]);

    const graficas = useMemo(
        () => ({
            lineas: agruparPor(
                incidenciasBase,
                (incidencia) => incidencia.linea_nombre
            ).slice(0, 6),
            areas: agruparPor(
                incidenciasBase,
                (incidencia) => incidencia.area_nombre
            ).slice(0, 6),
            prioridad: agruparPor(
                incidenciasBase,
                (incidencia) =>
                    prioridades[incidencia.prioridad]
            ),
            estado: agruparPor(
                incidenciasBase,
                (incidencia) => estados[incidencia.estado]
            ),
            responsables: agruparPor(
                incidenciasBase.filter(
                    (incidencia) =>
                        incidencia.responsable_nombre
                ),
                (incidencia) =>
                    incidencia.responsable_nombre
            ).slice(0, 5)
        }),
        [incidenciasBase]
    );

    async function abrirDetalle(incidencia) {
        try {
            setCargandoDetalle(true);
            setErrorDetalle('');
            setDetalleSeleccionado(incidencia);

            const respuesta = await obtenerIncidenciaPorId(
                incidencia.id
            );

            setDetalleSeleccionado(respuesta.data);
        } catch (errorSolicitud) {
            console.error(
                'Error al cargar detalle historico:',
                errorSolicitud
            );

            setErrorDetalle(
                errorSolicitud.response?.data?.message ||
                    'No fue posible cargar el detalle de la incidencia.'
            );
        } finally {
            setCargandoDetalle(false);
        }
    }

    function cerrarDetalle() {
        setDetalleSeleccionado(null);
        setErrorDetalle('');
    }

    function cambiarOrden(campo) {
        setOrden((actual) => ({
            campo,
            direccion:
                actual.campo === campo &&
                actual.direccion === 'asc'
                    ? 'desc'
                    : 'asc'
        }));
    }

    function obtenerNombreCatalogo(lista, id) {
        return lista.find(
            (item) => Number(item.id) === Number(id)
        )?.nombre;
    }

    function obtenerFiltrosAplicados() {
        const filtrosAplicados = [
            esSuperAdmin && filtros.unidad_negocio_id && [
                'Unidad de negocio',
                obtenerNombreCatalogo(
                    unidades,
                    filtros.unidad_negocio_id
                )
            ],
            filtros.fecha_inicial && [
                'Fecha inicial',
                filtros.fecha_inicial
            ],
            filtros.fecha_final && [
                'Fecha final',
                filtros.fecha_final
            ],
            filtros.area_id && [
                'Area que atiende',
                obtenerNombreCatalogo(areas, filtros.area_id)
            ],
            filtros.linea_id && [
                'Linea',
                obtenerNombreCatalogo(lineas, filtros.linea_id)
            ],
            filtros.responsable_id && [
                'Responsable',
                obtenerNombreCatalogo(usuarios, filtros.responsable_id)
            ],
            filtros.estado && [
                'Estado',
                estados[filtros.estado]
            ],
            filtros.prioridad && [
                'Prioridad',
                prioridades[filtros.prioridad]
            ],
            filtros.turno_id && [
                'Turno',
                obtenerNombreCatalogo(turnos, filtros.turno_id)
            ],
            esAdministrador &&
                filtros.usuario_reporta_id && [
                    'Usuario que reporto',
                    obtenerNombreCatalogo(
                        usuarios,
                        filtros.usuario_reporta_id
                    )
                ],
            filtros.tipo && [
                'Tipo',
                tipos[filtros.tipo]
            ],
            filtros.buscar.trim() && [
                'Busqueda',
                filtros.buscar.trim()
            ]
        ].filter(Boolean);

        if (filtrosAplicados.length === 0) {
            return [
                [
                    'Filtros',
                    'Sin filtros, se exporta todo'
                ]
            ];
        }

        return filtrosAplicados;
    }

    function obtenerDatosExportacion() {
        const encabezados = [
            'Folio',
            'Fecha',
            'Hora',
            'Linea',
            'Area que atiende',
            'Responsable',
            'Prioridad',
            'Estado',
            'Tiempo de espera',
            'Tiempo atencion',
            'Tiempo total',
            'Usuario reporta',
            'Descripcion'
        ];

        const filas = incidenciasOrdenadas.map(
            (incidencia) => [
                incidencia.folio,
                formatearFecha(incidencia.fecha_creacion),
                formatearHora(incidencia.fecha_creacion),
                incidencia.linea_nombre || '',
                incidencia.area_nombre || '',
                incidencia.responsable_nombre || '',
                prioridades[incidencia.prioridad] ||
                    incidencia.prioridad,
                estados[incidencia.estado] ||
                    incidencia.estado,
                formatearMinutos(
                    calcularTiempoEspera(incidencia)
                ),
                formatearMinutos(
                    calcularTiempoAtencion(incidencia)
                ),
                formatearMinutos(
                    calcularTiempoTotal(incidencia)
                ),
                incidencia.reporta_nombre || '',
                incidencia.descripcion || ''
            ]
        );

        return {
            encabezados,
            filas,
            filtrosAplicados: obtenerFiltrosAplicados()
        };
    }

    function exportarExcel() {
        const {
            encabezados,
            filas,
            filtrosAplicados
        } = obtenerDatosExportacion();

        const contenido = [
            ['Historico de incidencias'],
            ['Generado', new Date().toLocaleString('es-MX')],
            ['Resultados', filas.length],
            [],
            ['Filtros aplicados'],
            ...filtrosAplicados,
            [],
            encabezados,
            ...filas
        ]
            .map((fila) =>
                fila
                    .map((valor) =>
                        `"${String(valor ?? '').replaceAll('"', '""')}"`
                    )
                    .join(',')
            )
            .join('\n');

        const blob = new Blob(
            [
                '\ufeff',
                contenido
            ],
            {
                type: 'text/csv;charset=utf-8;'
            }
        );

        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.download = `historico-incidencias-${new Date().toISOString().slice(0, 10)}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
    }

    function exportarPdf() {
        const {
            encabezados,
            filas,
            filtrosAplicados
        } = obtenerDatosExportacion();

        const ventana = window.open('', '_blank');

        if (!ventana) {
            window.alert(
                'No fue posible abrir la ventana de impresion. Revisa el bloqueo de ventanas emergentes.'
            );
            return;
        }

        const filtrosHtml = filtrosAplicados
            .map(
                ([etiqueta, valor]) => `
                    <div>
                        <strong>${escaparHtml(etiqueta)}:</strong>
                        ${escaparHtml(valor || 'Sin dato')}
                    </div>
                `
            )
            .join('');

        const encabezadosHtml = encabezados
            .map(
                (encabezado) =>
                    `<th>${escaparHtml(encabezado)}</th>`
            )
            .join('');

        const filasHtml = filas.length
            ? filas
                .map(
                    (fila) => `
                        <tr>
                            ${fila
                                .map(
                                    (valor) =>
                                        `<td>${escaparHtml(valor)}</td>`
                                )
                                .join('')}
                        </tr>
                    `
                )
                .join('')
            : `<tr><td colspan="${encabezados.length}">Sin resultados.</td></tr>`;

        ventana.document.write(`
            <!doctype html>
            <html lang="es">
                <head>
                    <meta charset="utf-8" />
                    <title>Historico de incidencias</title>
                    <style>
                        body {
                            color: #0f172a;
                            font-family: Arial, sans-serif;
                            margin: 24px;
                        }

                        h1 {
                            font-size: 22px;
                            margin: 0 0 6px;
                        }

                        .meta {
                            color: #475569;
                            font-size: 12px;
                            margin-bottom: 18px;
                        }

                        .filters {
                            border: 1px solid #e2e8f0;
                            display: grid;
                            font-size: 12px;
                            gap: 6px 18px;
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                            margin-bottom: 18px;
                            padding: 12px;
                        }

                        table {
                            border-collapse: collapse;
                            font-size: 11px;
                            width: 100%;
                        }

                        th,
                        td {
                            border: 1px solid #e2e8f0;
                            padding: 6px;
                            text-align: left;
                            vertical-align: top;
                        }

                        th {
                            background: #f8fafc;
                            font-weight: 700;
                        }

                        @page {
                            margin: 14mm;
                            size: landscape;
                        }
                    </style>
                </head>
                <body>
                    <h1>Historico de incidencias</h1>
                    <div class="meta">
                        Generado: ${escaparHtml(new Date().toLocaleString('es-MX'))}
                        · Resultados: ${filas.length}
                    </div>
                    <section class="filters">
                        ${filtrosHtml}
                    </section>
                    <table>
                        <thead>
                            <tr>${encabezadosHtml}</tr>
                        </thead>
                        <tbody>${filasHtml}</tbody>
                    </table>
                </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
    }

    function exportarResumenDia() {
        const hoy = obtenerFechaLocalISO();
        const esLiderArea =
            Boolean(usuario?.es_lider) && !esAdministrador;

        const incidenciasDia = incidencias.filter((incidencia) => {
            if (!String(incidencia.fecha_creacion || '').startsWith(hoy)) {
                return false;
            }

            if (!esLiderArea) {
                return true;
            }

            return Number(incidencia.area_responsable_id) ===
                Number(usuario?.area_id);
        });

        const tiemposAtencion = incidenciasDia
            .map((incidencia) =>
                minutosEntre(
                    incidencia.fecha_inicio_atencion ||
                        incidencia.fecha_asignacion,
                    incidencia.fecha_resolucion ||
                        incidencia.fecha_cierre
                )
            )
            .filter((valor) => valor !== null);

        const promedioAtencion = tiemposAtencion.length
            ? Math.round(
                tiemposAtencion.reduce(
                    (total, valor) => total + valor,
                    0
                ) / tiemposAtencion.length
            )
            : null;

        const resumen = {
            total: incidenciasDia.length,
            abiertas: incidenciasDia.filter((incidencia) =>
                estadosAbiertos.includes(incidencia.estado)
            ).length,
            resueltas: incidenciasDia.filter((incidencia) =>
                estadosResueltos.includes(incidencia.estado)
            ).length,
            cerradas: incidenciasDia.filter(
                (incidencia) => incidencia.estado === 'cerrada'
            ).length,
            canceladas: incidenciasDia.filter(
                (incidencia) => incidencia.estado === 'cancelada'
            ).length,
            criticas: incidenciasDia.filter(
                (incidencia) => incidencia.prioridad === 'critica'
            ).length,
            sinResponsable: incidenciasDia.filter(
                (incidencia) => !incidencia.responsable_nombre
            ).length,
            promedioAtencion
        };

        const tablasResumen = [
            [
                'Por area que atiende',
                agruparPor(
                    incidenciasDia,
                    (incidencia) => incidencia.area_nombre
                )
            ],
            [
                'Por linea',
                agruparPor(
                    incidenciasDia,
                    (incidencia) => incidencia.linea_nombre
                )
            ],
            [
                'Por prioridad',
                agruparPor(
                    incidenciasDia,
                    (incidencia) =>
                        prioridades[incidencia.prioridad]
                )
            ],
            [
                'Por estado',
                agruparPor(
                    incidenciasDia,
                    (incidencia) => estados[incidencia.estado]
                )
            ],
            [
                'Responsables',
                agruparPor(
                    incidenciasDia.filter(
                        (incidencia) =>
                            incidencia.responsable_nombre
                    ),
                    (incidencia) =>
                        incidencia.responsable_nombre
                )
            ],
            [
                'Tipos de falla',
                agruparPor(
                    incidenciasDia,
                    (incidencia) =>
                        tipos[incidencia.tipo] ||
                        incidencia.tipo_nombre ||
                        incidencia.tipo
                )
            ]
        ];

        const ventana = window.open('', '_blank');

        if (!ventana) {
            window.alert(
                'No fue posible abrir la ventana de impresion. Revisa el bloqueo de ventanas emergentes.'
            );
            return;
        }

        const alcance = esLiderArea
            ? `Area: ${usuario?.area_nombre || 'Sin area'}`
            : esSuperAdmin && filtros.unidad_negocio_id
                ? `Unidad: ${obtenerNombreCatalogo(
                    unidades,
                    filtros.unidad_negocio_id
                ) || 'Seleccionada'}`
                : esSuperAdmin
                    ? 'Todas las unidades'
                    : `Unidad: ${usuario?.unidad_negocio_nombre || 'Actual'}`;

        const kpisHtml = [
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
        ]
            .map(
                ([etiqueta, valor]) => `
                    <article class="kpi">
                        <span>${escaparHtml(etiqueta)}</span>
                        <strong>${escaparHtml(valor)}</strong>
                    </article>
                `
            )
            .join('');

        const rankingsHtml = tablasResumen
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

        const filasHtml = incidenciasDia.length
            ? incidenciasDia
                .map((incidencia) => `
                    <tr>
                        <td>${escaparHtml(incidencia.folio)}</td>
                        <td>${escaparHtml(formatearHora(incidencia.fecha_creacion))}</td>
                        <td>${escaparHtml(incidencia.titulo)}</td>
                        <td>${escaparHtml(incidencia.linea_nombre || 'Sin linea')}</td>
                        <td>${escaparHtml(incidencia.area_nombre || 'Sin area')}</td>
                        <td>${escaparHtml(incidencia.responsable_nombre || 'Sin responsable')}</td>
                        <td>${escaparHtml(prioridades[incidencia.prioridad] || incidencia.prioridad)}</td>
                        <td>${escaparHtml(estados[incidencia.estado] || incidencia.estado)}</td>
                        <td>${escaparHtml(formatearMinutos(calcularTiempoEspera(incidencia)))}</td>
                        <td>${escaparHtml(formatearMinutos(calcularTiempoTotal(incidencia)))}</td>
                    </tr>
                `)
                .join('')
            : '<tr><td colspan="10">Sin reportes creados hoy.</td></tr>';

        ventana.document.write(`
            <!doctype html>
            <html lang="es">
                <head>
                    <meta charset="utf-8" />
                    <title>Resumen diario de incidencias</title>
                    <style>
                        body {
                            color: #0f172a;
                            font-family: Arial, sans-serif;
                            margin: 24px;
                        }

                        h1 {
                            font-size: 24px;
                            margin: 0 0 6px;
                        }

                        h2 {
                            font-size: 14px;
                            margin: 0 0 10px;
                        }

                        .meta {
                            color: #475569;
                            font-size: 12px;
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
                            padding: 10px;
                        }

                        .kpi span,
                        .empty {
                            color: #64748b;
                            display: block;
                            font-size: 11px;
                        }

                        .kpi strong {
                            display: block;
                            font-size: 20px;
                            margin-top: 5px;
                        }

                        .ranking-row {
                            align-items: center;
                            border-top: 1px solid #f1f5f9;
                            display: flex;
                            font-size: 11px;
                            justify-content: space-between;
                            padding: 6px 0;
                        }

                        table {
                            border-collapse: collapse;
                            font-size: 10.5px;
                            width: 100%;
                        }

                        th,
                        td {
                            border: 1px solid #e2e8f0;
                            padding: 6px;
                            text-align: left;
                            vertical-align: top;
                        }

                        th {
                            background: #f8fafc;
                            font-weight: 700;
                        }

                        @page {
                            margin: 14mm;
                            size: landscape;
                        }
                    </style>
                </head>
                <body>
                    <h1>Resumen diario de incidencias</h1>
                    <div class="meta">
                        Fecha: ${escaparHtml(formatearFecha(`${hoy}T00:00:00`))}
                        &middot; Generado: ${escaparHtml(new Date().toLocaleString('es-MX'))}
                        &middot; ${escaparHtml(alcance)}
                    </div>

                    <section class="kpis">
                        ${kpisHtml}
                    </section>

                    <section class="rankings">
                        ${rankingsHtml}
                    </section>

                    <table>
                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Hora</th>
                                <th>Titulo</th>
                                <th>Linea</th>
                                <th>Area que atiende</th>
                                <th>Responsable</th>
                                <th>Prioridad</th>
                                <th>Estado</th>
                                <th>Tiempo de espera</th>
                                <th>Tiempo total</th>
                            </tr>
                        </thead>
                        <tbody>${filasHtml}</tbody>
                    </table>
                </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
    }

    if (busquedaAvanzada) {
        return (
            <div className="mx-auto max-w-[1800px] space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    setBusquedaAvanzada(false);
                                    cerrarDetalle();
                                }}
                                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-600"
                            >
                                <ArrowLeft size={17} />
                                Volver al histórico
                            </button>

                            <h2 className="mt-3 text-2xl font-bold text-slate-950">
                                Búsqueda avanzada
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Consulta incidencias por filtros y abre el detalle completo con timeline y comentarios.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={exportarResumenDia}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 font-bold text-blue-700 transition hover:bg-blue-50"
                            >
                                <FileDown size={18} />
                                Resumen de hoy
                            </button>

                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            >
                                <RotateCcw size={18} />
                                Limpiar filtros
                            </button>

                            <button
                                type="button"
                                onClick={exportarExcel}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 font-bold text-emerald-700 transition hover:bg-emerald-50"
                            >
                                <Download size={18} />
                                Exportar Excel
                            </button>

                            <button
                                type="button"
                                onClick={exportarPdf}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800"
                            >
                                <Printer size={18} />
                                Exportar PDF
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {esSuperAdmin && (
                            <Select
                                name="unidad_negocio_id"
                                value={filtros.unidad_negocio_id}
                                onChange={manejarFiltro}
                                placeholder="Todas las unidades"
                                opciones={unidades}
                            />
                        )}

                        <input
                            type="date"
                            name="fecha_inicial"
                            value={filtros.fecha_inicial}
                            onChange={manejarFiltro}
                            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />

                        <input
                            type="date"
                            name="fecha_final"
                            value={filtros.fecha_final}
                            onChange={manejarFiltro}
                            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />

                        <Select
                            name="area_id"
                            value={filtros.area_id}
                            onChange={manejarFiltro}
                            placeholder="Área que atiende"
                            opciones={areasDisponibles}
                        />

                        <Select
                            name="linea_id"
                            value={filtros.linea_id}
                            onChange={manejarFiltro}
                            placeholder="Línea"
                            opciones={lineasDisponibles}
                        />

                        <Select
                            name="responsable_id"
                            value={filtros.responsable_id}
                            onChange={manejarFiltro}
                            placeholder="Responsable"
                            opciones={usuariosDisponibles}
                        />

                        <SelectSimple
                            name="estado"
                            value={filtros.estado}
                            onChange={manejarFiltro}
                            placeholder="Estado"
                            opciones={estados}
                        />

                        <SelectSimple
                            name="prioridad"
                            value={filtros.prioridad}
                            onChange={manejarFiltro}
                            placeholder="Prioridad"
                            opciones={prioridades}
                        />

                        <Select
                            name="turno_id"
                            value={filtros.turno_id}
                            onChange={manejarFiltro}
                            placeholder="Turno"
                            opciones={turnosDisponibles}
                        />

                        {esAdministrador && (
                            <Select
                                name="usuario_reporta_id"
                                value={filtros.usuario_reporta_id}
                                onChange={manejarFiltro}
                                placeholder="Usuario que reportó"
                                opciones={usuariosDisponibles}
                            />
                        )}

                        <SelectSimple
                            name="tipo"
                            value={filtros.tipo}
                            onChange={manejarFiltro}
                            placeholder="Tipo"
                            opciones={tiposDisponibles}
                        />

                        <div className="relative md:col-span-2 xl:col-span-5">
                            <Search
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                name="buscar"
                                value={filtros.buscar}
                                onChange={manejarFiltro}
                                placeholder="Buscar por folio, título, descripción, área, línea o responsable..."
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>
                    </div>
                </section>

                {error && (
                    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </section>
                )}

                <ListaBusqueda
                    incidencias={incidenciasOrdenadas}
                    cargando={cargando}
                    onSeleccionar={abrirDetalle}
                />

                <DetalleHistoricoPanel
                    incidencia={detalleSeleccionado}
                    cargando={cargandoDetalle}
                    error={errorDetalle}
                    onCerrar={cerrarDetalle}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1800px] space-y-6">

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
                <Kpi titulo="Registradas" valor={kpis.total} icono={FileDown} />
                <Kpi titulo="Abiertas" valor={kpis.abiertas} icono={AlertTriangle} tono="amber" />
                <Kpi titulo="Resueltas" valor={kpis.resueltas} icono={Trophy} tono="emerald" />
                <Kpi titulo="Tiempo promedio" valor={formatearMinutos(kpis.promedio)} icono={Clock3} tono="blue" />
                <Kpi titulo="Tiempo máximo" valor={formatearMinutos(kpis.maximo)} icono={Clock3} tono="red" />
                <Kpi titulo="Tiempo mínimo" valor={formatearMinutos(kpis.minimo)} icono={Clock3} />
                <Kpi titulo="% atendidas" valor={`${kpis.porcentajeAtendidas}%`} icono={Trophy} tono="emerald" />
                <Kpi titulo="Críticas" valor={kpis.criticas} icono={AlertTriangle} tono="red" />
            </section>

            <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                <GraficaBarras titulo="Incidencias por línea" datos={graficas.lineas} />
                <GraficaBarras titulo="Incidencias por área que atiende" datos={graficas.areas} />
                <GraficaDistribucion titulo="Prioridad" datos={graficas.prioridad} />
                <GraficaDistribucion titulo="Estado" datos={graficas.estado} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                <Ranking
                    titulo="Top responsables"
                    datos={graficas.responsables}
                />

                <Tabla
                    incidencias={incidenciasOrdenadas}
                    cargando={cargando}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch">
                <button
                    type="button"
                    onClick={exportarResumenDia}
                    className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 lg:w-auto lg:self-center"
                >
                    <FileDown size={18} />
                    Resumen de hoy
                </button>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                            <Filter size={18} />
                            Búsqueda avanzada
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                            Consulta por fechas, áreas, responsables, estado, prioridad o texto libre.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setBusquedaAvanzada(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800"
                    >
                        Abrir búsqueda
                        <ChevronDown
                            size={18}
                            className="-rotate-90"
                        />
                    </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Select({
    name,
    value,
    onChange,
    placeholder,
    opciones
}) {
    return (
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
        >
            <option value="">{placeholder}</option>
            {opciones.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                </option>
            ))}
        </select>
    );
}

function SelectSimple({
    name,
    value,
    onChange,
    placeholder,
    opciones
}) {
    return (
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
        >
            <option value="">{placeholder}</option>
            {Object.entries(opciones).map(([clave, etiqueta]) => (
                <option key={clave} value={clave}>
                    {etiqueta}
                </option>
            ))}
        </select>
    );
}

function Kpi({
    titulo,
    valor,
    icono: Icono,
    tono = 'slate'
}) {
    const tonos = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-blue-50 text-blue-700',
        red: 'bg-red-50 text-red-700'
    };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tonos[tono]}`}>
                    <Icono size={18} />
                </div>

                <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase text-slate-400">
                        {titulo}
                    </p>

                    <p className="mt-1 truncate text-2xl font-bold text-slate-950">
                        {valor}
                    </p>
                </div>
            </div>
        </article>
    );
}

function GraficaBarras({
    titulo,
    datos
}) {
    const maximo = datos[0]?.cantidad || 1;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-950">{titulo}</h3>
            <div className="mt-4 space-y-3">
                {datos.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin datos.</p>
                ) : datos.map((item) => (
                    <div key={item.nombre}>
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="truncate font-semibold text-slate-700">
                                {item.nombre}
                            </span>
                            <span className="font-bold text-slate-950">
                                {item.cantidad}
                            </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{
                                    width: `${Math.max(8, (item.cantidad / maximo) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}

function GraficaDistribucion({
    titulo,
    datos
}) {
    const total = datos.reduce(
        (suma, item) => suma + item.cantidad,
        0
    );

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-950">{titulo}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-[112px_1fr] sm:items-center">
                <div
                    className="mx-auto grid h-28 w-28 place-items-center rounded-full"
                    style={{
                        background:
                            'conic-gradient(#059669 0 35%, #f59e0b 35% 62%, #ef4444 62% 80%, #3b82f6 80% 100%)'
                    }}
                >
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                        <span className="text-xl font-bold text-slate-950">
                            {total}
                        </span>
                    </div>
                </div>
                <div className="space-y-2.5">
                    {datos.length === 0 ? (
                        <p className="text-sm text-slate-500">Sin datos.</p>
                    ) : datos.map((item) => (
                        <div
                            key={item.nombre}
                            className="flex items-center justify-between gap-4 text-sm"
                        >
                            <span className="truncate font-semibold text-slate-700">
                                {item.nombre}
                            </span>
                            <span className="font-bold text-slate-950">
                                {item.cantidad}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </article>
    );
}

function Ranking({
    titulo,
    datos
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-950">{titulo}</h3>
            <div className="mt-4 space-y-2">
                {datos.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin datos.</p>
                ) : datos.map((item, indice) => (
                    <div
                        key={item.nombre}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-bold text-slate-600">
                                {indice + 1}
                            </span>
                            <span className="truncate font-semibold text-slate-800">
                                {item.nombre}
                            </span>
                        </div>
                        <span className="font-bold text-slate-950">
                            {item.cantidad}
                        </span>
                    </div>
                ))}
            </div>
        </article>
    );
}

function Tabla({
    incidencias,
    cargando,
    orden,
    cambiarOrden
}) {
    const encabezados = [
        ['folio', 'Folio'],
        ['fecha_creacion', 'Fecha'],
        ['linea_nombre', 'Línea'],
        ['area_nombre', 'Área que atiende'],
        ['reporta_nombre', 'Reportó'],
        ['responsable_nombre', 'Responsable'],
        ['prioridad', 'Prioridad'],
        ['estado', 'Estado'],
        ['tiempo_espera', 'Tiempo Espera'],
        ['tiempo_atencion', 'Tiempo Atención'],
        ['tiempo_total', 'Tiempo Total']
    ];

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                    Tabla de resultados
                </h3>
                <p className="text-sm text-slate-500">
                    {incidencias.length} resultado(s)
                </p>
            </div>

            <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            {encabezados.map(([campo, etiqueta]) => (
                                <th key={campo} className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => cambiarOrden(campo)}
                                        className="font-bold"
                                    >
                                        {etiqueta}
                                        {orden.campo === campo
                                            ? orden.direccion === 'asc'
                                                ? ' ↑'
                                                : ' ↓'
                                            : ''}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cargando ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                                    Cargando reportes...
                                </td>
                            </tr>
                        ) : incidencias.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                                    No hay incidencias con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : incidencias.map((incidencia) => (
                            <tr key={incidencia.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-emerald-700">
                                    {incidencia.folio}
                                </td>
                                <td className="px-4 py-3">
                                    {formatearFecha(incidencia.fecha_creacion)}
                                </td>
                                <td className="px-4 py-3">
                                    {incidencia.linea_nombre || 'Sin línea'}
                                </td>
                                <td className="px-4 py-3">
                                    {incidencia.area_nombre || 'Sin área'}
                                </td>
                                <td className="px-4 py-3">
                                    {incidencia.reporta_nombre || 'Sin usuario'}
                                </td>
                                <td className="px-4 py-3">
                                    {incidencia.responsable_nombre || 'Sin responsable'}
                                </td>
                                <td className="px-4 py-3">
                                    {prioridades[incidencia.prioridad] || incidencia.prioridad}
                                </td>
                                <td className="px-4 py-3">
                                    {estados[incidencia.estado] || incidencia.estado}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                    {formatearMinutos(
                                        calcularTiempoEspera(incidencia)
                                    )}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                    {formatearMinutos(
                                        calcularTiempoAtencion(incidencia)
                                    )}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                    {formatearMinutos(
                                        calcularTiempoTotal(incidencia)
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

function ListaBusqueda({
    incidencias,
    cargando,
    onSeleccionar
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                    <h3 className="font-bold text-slate-950">
                        Resultados
                    </h3>

                    <p className="text-sm text-slate-500">
                        Selecciona una incidencia para consultar timeline y comentarios.
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                    {incidencias.length}
                </span>
            </div>

            <div className="divide-y divide-slate-100">
                {cargando ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500">
                        Cargando incidencias...
                    </p>
                ) : incidencias.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500">
                        No hay incidencias con los filtros seleccionados.
                    </p>
                ) : incidencias.map((incidencia) => (
                    <button
                        key={incidencia.id}
                        type="button"
                        onClick={() => onSeleccionar(incidencia)}
                        className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[170px_1fr_170px_150px]"
                    >
                        <div>
                            <p className="font-bold text-emerald-700">
                                {incidencia.folio}
                            </p>

                            <p className="text-xs text-slate-500">
                                {formatearFecha(incidencia.fecha_creacion)} · {formatearHora(incidencia.fecha_creacion)}
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="truncate font-bold text-slate-950">
                                {incidencia.titulo}
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-500">
                                {incidencia.linea_nombre || 'Sin línea'} · {incidencia.area_nombre || 'Sin área'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400">
                                Responsable
                            </p>

                            <p className="truncate text-sm font-semibold text-slate-700">
                                {incidencia.responsable_nombre || 'Sin responsable'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 lg:justify-end">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {estados[incidencia.estado] || incidencia.estado}
                            </span>

                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                {prioridades[incidencia.prioridad] || incidencia.prioridad}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}

function DetalleHistoricoPanel({
    incidencia,
    cargando,
    error,
    onCerrar
}) {
    if (!incidencia) {
        return null;
    }

    const historial = incidencia.historial || [];
    const comentarios = incidencia.comentarios || [];

    return (
        <div className="fixed inset-0 z-[90]">
            <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={onCerrar}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <aside className="custom-scrollbar absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
                <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                                {incidencia.folio ||
                                    `INC-${incidencia.id}`}
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-slate-950">
                                {incidencia.titulo}
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                {estados[incidencia.estado] || incidencia.estado} · {prioridades[incidencia.prioridad] || incidencia.prioridad}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onCerrar}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="space-y-5 p-6">
                    {cargando && (
                        <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                            Cargando detalle...
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <section className="grid gap-3 md:grid-cols-2">
                        <InfoDetalle
                            etiqueta="Fecha"
                            valor={`${formatearFecha(incidencia.fecha_creacion)} ${formatearHora(incidencia.fecha_creacion)}`}
                        />
                        <InfoDetalle
                            etiqueta="Área"
                            valor={incidencia.area_nombre || 'Sin área'}
                        />
                        <InfoDetalle
                            etiqueta="Línea"
                            valor={incidencia.linea_nombre || 'Sin línea'}
                        />
                        <InfoDetalle
                            etiqueta="Responsable"
                            valor={incidencia.responsable_nombre || 'Sin responsable'}
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-950">
                            Descripción
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {incidencia.descripcion || 'Sin descripción.'}
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                            <History
                                size={18}
                                className="text-emerald-700"
                            />
                            <h3 className="font-bold text-slate-950">
                                Timeline
                            </h3>
                        </div>

                        <div className="mt-4 space-y-3">
                            {historial.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Sin movimientos registrados.
                                </p>
                            ) : historial.map((evento) => (
                                <div
                                    key={evento.id}
                                    className="rounded-2xl bg-slate-50 p-4"
                                >
                                    <p className="font-bold text-slate-800">
                                        {evento.accion}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {evento.usuario_nombre || 'Sistema'} · {formatearFecha(evento.fecha_creacion)} {formatearHora(evento.fecha_creacion)}
                                    </p>

                                    {(evento.estado_anterior || evento.estado_nuevo) && (
                                        <p className="mt-2 text-sm text-slate-600">
                                            {evento.estado_anterior || 'Sin estado'} → {evento.estado_nuevo || 'Sin estado'}
                                        </p>
                                    )}

                                    {evento.comentario && (
                                        <p className="mt-2 text-sm text-slate-600">
                                            {evento.comentario}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                            <MessageSquare
                                size={18}
                                className="text-emerald-700"
                            />
                            <h3 className="font-bold text-slate-950">
                                Comentarios
                            </h3>
                        </div>

                        <div className="mt-4 space-y-3">
                            {comentarios.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Sin comentarios registrados.
                                </p>
                            ) : comentarios.map((comentario) => (
                                <div
                                    key={comentario.id}
                                    className="rounded-2xl bg-slate-50 p-4"
                                >
                                    <p className="text-sm text-slate-700">
                                        {comentario.comentario}
                                    </p>

                                    <p className="mt-2 text-xs text-slate-400">
                                        {comentario.usuario_nombre || 'Usuario'} · {formatearFecha(comentario.fecha_creacion)} {formatearHora(comentario.fecha_creacion)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </aside>
        </div>
    );
}

function InfoDetalle({
    etiqueta,
    valor
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
                {etiqueta}
            </p>

            <p className="mt-1 font-semibold text-slate-800">
                {valor}
            </p>
        </div>
    );
}

export default ReportesPage;
