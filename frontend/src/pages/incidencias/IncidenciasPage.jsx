import {
    Bell,
    CheckCircle2,
    ClipboardList,
    Eye,
    ListChecks,
    PlayCircle,
    Plus,
    RefreshCw,
    Search,
    UserCheck
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
    asignarIncidencia,
    obtenerIncidencias,
    obtenerResponsablesIncidencias
} from '../../services/incidencias.service';
import {
    activarPush
} from '../../services/push.service';

import IncidenciaDetallePanel from './IncidenciaDetallePanel';
import IncidenciaModal from './IncidenciaModal';
import KanbanColumn from './components/KanbanColumn';
import useAuth from '../../hooks/useAuth';

const columnas = [
    {
        estado: 'nueva',
        titulo: 'Nuevas',
        descripcion: 'Recién creadas',
        icono: ClipboardList,
        estiloIcono: 'bg-blue-50 text-blue-700',
        estiloContador: 'bg-blue-50 text-blue-700'
    },
    {
        estado: 'en_proceso',
        titulo: 'En proceso',
        descripcion: 'En atención',
        icono: PlayCircle,
        estiloIcono: 'bg-amber-50 text-amber-700',
        estiloContador: 'bg-amber-50 text-amber-700'
    },
    {
        estado: 'pendiente_confirmacion',
        titulo: 'Por confirmar',
        descripcion: 'Validación del área reportante',
        icono: CheckCircle2,
        estiloIcono: 'bg-violet-50 text-violet-700',
        estiloContador: 'bg-violet-50 text-violet-700'
    },
    {
        estado: 'resuelta',
        titulo: 'Resueltas',
        descripcion: 'Atención terminada',
        icono: CheckCircle2,
        estiloIcono: 'bg-emerald-50 text-emerald-700',
        estiloContador: 'bg-emerald-50 text-emerald-700'
    }
];

const estadosAbiertos = [
    'nueva',
    'asignada',
    'en_proceso',
    'pendiente_confirmacion'
];

