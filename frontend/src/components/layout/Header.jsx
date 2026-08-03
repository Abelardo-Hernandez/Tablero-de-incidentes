import {
    Bell,
    BellOff,
    ChevronDown,
    LogOut,
    Menu,
    X
} from 'lucide-react';

import {
    useEffect,
    useRef,
    useState
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router';

import useAuth from '../../hooks/useAuth';

import {
    eliminarNotificacion,
    EVENTO_NOTIFICACIONES,
    obtenerNotificaciones
} from '../../utils/notificaciones';

const nombresRutas = {
    '/': {
        titulo: 'Dashboard ejecutivo',
        subtitulo:
            'Resumen operativo del Centro de incidencias'
    },
    '/incidencias': {
        titulo: 'Reportes',
        subtitulo:
            'Consulta, seguimiento y atención de reportes'
    },
    '/usuarios': {
        titulo: 'Usuarios',
        subtitulo:
            'Administración de usuarios y responsables'
    },
    '/areas': {
        titulo: 'Áreas',
        subtitulo:
            'Catálogo de departamentos responsables'
    },
    '/lineas': {
        titulo: 'Líneas',
        subtitulo:
            'Configuración de líneas de producción'
    },
    '/turnos': {
        titulo: 'Turnos',
        subtitulo:
            'Horarios operativos de producción'
    },
    '/reportes': {
        titulo: 'Histórico',
        subtitulo:
            'Indicadores, tiempos y exportación de datos'
    },
    '/configuracion': {
        titulo: 'Configuración',
        subtitulo:
            'Preferencias generales del sistema'
    }
};

function Header({
    abrirMenuMovil
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        usuario,
        cerrarSesion
    } = useAuth();

    const [menuPerfilAbierto, setMenuPerfilAbierto] =
        useState(false);
    const [
        notificacionesAbiertas,
        setNotificacionesAbiertas
    ] = useState(false);
    const [notificaciones, setNotificaciones] = useState(
        obtenerNotificaciones
    );

    const menuRef = useRef(null);
    const notificacionesRef = useRef(null);

    const datosRuta =
        nombresRutas[location.pathname] ||
        {
            titulo: 'Centro de incidencias',
            subtitulo:
                'Gestión operativa en tiempo real'
        };

    useEffect(() => {
        function cerrarAlHacerClickFuera(evento) {
            if (
                menuRef.current &&
                !menuRef.current.contains(evento.target)
            ) {
                setMenuPerfilAbierto(false);
            }

            if (
                notificacionesRef.current &&
                !notificacionesRef.current.contains(evento.target)
            ) {
                setNotificacionesAbiertas(false);
            }
        }

        document.addEventListener(
            'mousedown',
            cerrarAlHacerClickFuera
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                cerrarAlHacerClickFuera
            );
        };
    }, []);

    useEffect(() => {
        function actualizarNotificaciones(evento) {
            setNotificaciones(
                evento.detail || obtenerNotificaciones()
            );
        }

        window.addEventListener(
            EVENTO_NOTIFICACIONES,
            actualizarNotificaciones
        );

        window.addEventListener(
            'storage',
            actualizarNotificaciones
        );

        return () => {
            window.removeEventListener(
                EVENTO_NOTIFICACIONES,
                actualizarNotificaciones
            );

            window.removeEventListener(
                'storage',
                actualizarNotificaciones
            );
        };
    }, []);

    function salir() {
        cerrarSesion();
        navigate('/login', { replace: true });
    }

    function quitarNotificacion(id) {
        eliminarNotificacion(id);
        setNotificaciones(obtenerNotificaciones());
    }

    const iniciales = usuario?.nombre
        ?.split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join('')
        .toUpperCase();

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        type="button"
                        onClick={abrirMenuMovil}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                        aria-label="Abrir menú"
                    >
                        <Menu size={21} />
                    </button>

                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                            {datosRuta.titulo}
                        </h1>

                        <p className="mt-1 hidden truncate text-sm text-slate-500 sm:block">
                            {datosRuta.subtitulo}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div
                        ref={notificacionesRef}
                        className="relative"
                    >
                        <button
                            type="button"
                            onClick={() =>
                                setNotificacionesAbiertas(
                                    (actual) => !actual
                                )
                            }
                            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                            aria-label="Notificaciones"
                        >
                            <Bell size={20} />

                            {notificaciones.length > 0 && (
                                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                                    {notificaciones.length}
                                </span>
                            )}
                        </button>

                        {notificacionesAbiertas && (
                            <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                <div className="border-b border-slate-100 px-4 py-3">
                                    <p className="font-bold text-slate-950">
                                        Notificaciones
                                    </p>
                                </div>

                                {notificaciones.length === 0 ? (
                                    <div className="grid min-h-36 place-items-center px-5 py-6 text-center">
                                        <div>
                                            <BellOff
                                                size={34}
                                                className="mx-auto text-slate-300"
                                            />

                                            <p className="mt-3 text-sm font-semibold text-slate-500">
                                                No hay nuevas notificaciones
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="custom-scrollbar max-h-96 divide-y divide-slate-100 overflow-y-auto">
                                        {notificaciones.map(
                                            (notificacion) => (
                                                <article
                                                    key={
                                                        notificacion.id
                                                    }
                                                    className="flex gap-3 px-4 py-3"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-950">
                                                            {
                                                                notificacion.titulo
                                                            }
                                                        </p>

                                                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                                            {
                                                                notificacion.mensaje
                                                            }
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        aria-label="Eliminar notificación"
                                                        onClick={() =>
                                                            quitarNotificacion(
                                                                notificacion.id
                                                            )
                                                        }
                                                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        ref={menuRef}
                        className="relative"
                    >
                        <button
                            type="button"
                            onClick={() =>
                                setMenuPerfilAbierto(
                                    (actual) => !actual
                                )
                            }
                            className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100"
                        >
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                                {iniciales || 'US'}
                            </div>

                            <div className="hidden text-left xl:block">
                                <p className="max-w-40 truncate text-sm font-bold text-slate-900">
                                    {usuario?.nombre}
                                </p>

                                <p className="text-xs capitalize text-slate-500">
                                    {usuario?.rol}
                                </p>
                            </div>

                            <ChevronDown
                                size={16}
                                className="hidden text-slate-400 xl:block"
                            />
                        </button>

                        {menuPerfilAbierto && (
                            <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                <div className="border-b border-slate-100 p-4">
                                    <p className="font-bold text-slate-900">
                                        {usuario?.nombre}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {usuario?.usuario}
                                    </p>

                                    {usuario?.area_nombre && (
                                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                                            {usuario.area_nombre}
                                            {usuario.linea_nombre
                                                ? ` · ${usuario.linea_nombre}`
                                                : ''}
                                        </p>
                                    )}
                                </div>

                                <div className="p-2">
                                    <button
                                        type="button"
                                        onClick={salir}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                    >
                                        <LogOut size={18} />
                                        Cerrar sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
