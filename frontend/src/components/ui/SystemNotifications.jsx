import {
    AlertTriangle,
    BarChart3,
    Bell,
    X
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import {
    obtenerIncidencias
} from '../../services/incidencias.service';

import {
    cargarConfiguracion,
    EVENTO_CONFIGURACION
} from '../../utils/configuracion';

import {
    agregarNotificacion
} from '../../utils/notificaciones';

const estadosAbiertos = [
    'nueva',
    'asignada',
    'en_proceso'
];

const CLAVE_RESUMEN_DIARIO =
    'tablero_incidentes_resumen_diario';

function reproducirAlerta() {
    try {
        const AudioContext =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContext) {
            return;
        }

        const contexto = new AudioContext();
        const oscilador = contexto.createOscillator();
        const ganancia = contexto.createGain();

        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(
            880,
            contexto.currentTime
        );
        ganancia.gain.setValueAtTime(
            0.0001,
            contexto.currentTime
        );
        ganancia.gain.exponentialRampToValueAtTime(
            0.18,
            contexto.currentTime + 0.02
        );
        ganancia.gain.exponentialRampToValueAtTime(
            0.0001,
            contexto.currentTime + 0.35
        );

        oscilador.connect(ganancia);
        ganancia.connect(contexto.destination);
        oscilador.start();
        oscilador.stop(contexto.currentTime + 0.38);
    } catch {
        // Algunos navegadores bloquean audio sin interacción previa.
    }
}

function fechaLocal() {
    return new Date().toISOString().slice(0, 10);
}

function SystemNotifications() {
    const [configuracion, setConfiguracion] = useState(
        cargarConfiguracion
    );
    const [avisos, setAvisos] = useState([]);
    const idsVistosRef = useRef(new Set());
    const primeraCargaRef = useRef(true);

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

    const agregarAviso = useCallback((aviso) => {
        const notificacion = agregarNotificacion(aviso);

        setAvisos((actual) => [
            notificacion,
            ...actual
        ].slice(0, 4));

        window.setTimeout(() => {
            setAvisos((actual) =>
                actual.filter(
                    (item) => item.id !== notificacion.id
                )
            );
        }, 8500);
    }, []);

    const crearResumenDiario = useCallback(
        (incidencias) => {
            if (!configuracion.resumenDiario) {
                return;
            }

            const hoy = fechaLocal();
            const claveHoy = `${CLAVE_RESUMEN_DIARIO}:${hoy}`;

            if (localStorage.getItem(claveHoy)) {
                return;
            }

            const abiertas = incidencias.filter(
                (incidencia) =>
                    estadosAbiertos.includes(
                        incidencia.estado
                    )
            );

            const criticas = abiertas.filter(
                (incidencia) =>
                    incidencia.prioridad === 'critica'
            );

            const resueltasHoy = incidencias.filter(
                (incidencia) =>
                    [
                        'resuelta',
                        'cerrada'
                    ].includes(incidencia.estado) &&
                    String(
                        incidencia.fecha_resolucion ||
                            incidencia.fecha_cierre ||
                            incidencia.fecha_actualizacion ||
                            ''
                    ).startsWith(hoy)
            );

            localStorage.setItem(claveHoy, 'true');
            agregarAviso({
                tipo: 'resumen',
                titulo: 'Resumen diario',
                mensaje: `${abiertas.length} abiertas, ${criticas.length} críticas y ${resueltasHoy.length} resueltas hoy.`
            });
        },
        [agregarAviso, configuracion.resumenDiario]
    );

    const revisarIncidencias = useCallback(async () => {
        if (
            !configuracion.notificacionesPantalla &&
            !configuracion.sonidoAlertas &&
            !configuracion.resumenDiario
        ) {
            return;
        }

        try {
            const respuesta = await obtenerIncidencias();
            const incidencias = respuesta.data || [];
            const abiertas = incidencias.filter(
                (incidencia) =>
                    estadosAbiertos.includes(
                        incidencia.estado
                    )
            );
            const idsAbiertas = new Set(
                abiertas.map((incidencia) => incidencia.id)
            );

            if (primeraCargaRef.current) {
                idsVistosRef.current = idsAbiertas;
                primeraCargaRef.current = false;
                crearResumenDiario(incidencias);
                return;
            }

            const nuevas = abiertas.filter(
                (incidencia) =>
                    !idsVistosRef.current.has(incidencia.id)
            );

            if (nuevas.length > 0) {
                const criticas = nuevas.filter(
                    (incidencia) =>
                        incidencia.prioridad === 'critica'
                );

                if (configuracion.notificacionesPantalla) {
                    agregarAviso({
                        tipo:
                            criticas.length > 0
                                ? 'critica'
                                : 'nueva',
                        titulo:
                            nuevas.length === 1
                                ? 'Nueva incidencia'
                                : 'Nuevas incidencias',
                        mensaje:
                            nuevas.length === 1
                                ? nuevas[0].titulo
                                : `${nuevas.length} incidencias nuevas registradas.`
                    });
                }

                if (
                    configuracion.sonidoAlertas &&
                    criticas.length > 0
                ) {
                    reproducirAlerta();
                }
            }

            idsVistosRef.current = idsAbiertas;
        } catch (error) {
            console.error(
                'Error al revisar notificaciones:',
                error
            );
        }
    }, [
        agregarAviso,
        configuracion,
        crearResumenDiario
    ]);

    useEffect(() => {
        revisarIncidencias();

        const intervalo = window.setInterval(
            revisarIncidencias,
            Math.max(10, configuracion.refrescoTv) * 1000
        );

        return () => window.clearInterval(intervalo);
    }, [configuracion.refrescoTv, revisarIncidencias]);

    const avisosVisibles = useMemo(
        () =>
            configuracion.notificacionesPantalla ||
            configuracion.resumenDiario
                ? avisos
                : [],
        [
            avisos,
            configuracion.notificacionesPantalla,
            configuracion.resumenDiario
        ]
    );

    if (avisosVisibles.length === 0) {
        return null;
    }

    return (
        <div className="fixed right-4 top-24 z-50 w-[min(360px,calc(100vw-2rem))] space-y-3">
            {avisosVisibles.map((aviso) => {
                const esCritica = aviso.tipo === 'critica';
                const esResumen = aviso.tipo === 'resumen';
                const Icono = esResumen
                    ? BarChart3
                    : esCritica
                        ? AlertTriangle
                        : Bell;

                return (
                    <article
                        key={aviso.id}
                        className={[
                            'rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-950/10',
                            esCritica
                                ? 'border-red-200'
                                : esResumen
                                    ? 'border-blue-200'
                                    : 'border-emerald-200'
                        ].join(' ')}
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className={[
                                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                                    esCritica
                                        ? 'bg-red-50 text-red-700'
                                        : esResumen
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-emerald-50 text-emerald-700'
                                ].join(' ')}
                            >
                                <Icono size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-950">
                                    {aviso.titulo}
                                </p>

                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                    {aviso.mensaje}
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label="Cerrar aviso"
                                onClick={() =>
                                    setAvisos((actual) =>
                                        actual.filter(
                                            (item) =>
                                                item.id !== aviso.id
                                        )
                                    )
                                }
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export default SystemNotifications;