function IncidenciasPage() {
    const { usuario } = useAuth();

    const [incidencias, setIncidencias] = useState([]);
    const [areas, setAreas] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [tiposFalla, setTiposFalla] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [unidadesNegocio, setUnidadesNegocio] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [actualizandoMovil, setActualizandoMovil] = useState(false);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [incidenciaSeleccionada, setIncidenciaSeleccionada] =
        useState(null);
    const [tomandoId, setTomandoId] = useState(null);
    const [permisoNotificaciones, setPermisoNotificaciones] =
        useState(() => {
            if (
                typeof window === 'undefined' ||
                !('Notification' in window)
            ) {
                return 'unsupported';
            }

            return window.Notification.permission;
        });
    const [registrandoPush, setRegistrandoPush] = useState(false);
    const [instalacionPwa, setInstalacionPwa] = useState(null);
    const pendientesRef = useRef(null);
    const asignadasRef = useRef(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        tipo: '',
        prioridad: '',
        area_id: '',
        linea_id: ''
    });

    const tiposFallaFiltro = useMemo(
        () => Array.from(
            new Map(
                tiposFalla.map((tipo) => [
                    tipo.clave,
                    tipo
                ])
            ).values()
        ),
        [tiposFalla]
    );

    const cargarIncidencias = useCallback(async (silencioso = false) => {
        try {
            if (!silencioso) {
                setCargando(true);
            }
            setError('');

            const respuesta = await obtenerIncidencias({
                buscar: filtros.buscar || undefined,
                tipo: filtros.tipo || undefined,
                prioridad: filtros.prioridad || undefined,
                area_id: filtros.area_id || undefined,
                linea_id: filtros.linea_id || undefined
            });

            setIncidencias(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener incidencias:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar las incidencias.'
            );
        } finally {
            if (!silencioso) {
                setCargando(false);
            }
        }
    }, [filtros]);

    async function actualizarIncidenciasMovil() {
        if (actualizandoMovil) return;

        setActualizandoMovil(true);

        try {
            await cargarIncidencias(true);
        } finally {
            setActualizandoMovil(false);
        }
    }

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarIncidencias();
        }, 300);

        return () => clearTimeout(temporizador);
    }, [cargarIncidencias]);

    useEffect(() => {
        const intervalo = window.setInterval(() => {
            cargarIncidencias(true);
        }, 15000);

        function actualizarAlRegresar() {
            if (document.visibilityState === 'visible') {
                cargarIncidencias(true);
            }
        }

        document.addEventListener(
            'visibilitychange',
            actualizarAlRegresar
        );

        return () => {
            window.clearInterval(intervalo);
            document.removeEventListener(
                'visibilitychange',
                actualizarAlRegresar
            );
        };
    }, [cargarIncidencias]);

    useEffect(() => {
        async function cargarCatalogos() {
            try {
                const resultados = await Promise.allSettled([
                    obtenerAreasActivas(),
                    obtenerLineasActivas(),
                    obtenerTurnosActivos(),
                    obtenerTiposFallaActivos(),
                    obtenerResponsablesIncidencias(),
                    usuario?.rol === 'super_admin'
                        ? obtenerUnidadesNegocio({ activo: true })
                        : Promise.resolve({ data: [] })
                ]);

                if (resultados[0].status === 'fulfilled') {
                    setAreas(resultados[0].value.data || []);
                }

                if (resultados[1].status === 'fulfilled') {
                    setLineas(resultados[1].value.data || []);
                }

                if (resultados[2].status === 'fulfilled') {
                    setTurnos(resultados[2].value.data || []);
                }

                if (resultados[3].status === 'fulfilled') {
                    setTiposFalla(resultados[3].value.data || []);
                }

                if (resultados[4].status === 'fulfilled') {
                    setUsuarios(resultados[4].value.data || []);
                }

                if (resultados[5].status === 'fulfilled') {
                    setUnidadesNegocio(resultados[5].value.data || []);
                }
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar catálogos:',
                    errorSolicitud
                );
            }
        }

        cargarCatalogos();
    }, [usuario?.rol]);

    useEffect(() => {
        function guardarInstalacion(evento) {
            evento.preventDefault();
            setInstalacionPwa(evento);
        }

        window.addEventListener(
            'beforeinstallprompt',
            guardarInstalacion
        );

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                guardarInstalacion
            );
        };
    }, []);

    const metricas = useMemo(() => {
        const abiertas = incidencias.filter(
            (incidencia) =>
                estadosAbiertos.includes(incidencia.estado)
        );

        return {
            abiertas: abiertas.length,
            criticas: abiertas.filter(
                (incidencia) =>
                    incidencia.prioridad === 'critica'
            ).length,
            sinResponsable: abiertas.filter(
                (incidencia) =>
                    !incidencia.responsable_usuario_id
            ).length,
            resueltas: incidencias.filter(
                (incidencia) =>
                    [
                        'resuelta',
                        'cerrada'
                    ].includes(incidencia.estado)
            ).length
        };
    }, [incidencias]);

    const misIncidenciasAsignadas = useMemo(
        () =>
            incidencias.filter(
                (incidencia) =>
                    Number(incidencia.responsable_usuario_id) ===
                        Number(usuario?.id) &&
                    [
                        'asignada',
                        'en_proceso',
                        'pendiente_confirmacion'
                    ].includes(incidencia.estado)
            ),
        [incidencias, usuario?.id]
    );

    const pendientesMiArea = useMemo(
        () => {
            if (!usuario?.area_id) {
                return [];
            }

            return incidencias.filter(
                (incidencia) =>
                    Number(incidencia.area_responsable_id) ===
                        Number(usuario.area_id) &&
                    !incidencia.responsable_usuario_id &&
                    estadosAbiertos.includes(incidencia.estado)
            );
        },
        [incidencias, usuario?.area_id]
    );

    const pendientesConfirmacion = useMemo(() => {
        if (!usuario?.id && !usuario?.area_id) return [];

        return incidencias.filter(
            (incidencia) =>
                incidencia.estado === 'pendiente_confirmacion' &&
                (
                    Number(incidencia.usuario_creador_id) ===
                        Number(usuario.id) ||
                    Number(incidencia.area_origen_id) ===
                        Number(usuario.area_id)
                ) &&
                Number(incidencia.responsable_usuario_id) !==
                    Number(usuario.id)
        );
    }, [incidencias, usuario?.area_id, usuario?.id]);

    const vistaOperativaMovil = usuario?.rol === 'usuario';

    function manejarFiltro(evento) {
        const {
            name,
            value
        } = evento.target;

        setFiltros((actual) => ({
            ...actual,
            [name]: value
        }));
    }

    async function tomarIncidencia(incidencia) {
        try {
            setTomandoId(incidencia.id);
            await asignarIncidencia(incidencia.id, usuario.id);
            await cargarIncidencias();
            setIncidenciaSeleccionada({
                ...incidencia,
                responsable_usuario_id: usuario.id,
                responsable_nombre: usuario.nombre,
                estado:
                    ['nueva', 'asignada'].includes(incidencia.estado)
                        ? 'en_proceso'
                        : incidencia.estado
            });
        } catch (errorSolicitud) {
            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible tomar la incidencia.'
            );
        } finally {
            setTomandoId(null);
        }
    }

    async function activarAvisosCelular() {
        try {
            setRegistrandoPush(true);

            const resultado = await activarPush();
            setPermisoNotificaciones(resultado.permiso);

            if (!resultado.disponible) {
                window.alert(
                    'Las notificaciones push aun no estan configuradas en el servidor.'
                );
            }
        } catch (errorSolicitud) {
            console.error(
                'Error al activar notificaciones:',
                errorSolicitud
            );

            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible activar las notificaciones.'
            );
        } finally {
            setRegistrandoPush(false);
        }
    }

    function irASeccion(referencia) {
        referencia.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    async function instalarPwa() {
        if (!instalacionPwa) {
            return;
        }

        instalacionPwa.prompt();
        await instalacionPwa.userChoice;
        setInstalacionPwa(null);
    }

    return (
        <div className="mx-auto max-w-[1800px] space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                <div className="hidden">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                            <ListChecks size={17} />
                            Centro de Incidencias
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            Tablero de Reportes
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                        Registra, asigna, atiende y da seguimiento a incidencias de producción.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setModalAbierto(true)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                    >
                        <Plus size={17} />
                        Nueva incidencia
                    </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-3 lg:items-center">
                    
                    <div className="divide-y divide-slate-100">
                        <ResumenMetrica
                            titulo="Abiertas"
                            valor={metricas.abiertas}
                            tono="emerald"
                        />
                        <ResumenMetrica
                            titulo="Críticas"
                            valor={metricas.criticas}
                            tono="red"
                        />
                    </div>

                    <div className="divide-y divide-slate-100 lg:border-x lg:border-slate-100 lg:px-5">
                        <ResumenMetrica
                            titulo="Sin responsable"
                            valor={metricas.sinResponsable}
                            tono="amber"
                        />
                        <ResumenMetrica
                            titulo="Resueltas"
                            valor={metricas.resueltas}
                            tono="blue"
                        />
                    </div>

                    <div className="flex justify-stretch lg:justify-end">
                        <button
                            type="button"
                            onClick={() => setModalAbierto(true)}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600 lg:max-w-64"
                        >
                            <Plus size={18} />
                            Nueva incidencia
                        </button>
                    </div>
                </div>
            </section>

            {vistaOperativaMovil && (
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={actualizarIncidenciasMovil}
                            disabled={actualizandoMovil}
                            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2 text-center text-xs font-bold text-blue-800 transition active:bg-blue-100 disabled:cursor-wait disabled:opacity-70"
                        >
                            <RefreshCw
                                size={21}
                                className={actualizandoMovil ? 'animate-spin' : ''}
                            />
                            {actualizandoMovil
                                ? 'Actualizando...'
                                : 'Actualizar'}
                        </button>

                        <button
                            type="button"
                            onClick={() => irASeccion(pendientesRef)}
                            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-center text-xs font-bold text-amber-800"
                        >
                            <UserCheck size={21} />
                            Mi area
                            <span className="text-[11px] font-semibold text-amber-700/75">
                                {pendientesMiArea.length} nuevo(s)
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => irASeccion(asignadasRef)}
                            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-center text-xs font-bold text-emerald-800"
                        >
                            <Eye size={21} />
                            Atender
                            <span className="text-[11px] font-semibold text-emerald-700/75">
                                {misIncidenciasAsignadas.length} activa(s)
                            </span>
                        </button>
                    </div>

                    {[
                        'default',
                        'denied'
                    ].includes(permisoNotificaciones) && (
                        <button
                            type="button"
                            onClick={activarAvisosCelular}
                            disabled={registrandoPush}
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700"
                        >
                            <Bell size={16} />
                            {registrandoPush
                                ? 'Activando avisos...'
                                : 'Activar avisos del celular'}
                        </button>
                    )}

                    {instalacionPwa && (
                        <button
                            type="button"
                            onClick={instalarPwa}
                            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800"
                        >
                            Instalar app en este celular
                        </button>
                    )}
                </section>
            )}

            {pendientesConfirmacion.length > 0 && (
                <section className="rounded-3xl border border-violet-200 bg-violet-50/80 p-5 shadow-sm lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-violet-950">
                                Soluciones por confirmar
                            </h2>
                            <p className="mt-1 text-sm text-violet-800/75">
                                Verifica si la falla quedó resuelta o indica si continua.
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-violet-700">
                            {pendientesConfirmacion.length}
                        </span>
                    </div>

                    <div className="mt-4 space-y-3">
                        {pendientesConfirmacion.map((incidencia) => (
                            <article
                                key={incidencia.id}
                                className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"
                            >
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                                    {incidencia.folio}
                                </p>
                                <h3 className="mt-1 font-bold text-slate-950">
                                    {incidencia.titulo}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {incidencia.linea_nombre || 'Sin linea'} · {incidencia.area_nombre || 'Sin area'}
                                </p>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                    {incidencia.solucion_aplicada || 'El area responsable registro una solucion.'}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setIncidenciaSeleccionada(incidencia)}
                                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition active:bg-violet-800"
                                >
                                    <CheckCircle2 size={18} />
                                    Revisar y confirmar
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {misIncidenciasAsignadas.length > 0 && (
                <section
                    ref={asignadasRef}
                    className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-emerald-950">
                                Mis incidencias asignadas
                            </h2>

                            <p className="text-sm text-emerald-800/70">
                                Casos donde eres el encargado de la atención.
                            </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">
                            {misIncidenciasAsignadas.length} pendiente(s)
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        {misIncidenciasAsignadas.map((incidencia) => (
                            <article
                                key={incidencia.id}
                                className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                                        {incidencia.folio}
                                    </p>

                                    <h3 className="mt-1 truncate font-bold text-slate-950">
                                        {incidencia.titulo}
                                    </h3>

                                    <p className="mt-1 truncate text-sm text-slate-500">
                                        {incidencia.linea_nombre || 'Sin línea'} · {incidencia.area_nombre || 'Sin área'} · {
                                            incidencia.estado === 'asignada'
                                                ? 'Asignada'
                                                : incidencia.estado === 'pendiente_confirmacion'
                                                    ? 'Esperando confirmación'
                                                    : 'En proceso'
                                        }
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setIncidenciaSeleccionada(
                                            incidencia
                                        )
                                    }
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-600"
                                >
                                    <Eye size={17} />
                                    {incidencia.estado === 'pendiente_confirmacion'
                                        ? 'Ver estado'
                                        : 'Atender'}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {pendientesMiArea.length > 0 && (
                <section
                    ref={pendientesRef}
                    className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-amber-950">
                                Pendientes de mi área
                            </h2>

                            <p className="text-sm text-amber-800/70">
                                Reportes sin responsable para tomar cuando estes disponible.
                            </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-700">
                            {pendientesMiArea.length} nuevo(s)
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        {pendientesMiArea.map((incidencia) => (
                            <article
                                key={incidencia.id}
                                className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                                        {incidencia.folio}
                                    </p>

                                    <h3 className="mt-1 truncate font-bold text-slate-950">
                                        {incidencia.titulo}
                                    </h3>

                                    <p className="mt-1 truncate text-sm text-slate-500">
                                        {incidencia.linea_nombre || 'Sin línea'} · {incidencia.area_nombre || 'Sin área'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        tomarIncidencia(incidencia)
                                    }
                                    disabled={tomandoId === incidencia.id}
                                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-60"
                                >
                                    <UserCheck size={17} />
                                    {tomandoId === incidencia.id
                                        ? 'Tomando...'
                                        : 'Tomar'}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {vistaOperativaMovil &&
                !cargando &&
                pendientesMiArea.length === 0 &&
                misIncidenciasAsignadas.length === 0 &&
                pendientesConfirmacion.length === 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm lg:hidden">
                    <p className="font-bold text-slate-950">
                        No tienes atenciones pendientes
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        Cuando llegue una incidencia de tu área aparecera aqui para tomarla.
                    </p>
                </section>
            )}

            <section
                className={[
                    'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm',
                    vistaOperativaMovil ? 'hidden lg:block' : ''
                ].join(' ')}
            >
                <div className="grid gap-4 xl:grid-cols-[1fr_190px_180px_220px_220px]">
                    <div className="relative">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            name="buscar"
                            value={filtros.buscar}
                            onChange={manejarFiltro}
                            placeholder="Buscar por folio, título, área o línea..."
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <select
                        name="tipo"
                        value={filtros.tipo}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Tipo
                        </option>
                        {tiposFallaFiltro.map((tipo) => (
                            <option
                                key={tipo.clave}
                                value={tipo.clave}
                            >
                                {tipo.nombre}
                            </option>
                        ))}
                    </select>

                    <select
                        name="prioridad"
                        value={filtros.prioridad}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Prioridad
                        </option>
                        <option value="critica">
                            Crítica
                        </option>
                        <option value="alta">
                            Alta
                        </option>
                        <option value="media">
                            Media
                        </option>
                        <option value="baja">
                            Baja
                        </option>
                    </select>

                    <select
                        name="area_id"
                        value={filtros.area_id}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Todas las áreas
                        </option>

                        {areas.map((area) => (
                            <option
                                key={area.id}
                                value={area.id}
                            >
                                {area.nombre}
                            </option>
                        ))}
                    </select>

                    <select
                        name="linea_id"
                        value={filtros.linea_id}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Todas las líneas
                        </option>

                        {lineas.map((linea) => (
                            <option
                                key={linea.id}
                                value={linea.id}
                            >
                                {linea.nombre}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {error && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </section>
            )}

            {cargando ? (
                <section
                    className={[
                        'grid min-h-96 place-items-center rounded-3xl border border-slate-200 bg-white',
                        vistaOperativaMovil ? 'hidden lg:grid' : ''
                    ].join(' ')}
                >
                    <div className="text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                        <p className="mt-4 text-sm text-slate-500">
                            Cargando incidencias...
                        </p>
                    </div>
                </section>
            ) : (
                <section
                    className={[
                        'custom-scrollbar flex gap-4 overflow-x-auto pb-2',
                        vistaOperativaMovil ? 'hidden lg:flex' : ''
                    ].join(' ')}
                >
                    {columnas.map((columna) => (
                        <KanbanColumn
                            key={columna.estado}
                            titulo={columna.titulo}
                            descripcion={columna.descripcion}
                            icono={columna.icono}
                            estiloIcono={columna.estiloIcono}
                            estiloContador={columna.estiloContador}
                            incidencias={incidencias.filter(
                                (incidencia) =>
                                    columna.estado === 'en_proceso'
                                        ? ['asignada', 'en_proceso']
                                            .includes(incidencia.estado)
                                        : incidencia.estado ===
                                            columna.estado
                            )}
                            onSeleccionar={
                                setIncidenciaSeleccionada
                            }
                        />
                    ))}
                </section>
            )}

            <IncidenciaModal
                abierto={modalAbierto}
                areas={areas}
                lineas={lineas}
                turnos={turnos}
                tiposFalla={tiposFalla}
                unidadesNegocio={unidadesNegocio}
                onCerrar={() => setModalAbierto(false)}
                onGuardado={cargarIncidencias}
            />

            <IncidenciaDetallePanel
                abierto={Boolean(incidenciaSeleccionada)}
                incidencia={incidenciaSeleccionada}
                usuarios={usuarios}
                onCerrar={() =>
                    setIncidenciaSeleccionada(null)
                }
                onActualizado={cargarIncidencias}
            />
        </div>
    );
}

function ResumenMetrica({
    titulo,
    valor,
    tono
}) {
    const tonos = {
        emerald: 'text-emerald-700',
        red: 'text-red-700',
        amber: 'text-amber-700',
        blue: 'text-blue-700'
    };

    return (
        <div className="flex min-h-7 items-center justify-between gap-4 py-1">
            <p className="truncate text-xs font-semibold text-slate-500">
                {titulo}
            </p>

            <p
                className={[
                    'shrink-0 text-xl font-black leading-none',
                    tonos[tono]
                ].join(' ')}
            >
                {valor}
            </p>
        </div>
    );
}

export default IncidenciasPage;
