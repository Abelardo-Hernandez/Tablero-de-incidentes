import {
    Maximize2,
    Minimize2,
    MonitorPlay
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import {
    obtenerIncidencias
} from '../../services/incidencias.service';

import {
    obtenerVideosLocales
} from '../../services/videos.service';

import {
    obtenerTiempoTranscurrido
} from '../../utils/fechas';

import {
    cargarConfiguracion,
    EVENTO_CONFIGURACION
} from '../../utils/configuracion';

const estadosActivos = [
    'nueva',
    'asignada',
    'en_proceso'
];

const estadosTvConCerradas = [
    ...estadosActivos,
    'resuelta',
    'cerrada'
];

const ordenPrioridad = [
    'critica',
    'alta',
    'media',
    'baja'
];

function obtenerNivelAlertaParo(incidencia) {
    if (!incidencia.detuvo_linea) return 3;
    if (incidencia.estado === 'nueva') return 0;
    if (incidencia.estado === 'asignada') return 1;
    return 2;
}

function TvPage() {
    const tvRef = useRef(null);
    const idsVistosRef = useRef(new Set());
    const primeraCargaRef = useRef(true);

    const [incidencias, setIncidencias] = useState([]);
    const [incidenciasNuevas, setIncidenciasNuevas] =
        useState(new Set());
    const [videos, setVideos] = useState([
        '/videos/dashboard.mp4'
    ]);
    const [videoActual, setVideoActual] = useState(0);
    const [videoDisponible, setVideoDisponible] =
        useState(true);
    const [hora, setHora] = useState(new Date());
    const [pantallaCompleta, setPantallaCompleta] =
        useState(false);
    const [configuracion, setConfiguracion] = useState(
        cargarConfiguracion
    );
    const [, setTick] = useState(0);

    useEffect(() => {
        function actualizar(evento) {
            setConfiguracion(
                evento.detail || cargarConfiguracion()
            );
        }

        window.addEventListener(
            EVENTO_CONFIGURACION,
            actualizar
        );

        window.addEventListener(
            'storage',
            actualizar
        );

        return () => {
            window.removeEventListener(
                EVENTO_CONFIGURACION,
                actualizar
            );
            window.removeEventListener(
                'storage',
                actualizar
            );
        };
    }, []);

    useEffect(() => {
        async function cargarIncidencias() {
            try {
                const respuesta =
                    await obtenerIncidencias();

                const nuevasIncidencias =
                    respuesta.data || [];

                const estadosVisibles =
                    configuracion.mostrarCerradasTv
                        ? estadosTvConCerradas
                        : estadosActivos;

                const idsActivos = new Set(
                    nuevasIncidencias
                        .filter((incidencia) =>
                            estadosVisibles.includes(
                                incidencia.estado
                            )
                        )
                        .map((incidencia) => incidencia.id)
                );

                if (primeraCargaRef.current) {
                    idsVistosRef.current = idsActivos;
                    primeraCargaRef.current = false;
                } else {
                    const idsNuevos = [...idsActivos].filter(
                        (id) => !idsVistosRef.current.has(id)
                    );

                    if (idsNuevos.length > 0) {
                        setIncidenciasNuevas(
                            (actual) =>
                                new Set([
                                    ...actual,
                                    ...idsNuevos
                                ])
                        );

                        window.setTimeout(() => {
                            setIncidenciasNuevas(
                                (actual) => {
                                    const siguiente =
                                        new Set(actual);

                                    idsNuevos.forEach((id) =>
                                        siguiente.delete(id)
                                    );

                                    return siguiente;
                                }
                            );
                        }, 9000);
                    }

                    idsVistosRef.current = idsActivos;
                }

                setIncidencias(nuevasIncidencias);
            } catch (error) {
                console.error(
                    'Error al cargar vista TV:',
                    error
                );
            }
        }

        cargarIncidencias();

        const intervalo = window.setInterval(() => {
            cargarIncidencias();
        }, Math.max(10, configuracion.refrescoTv) * 1000);

        return () => window.clearInterval(intervalo);
    }, [
        configuracion.mostrarCerradasTv,
        configuracion.refrescoTv
    ]);

    useEffect(() => {
        const intervalo = window.setInterval(() => {
            setHora(new Date());
            setTick((actual) => actual + 1);
        }, 1000);

        return () => window.clearInterval(intervalo);
    }, []);

    useEffect(() => {
        async function cargarVideos() {
            try {
                const respuesta =
                    await obtenerVideosLocales();

                const rutas = (respuesta.data || [])
                    .map((video) => video.src)
                    .filter(Boolean);

                if (rutas.length > 0) {
                    setVideos(rutas);
                    setVideoActual(0);
                    setVideoDisponible(true);
                }
            } catch (error) {
                console.error(
                    'Error al cargar videos de TV:',
                    error
                );
            }
        }

        cargarVideos();
    }, []);

    useEffect(() => {
        function manejarCambioPantallaCompleta() {
            setPantallaCompleta(
                document.fullscreenElement === tvRef.current
            );
        }

        document.addEventListener(
            'fullscreenchange',
            manejarCambioPantallaCompleta
        );

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                manejarCambioPantallaCompleta
            );
        };
    }, []);

    const incidenciasActivas = useMemo(
        () =>
            incidencias
                .filter((incidencia) => {
                    const estadosVisibles =
                        configuracion.mostrarCerradasTv
                            ? estadosTvConCerradas
                            : estadosActivos;

                    return estadosVisibles.includes(
                        incidencia.estado
                    );
                })
                .sort((a, b) => {
                    const nivelParoA = obtenerNivelAlertaParo(a);
                    const nivelParoB = obtenerNivelAlertaParo(b);

                    if (nivelParoA !== nivelParoB) {
                        return nivelParoA - nivelParoB;
                    }

                    const prioridadA =
                        ordenPrioridad.indexOf(
                            a.prioridad
                        );
                    const prioridadB =
                        ordenPrioridad.indexOf(
                            b.prioridad
                        );

                    if (prioridadA !== prioridadB) {
                        return prioridadA - prioridadB;
                    }

                    return (
                        new Date(a.fecha_creacion).getTime() -
                        new Date(b.fecha_creacion).getTime()
                    );
                }),
        [incidencias, configuracion.mostrarCerradasTv]
    );

    const videoPrincipal = videos[videoActual];

    async function alternarPantallaCompleta() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }

            await tvRef.current?.requestFullscreen();
        } catch (error) {
            console.error(
                'No fue posible activar pantalla completa:',
                error
            );
        }
    }

    return (
        <div
            ref={tvRef}
            className="tv-screen relative min-h-full rounded-3xl bg-[#071629] p-4 text-white shadow-xl sm:p-5 xl:h-full xl:overflow-hidden"
        >
            <button
                type="button"
                onClick={alternarPantallaCompleta}
                title={
                    pantallaCompleta
                        ? 'Salir de pantalla completa'
                        : 'Pantalla completa'
                }
                aria-label={
                    pantallaCompleta
                        ? 'Salir de pantalla completa'
                        : 'Pantalla completa'
                }
                className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/10 text-slate-200 backdrop-blur transition hover:bg-white/15 hover:text-white"
            >
                {pantallaCompleta ? (
                    <Minimize2 size={17} />
                ) : (
                    <Maximize2 size={17} />
                )}
            </button>

            <div className="grid h-full gap-5 xl:grid-cols-[0.95fr_1.45fr]">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    <header className="border-b border-white/10 px-4 py-3 pr-14">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">
                                    Incidencias activas
                                </h2>
                                {configuracion.mostrarCerradasTv && (
                                    <p className="mt-1 text-sm text-slate-400">
                                        Incluye resueltas y cerradas
                                    </p>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="font-mono text-2xl font-bold">
                                    {hora.toLocaleTimeString(
                                        'es-MX',
                                        {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }
                                    )}
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                        {incidenciasActivas.length === 0 ? (
                            <div className="grid h-full min-h-80 place-items-center rounded-2xl border border-dashed border-white/10 text-center">
                                <div>
                                    <MonitorPlay
                                        size={44}
                                        className="mx-auto text-slate-500"
                                    />

                                    <p className="mt-4 text-xl font-bold">
                                        Sin incidencias activas
                                    </p>

                                    <p className="mt-2 text-sm text-slate-500">
                                        La operación continúa estable.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            incidenciasActivas.map(
                                (incidencia) => (
                                    <IncidenciaFila
                                        key={incidencia.id}
                                        incidencia={incidencia}
                                        nueva={incidenciasNuevas.has(
                                            incidencia.id
                                        )}
                                    />
                                )
                            )
                        )}
                    </div>
                </section>

                <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_58%)]" />

                        {videoDisponible ? (
                            <video
                                key={videoPrincipal}
                                src={videoPrincipal}
                                className="relative max-h-full max-w-full object-contain"
                                autoPlay
                                playsInline
                                loop={videos.length === 1}
                                preload="auto"
                                onEnded={() => {
                                    setVideoActual(
                                        (actual) =>
                                            (actual + 1) %
                                            videos.length
                                    );
                                }}
                                onError={() => {
                                    if (videos.length > 1) {
                                        setVideoActual(
                                            (actual) =>
                                                (actual + 1) %
                                                videos.length
                                        );
                                        return;
                                    }

                                    setVideoDisponible(false);
                                }}
                            />
                        ) : (
                            <div className="relative text-center">
                                <MonitorPlay
                                    size={64}
                                    className="mx-auto text-emerald-400"
                                />

                                <p className="mt-5 text-2xl font-bold">
                                    Videos no disponibles
                                </p>

                                <p className="mt-2 text-slate-500">
                                    Agrega archivos en la carpeta local de videos.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function IncidenciaFila({
    incidencia,
    nueva
}) {
    const paroSinTomar =
        incidencia.detuvo_linea && incidencia.estado === 'nueva';
    const paroAsignado =
        incidencia.detuvo_linea && incidencia.estado === 'asignada';
    const paroEnAtencion =
        incidencia.detuvo_linea && incidencia.estado === 'en_proceso';

    const segundosTranscurridos = Math.floor(
        Math.max(
            0,
            Date.now() -
                new Date(incidencia.fecha_creacion).getTime()
        ) / 1000
    );

    const minutosTranscurridos = Math.floor(
        segundosTranscurridos / 60
    );

    const acabaDeCambiarColor =
        [
            10,
            20,
            30
        ].includes(minutosTranscurridos) &&
        segundosTranscurridos % 60 < 8;

    const claseTiempo =
        minutosTranscurridos >= 21
            ? 'bg-red-500/15 text-red-200 ring-red-400/30'
            : minutosTranscurridos >= 10
                ? 'bg-amber-400/15 text-amber-200 ring-amber-300/30'
                : 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30';

    const claseIncidencia = paroSinTomar
        ? 'tv-line-stop-unassigned border-red-300/80 bg-red-950/75'
        : paroAsignado
            ? 'tv-line-stop-assigned border-amber-300/55 bg-amber-950/60'
            : paroEnAtencion
                ? 'border-sky-300/35 bg-sky-950/45'
                : incidencia.prioridad === 'critica'
                    ? 'border-red-400/25 bg-red-400/10'
                    : 'border-white/10 bg-white/[0.04]';

    const textoAlerta = paroSinTomar
        ? 'PARO DE LÍNEA · SIN RESPONSABLE'
        : paroAsignado
            ? 'PARO DE LÍNEA · ATENDIENDO'
            : paroEnAtencion
                ? 'PARO DE LÍNEA · EN PROCESO'
                : '';

    return (
        <article
            className={[
                'rounded-2xl border px-4 py-2.5 transition-colors duration-700',
                nueva ? 'tv-new-incident' : '',
                acabaDeCambiarColor
                    ? 'tv-threshold-incident'
                    : '',
                minutosTranscurridos > 30
                    ? 'tv-overdue-incident'
                    : '',
                claseIncidencia
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p
                        className={[
                            'truncate text-sm font-bold uppercase tracking-[0.16em]',
                            paroSinTomar
                                ? 'text-red-100'
                                : paroAsignado
                                    ? 'text-amber-100'
                                    : paroEnAtencion
                                        ? 'text-sky-200'
                                        : 'text-emerald-300'
                        ].join(' ')}
                    >
                        {textoAlerta && `${textoAlerta} · `}
                        {incidencia.linea_nombre ||
                            'Sin línea asignada'}
                    </p>

                    <p className="mt-1 truncate text-lg font-bold">
                        {incidencia.titulo}
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-slate-400">
                        {incidencia.responsable_nombre
                            ? `Atiende: ${incidencia.responsable_nombre}`
                            : 'En espera'} · {incidencia.area_nombre ||
                            'Área no registrada'}
                    </p>
                </div>

                <span
                    className={[
                        'shrink-0 rounded-full px-3 py-1 font-mono text-sm font-bold ring-1 transition-colors duration-700',
                        claseTiempo
                    ].join(' ')}
                >
                    {obtenerTiempoTranscurrido(
                        incidencia.fecha_creacion
                    )}
                </span>
            </div>
        </article>
    );
}

export default TvPage;
