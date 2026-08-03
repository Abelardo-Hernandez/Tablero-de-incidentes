import {
    Play,
    TrendingUp
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    Link
} from 'react-router';

import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';

import {
    obtenerIncidencias
} from '../../services/incidencias.service';

import {
    obtenerVideosLocales
} from '../../services/videos.service';

import {
    obtenerTiempoTranscurrido
} from '../../utils/fechas';

const estadosAbiertos = [
    'nueva',
    'asignada',
    'en_proceso'
];

function calcularPromedioResolucion(incidencias) {
    const resueltas = incidencias
        .filter(
            (incidencia) =>
                incidencia.fecha_resolucion &&
                incidencia.fecha_creacion
        )
        .map((incidencia) => {
            const inicio = new Date(
                incidencia.fecha_creacion
            ).getTime();
            const fin = new Date(
                incidencia.fecha_resolucion
            ).getTime();

            return Math.max(0, fin - inicio);
        })
        .filter(Boolean);

    if (resueltas.length === 0) {
        return 'Sin datos';
    }

    const promedio =
        resueltas.reduce(
            (total, valor) => total + valor,
            0
        ) / resueltas.length;

    const minutos = Math.round(promedio / 60000);
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    if (horas > 0) {
        return `${horas} h ${minutosRestantes} min`;
    }

    return `${minutosRestantes} min`;
}

