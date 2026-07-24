import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Search
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

const nombresRutas = {
    '/': {
        titulo: 'Dashboard ejecutivo',
        subtitulo:
            'Resumen operativo del Centro de incidencias'
    },
    '/incidencias': {
        titulo: 'Incidencias',
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
        titulo: 'Reportes',
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

    const menuRef = useRef(null);

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

    function salir() {
        cerrarSesion();
        navigate('/login', { replace: true });
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
                    <button
                        type="button"
                        className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white md:flex"
                    >
                        <Search size={18} />
                        <span>Buscar...</span>
                        <kbd className="ml-5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px]">
                            Ctrl K
                        </kbd>
                    </button>

                    <button
                        type="button"
                        className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                        aria-label="Notificaciones"
                    >
                        <Bell size={20} />

                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>

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