import {
    AlertTriangle,
    Bell,
    X
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import useAuth from '../../hooks/useAuth';
import {
    marcarNotificacionLeida,
    obtenerNotificacionesServidor
} from '../../services/notificaciones.service';
import {
    cargarConfiguracion,
    EVENTO_CONFIGURACION
} from '../../utils/configuracion';

function reproducirAlerta() {
    try {
        const AudioContext =
            window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const contexto = new AudioContext();
        const oscilador = contexto.createOscillator();
        const ganancia = contexto.createGain();
        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(880, contexto.currentTime);
        ganancia.gain.setValueAtTime(0.0001, contexto.currentTime);
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
        // Algunos navegadores requieren interacción para reproducir audio.
    }
}

function mostrarAvisoNavegador(aviso) {
    if (
        !('Notification' in window) ||
        window.Notification.permission !== 'granted'
    ) return;

    try {
        const notificacion = new window.Notification(aviso.titulo, {
            body: aviso.mensaje,
            tag: `notificacion-${aviso.id}`,
            renotify: true
        });
        window.setTimeout(() => notificacion.close(), 9000);
    } catch {
        // El navegador puede bloquear avisos fuera de contextos seguros.
    }
}

function claveAvisosCerrados(usuarioId) {
    const fecha = new Date().toLocaleDateString('en-CA');
    return `tablero-avisos-cerrados:${usuarioId}:${fecha}`;
}

function cargarAvisosCerrados(usuarioId) {
    if (!usuarioId) return new Set();
    try {
        return new Set(
            JSON.parse(
                localStorage.getItem(claveAvisosCerrados(usuarioId)) || '[]'
            ).map(Number)
        );
    } catch {
        return new Set();
    }
}

function recordarAvisoCerrado(usuarioId, id) {
    const cerrados = cargarAvisosCerrados(usuarioId);
    cerrados.add(Number(id));
    localStorage.setItem(
        claveAvisosCerrados(usuarioId),
        JSON.stringify([...cerrados])
    );
}

function SystemNotifications() {
    const { usuario } = useAuth();
    const [configuracion, setConfiguracion] = useState(
        cargarConfiguracion
    );
    const [avisos, setAvisos] = useState([]);
    const vistosSesionRef = useRef(new Set());
    const temporizadoresRef = useRef(new Set());

    useEffect(() => {
        function actualizar(evento) {
            setConfiguracion(evento.detail || cargarConfiguracion());
        }

        window.addEventListener(EVENTO_CONFIGURACION, actualizar);
        return () => {
            window.removeEventListener(EVENTO_CONFIGURACION, actualizar);
        };
    }, []);

    useEffect(() => {
        vistosSesionRef.current = cargarAvisosCerrados(usuario?.id);
        setAvisos([]);
    }, [usuario?.id]);

    async function cerrarAviso(aviso) {
        recordarAvisoCerrado(usuario?.id, aviso.id);
        vistosSesionRef.current.add(Number(aviso.id));
        setAvisos((actual) =>
            actual.filter((item) => item.id !== aviso.id)
        );

        try {
            await marcarNotificacionLeida(aviso.id);
        } catch (error) {
            console.error('No fue posible marcar el aviso como leido:', error);
        }
    }

    const revisarNotificaciones = useCallback(async () => {
        if (!usuario?.id || !configuracion.notificacionesPantalla) return;

        try {
            const respuesta = await obtenerNotificacionesServidor();
            const cerradosHoy = cargarAvisosCerrados(usuario.id);
            const nuevas = (respuesta.data || []).filter(
                (aviso) =>
                    !vistosSesionRef.current.has(Number(aviso.id)) &&
                    !cerradosHoy.has(Number(aviso.id))
            );

            if (nuevas.length === 0) return;

            nuevas.forEach((aviso) => vistosSesionRef.current.add(Number(aviso.id)));
            setAvisos((actual) => [...nuevas, ...actual].slice(0, 4));

            nuevas.forEach((aviso) => {
                const esCritica = aviso.titulo
                    .toLowerCase()
                    .includes('crítica');

                mostrarAvisoNavegador(aviso);
                if (esCritica && configuracion.sonidoAlertas) {
                    reproducirAlerta();
                }

                const temporizador = window.setTimeout(() => {
                    setAvisos((actual) =>
                        actual.filter((item) => item.id !== aviso.id)
                    );
                    temporizadoresRef.current.delete(temporizador);
                }, 8500);
                temporizadoresRef.current.add(temporizador);
            });
        } catch (error) {
            console.error('Error al revisar notificaciones:', error);
        }
    }, [
        configuracion.notificacionesPantalla,
        configuracion.sonidoAlertas,
        usuario?.id
    ]);

    useEffect(() => {
        revisarNotificaciones();
        const intervalo = window.setInterval(
            revisarNotificaciones,
            Math.max(15, configuracion.refrescoTv) * 1000
        );

        return () => window.clearInterval(intervalo);
    }, [configuracion.refrescoTv, revisarNotificaciones]);

    useEffect(
        () => () => {
            temporizadoresRef.current.forEach(window.clearTimeout);
            temporizadoresRef.current.clear();
        },
        []
    );

    if (avisos.length === 0) return null;

    return (
        <div className="fixed right-4 top-24 z-50 w-[min(360px,calc(100vw-2rem))] space-y-3">
            {avisos.map((aviso) => {
                const esCritica = aviso.titulo
                    .toLowerCase()
                    .includes('crítica');
                const Icono = esCritica ? AlertTriangle : Bell;

                return (
                    <article
                        key={aviso.id}
                        className={[
                            'rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-950/10',
                            esCritica ? 'border-red-200' : 'border-emerald-200'
                        ].join(' ')}
                    >
                        <div className="flex items-start gap-3">
                            <div className={[
                                'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                                esCritica
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            ].join(' ')}>
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
                                onClick={() => cerrarAviso(aviso)}
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