function obtenerRankingLineas(incidencias) {
    const conteo = new Map();

    incidencias.forEach((incidencia) => {
        const nombre =
            incidencia.linea_nombre || 'Sin línea';

        conteo.set(
            nombre,
            (conteo.get(nombre) || 0) + 1
        );
    });

    const ranking = Array.from(conteo.entries())
        .map(([nombre, cantidad]) => ({
            nombre,
            cantidad
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    const maximo =
        ranking[0]?.cantidad || 1;

    return ranking.map((item) => ({
        ...item,
        porcentaje: Math.max(
            8,
            Math.round(
                (item.cantidad / maximo) * 100
            )
        )
    }));
}

function DashboardPage() {
    const [incidencias, setIncidencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [videoDisponible, setVideoDisponible] =
        useState(true);
    const [videos, setVideos] = useState([
        '/videos/dashboard.mp4'
    ]);
    const [videoActual, setVideoActual] = useState(0);
    const [, setTick] = useState(0);

    useEffect(() => {
        async function cargarDashboard() {
            try {
                setCargando(true);
                setError('');

                const respuesta =
                    await obtenerIncidencias();

                setIncidencias(respuesta.data || []);
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar dashboard:',
                    errorSolicitud
                );

                setError(
                    errorSolicitud.response?.data?.message ||
                    'No fue posible cargar la información del dashboard.'
                );
            } finally {
                setCargando(false);
            }
        }

        cargarDashboard();
    }, []);

    useEffect(() => {
        const intervalo = window.setInterval(() => {
            setTick((actual) => actual + 1);
        }, 30000);

        return () => window.clearInterval(intervalo);
    }, []);

    useEffect(() => {
        async function cargarPlaylist() {
            try {
                const respuestaVideos =
                    await obtenerVideosLocales();

                const rutasAutomaticas = (
                    respuestaVideos.data || []
                )
                    .map((video) => video.src)
                    .filter(Boolean);

                if (rutasAutomaticas.length > 0) {
                    setVideos(rutasAutomaticas);
                    setVideoActual(0);
                    setVideoDisponible(true);
                    return;
                }
            } catch (errorVideos) {
                console.warn(
                    'No fue posible cargar videos automáticos:',
                    errorVideos
                );
            }

            try {
                const respuesta = await fetch(
                    '/videos/playlist.json'
                );

                if (!respuesta.ok) {
                    return;
                }

                const archivos = await respuesta.json();

                const rutas = archivos
                    .filter(Boolean)
                    .map((archivo) =>
                        archivo.startsWith('/')
                            ? archivo
                            : `/videos/${archivo}`
                    );

                if (rutas.length > 0) {
                    setVideos(rutas);
                    setVideoActual(0);
                    setVideoDisponible(true);
                }
            } catch (errorPlaylist) {
                console.warn(
                    'No fue posible cargar playlist de videos:',
                    errorPlaylist
                );
            }
        }

        cargarPlaylist();
    }, []);

    const datos = useMemo(() => {
        const abiertas = incidencias.filter(
            (incidencia) =>
                estadosAbiertos.includes(
                    incidencia.estado
                )
        );

        const activasOrdenadas = [...abiertas]
            .sort((a, b) => {
                const prioridadA = [
                    'critica',
                    'alta',
                    'media',
                    'baja'
                ].indexOf(a.prioridad);

                const prioridadB = [
                    'critica',
                    'alta',
                    'media',
                    'baja'
                ].indexOf(b.prioridad);

                if (prioridadA !== prioridadB) {
                    return prioridadA - prioridadB;
                }

                return (
                    new Date(a.fecha_creacion).getTime() -
                    new Date(b.fecha_creacion).getTime()
                );
            })
            .slice(0, 3);

        return {
            abiertas,
            criticas: abiertas.filter(
                (incidencia) =>
                    incidencia.prioridad === 'critica'
            ),
            paros: abiertas.filter(
                (incidencia) =>
                    incidencia.detuvo_linea
            ),
            promedio:
                calcularPromedioResolucion(incidencias),
            rankingLineas:
                obtenerRankingLineas(incidencias),
            activas: activasOrdenadas
        };
    }, [incidencias]);

    const videoPrincipal = videos[videoActual];

    return (
        <div className="mx-auto max-w-[1600px] space-y-6">
            {error && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    {error}
                </section>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    titulo="Incidencias abiertas"
                    valor={
                        cargando
                            ? '...'
                            : String(datos.abiertas.length)
                    }
                    descripcion="Registros activos durante el día"
                    variacion={null}
                    tono="verde"
                />

                <KpiCard
                    titulo="Incidencias críticas"
                    valor={
                        cargando
                            ? '...'
                            : String(datos.criticas.length)
                    }
                    descripcion="Requieren intervención inmediata"
                    variacion={null}
                    tono="rojo"
                />

                <KpiCard
                    titulo="Tiempo promedio"
                    valor={
                        cargando
                            ? '...'
                            : datos.promedio
                    }
                    descripcion="Promedio de resolución"
                    variacion={null}
                    tono="ambar"
                />

                <KpiCard
                    titulo="Paros de línea"
                    valor={
                        cargando
                            ? '...'
                            : String(datos.paros.length)
                    }
                    descripcion="Incidencias con impacto productivo"
                    variacion={null}
                    tono="azul"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <article className="overflow-hidden rounded-3xl border border-slate-200 bg-[#071629] shadow-lg">
                    <div className="relative aspect-video min-h-[260px] overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_55%)]" />

                        {videoDisponible ? (
                            <video
                                className="relative h-full w-full object-contain"
                                key={videoPrincipal}
                                src={videoPrincipal}
                                autoPlay
                                controls
                                loop={videos.length === 1}
                                muted
                                playsInline
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
                            <div className="relative grid h-full place-items-center px-6 text-center">
                                <div>
                                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                                    <Play
                                        size={32}
                                        fill="currentColor"
                                    />
                                </div>

                                <p className="mt-5 font-semibold text-white">
                                    Panel de videos
                                </p>

                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    Los contenidos locales aparecerán en este espacio cuando estén disponibles.
                                </p>
                                </div>
                            </div>
                        )}
                    </div>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Líneas con más reportes
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Acumulado registrado
                            </p>
                        </div>

                        <TrendingUp className="text-emerald-600" />
                    </div>

                    <div className="mt-7 space-y-5">
                        {cargando ? (
                            <p className="text-sm text-slate-500">
                                Cargando ranking...
                            </p>
                        ) : datos.rankingLineas.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                Sin incidencias registradas.
                            </p>
                        ) : (
                            datos.rankingLineas.map(
                                (
                                    {
                                        nombre,
                                        cantidad,
                                        porcentaje
                                    },
                                    indice
                                ) => (
                                    <div key={nombre}>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                                    {indice + 1}
                                                </span>

                                                <span className="font-semibold text-slate-700">
                                                    {nombre}
                                                </span>
                                            </div>

                                            <span className="font-bold text-slate-950">
                                                {cantidad}
                                            </span>
                                        </div>

                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-emerald-600"
                                                style={{
                                                    width:
                                                        `${porcentaje}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Incidencias activas
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Seguimiento operativo en tiempo real
                        </p>
                    </div>

                    <Link
                        to="/incidencias"
                        className="rounded-xl border border-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                    >
                        Ver todas
                    </Link>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {cargando ? (
                        <div className="col-span-full grid min-h-40 place-items-center">
                            <div className="text-center">
                                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                                <p className="mt-3 text-sm text-slate-500">
                                    Cargando incidencias...
                                </p>
                            </div>
                        </div>
                    ) : datos.activas.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                            <p className="font-bold text-slate-700">
                                No hay incidencias activas
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Las incidencias nuevas aparecerán aquí.
                            </p>
                        </div>
                    ) : (
                        datos.activas.map((incidencia) => (
                            <article
                                key={incidencia.id}
                                className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-200 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-red-600">
                                            {incidencia.folio}
                                        </p>

                                        <h3 className="mt-2 font-bold text-slate-900">
                                            {incidencia.titulo}
                                        </h3>
                                    </div>

                                    <PrioridadBadge
                                        prioridad={
                                            incidencia.prioridad
                                        }
                                    />
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Línea afectada
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-700">
                                            {incidencia.linea_nombre ||
                                                'Sin línea'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Área que atiende
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-700">
                                            {incidencia.area_nombre ||
                                                'Sin área'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Tiempo transcurrido
                                        </p>

                                        <p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-950">
                                            {obtenerTiempoTranscurrido(
                                                incidencia.fecha_creacion
                                            )}
                                        </p>
                                    </div>

                                    <StatusBadge
                                        estado={incidencia.estado}
                                    />
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

function PrioridadBadge({
    prioridad
}) {
    const estilos = {
        critica: 'bg-red-50 text-red-700',
        alta: 'bg-orange-50 text-orange-700',
        media: 'bg-amber-50 text-amber-700',
        baja: 'bg-emerald-50 text-emerald-700'
    };

    const etiquetas = {
        critica: 'Crítica',
        alta: 'Alta',
        media: 'Media',
        baja: 'Baja'
    };

    return (
        <span
            className={[
                'rounded-full px-3 py-1 text-xs font-bold',
                estilos[prioridad] || estilos.media
            ].join(' ')}
        >
            {etiquetas[prioridad] || prioridad}
        </span>
    );
}

export default DashboardPage;
