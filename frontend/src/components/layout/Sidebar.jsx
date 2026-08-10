import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    FileBarChart,
    LayoutDashboard,
    Monitor,
    Settings
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import {
    NavLink
} from 'react-router';

import {
    cargarConfiguracion,
    EVENTO_CONFIGURACION
} from '../../utils/configuracion';

const menuPrincipal = [
    {
        nombre: 'Dashboard',
        ruta: '/',
        icono: LayoutDashboard,
        soloResponsableArea: true
    },
    {
        nombre: 'Reportes',
        ruta: '/incidencias',
        icono: AlertTriangle
    },
];

const menuSecundario = [
    {
        nombre: 'Histórico',
        ruta: '/reportes',
        icono: FileBarChart,
        soloResponsableArea: true
    },
    {
        nombre: 'Vista TV',
        ruta: '/tv',
        icono: Monitor
    },
    {
        nombre: 'Configuración',
        ruta: '/configuracion',
        icono: Settings,
        soloAdmin: true
    }
];

function Sidebar({
    colapsado,
    setColapsado,
    abiertoMovil,
    cerrarMovil,
    usuario
}) {
    const esAdmin =
        ['administrador', 'super_admin'].includes(usuario?.rol);
    const esResponsableArea =
        esAdmin || Boolean(usuario?.es_lider);
    const [configuracion, setConfiguracion] = useState(
        cargarConfiguracion
    );

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

    function filtrarMenu(elementos) {
        return elementos.filter(
            (elemento) =>
                (!elemento.soloAdmin || esAdmin) &&
                (
                    !elemento.soloResponsableArea ||
                    esResponsableArea
                )
        );
    }

    function claseEnlace({ isActive }) {
        return [
            'group flex items-center rounded-xl transition',
            colapsado
                ? 'justify-center px-3 py-3'
                : 'gap-3 px-4 py-3',
            isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
        ].join(' ');
    }

    return (
        <>
            {abiertoMovil && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={cerrarMovil}
                    className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                className={[
                    'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#071629] text-white shadow-2xl transition-all duration-300 lg:relative lg:translate-x-0',
                    colapsado
                        ? 'w-[88px]'
                        : 'w-[270px]',
                    abiertoMovil
                        ? 'translate-x-0'
                        : '-translate-x-full'
                ].join(' ')}
            >
                <button
                    type="button"
                    onClick={() =>
                        setColapsado(
                            (actual) => !actual
                        )
                    }
                    title={
                        colapsado
                            ? 'Expandir menú'
                            : 'Contraer menú'
                    }
                    aria-label={
                        colapsado
                            ? 'Expandir menú'
                            : 'Contraer menú'
                    }
                    className="absolute -right-4 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-950/10 transition hover:border-emerald-200 hover:text-emerald-700 lg:grid"
                >
                    {colapsado ? (
                        <ChevronRight size={18} />
                    ) : (
                        <ChevronLeft size={18} />
                    )}
                </button>

                <div
                    className={[
                        'flex h-20 items-center border-b border-white/10',
                        colapsado
                            ? 'justify-center px-4'
                            : 'gap-3 px-5'
                    ].join(' ')}
                >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#38bd31] text-xl font-semibold text-slate-800">
                        PT
                    </div>

                    {!colapsado && (
                        <div className="min-w-0">
                            <p className="truncate text-lg font-bold">
                                {configuracion.nombreSistema}
                            </p>

                            <p className="text-xs text-slate-500">
                                {configuracion.empresa}
                            </p>
                        </div>
                    )}
                </div>

                <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-6">
                    <p
                        className={[
                            'mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600',
                            colapsado ? 'hidden' : ''
                        ].join(' ')}
                    >
                        Operación
                    </p>

                    <div className="space-y-1">
                        {filtrarMenu(menuPrincipal).map(
                            ({
                                nombre,
                                ruta,
                                icono: Icono
                            }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    end={ruta === '/'}
                                    onClick={cerrarMovil}
                                    className={claseEnlace}
                                    title={
                                        colapsado
                                            ? nombre
                                            : undefined
                                    }
                                >
                                    <Icono
                                        size={20}
                                        className="shrink-0"
                                    />

                                    {!colapsado && (
                                        <span className="font-medium">
                                            {nombre}
                                        </span>
                                    )}
                                </NavLink>
                            )
                        )}
                    </div>

                    <div className="my-6 border-t border-white/10" />

                    <p
                        className={[
                            'mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600',
                            colapsado ? 'hidden' : ''
                        ].join(' ')}
                    >
                        Análisis y sistema
                    </p>

                    <div className="space-y-1">
                        {filtrarMenu(menuSecundario).map(
                            ({
                                nombre,
                                ruta,
                                icono: Icono
                            }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarMovil}
                                    className={claseEnlace}
                                    title={
                                        colapsado
                                            ? nombre
                                            : undefined
                                    }
                                >
                                    <Icono
                                        size={20}
                                        className="shrink-0"
                                    />

                                    {!colapsado && (
                                        <span className="font-medium">
                                            {nombre}
                                        </span>
                                    )}
                                </NavLink>
                            )
                        )}
                    </div>
                </nav>

            </aside>
        </>
    );
}

export default Sidebar;
