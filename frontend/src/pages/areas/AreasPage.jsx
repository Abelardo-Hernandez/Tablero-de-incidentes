import {
    Edit3,
    Layers3,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    cambiarEstadoArea,
    obtenerAreas
} from '../../services/catalogos.service';

import AreaModal from './AreaModal';

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(new Date(fecha));
}

function AreasPage() {
    const [areas, setAreas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [areaSeleccionada, setAreaSeleccionada] =
        useState(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        activo: ''
    });

    const cargarAreas = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await obtenerAreas({
                buscar: filtros.buscar || undefined,
                activo:
                    filtros.activo !== ''
                        ? filtros.activo
                        : undefined
            });

            setAreas(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener áreas:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar las áreas.'
            );
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarAreas();
        }, 300);

        return () => clearTimeout(temporizador);
    }, [cargarAreas]);

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

    function abrirNuevaArea() {
        setAreaSeleccionada(null);
        setModalAbierto(true);
    }

    function abrirEditarArea(area) {
        setAreaSeleccionada(area);
        setModalAbierto(true);
    }

    function cerrarModal() {
        setModalAbierto(false);
        setAreaSeleccionada(null);
    }

    async function cambiarEstado(area) {
        const accion = area.activo
            ? 'eliminar'
            : 'reactivar';

        const confirmado = window.confirm(
            `¿Deseas ${accion} el área ${area.nombre}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            await cambiarEstadoArea(area.id, !area.activo);
            await cargarAreas();
        } catch (errorSolicitud) {
            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar el estado del área.'
            );
        }
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <ShieldCheck size={18} />
                        Administración
                    </div>

                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                        Áreas operativas
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Crea, edita y administra las áreas del sistema.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={abrirNuevaArea}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                >
                    <Plus size={19} />
                    Nueva área
                </button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            name="buscar"
                            value={filtros.buscar}
                            onChange={manejarFiltro}
                            placeholder="Buscar por nombre o descripción..."
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <select
                        name="activo"
                        value={filtros.activo}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Todos los estados
                        </option>

                        <option value="true">
                            Activas
                        </option>

                        <option value="false">
                            Eliminadas
                        </option>
                    </select>
                </div>
            </section>

            {error && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Layers3 size={21} />
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-950">
                                Áreas registradas
                            </h3>

                            <p className="text-sm text-slate-500">
                                {areas.length} resultado(s)
                            </p>
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <div className="grid min-h-72 place-items-center">
                        <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                            <p className="mt-4 text-sm text-slate-500">
                                Cargando áreas...
                            </p>
                        </div>
                    </div>
                ) : areas.length === 0 ? (
                    <div className="grid min-h-72 place-items-center px-6 text-center">
                        <div>
                            <Layers3
                                size={44}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-bold text-slate-700">
                                No se encontraron áreas
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Modifica los filtros o registra un área nueva.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {areas.map((area) => (
                            <article
                                key={area.id}
                                className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-200 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                                            <Layers3 size={22} />
                                        </div>

                                        <div className="min-w-0">
                                            <h4 className="truncate font-bold text-slate-900">
                                                {area.nombre}
                                            </h4>

                                            <p className="text-sm text-slate-500">
                                                Creada {formatearFecha(area.fecha_creacion)}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={[
                                            'rounded-full px-2.5 py-1 text-xs font-bold',
                                            area.activo
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                        ].join(' ')}
                                    >
                                        {area.activo
                                            ? 'Activa'
                                            : 'Eliminada'}
                                    </span>
                                </div>

                                <p className="mt-5 min-h-16 text-sm leading-6 text-slate-500">
                                    {area.descripcion ||
                                        'Sin descripción registrada.'}
                                </p>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-xs font-semibold text-slate-400">
                                        ID #{area.id}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            title="Editar"
                                            onClick={() =>
                                                abrirEditarArea(area)
                                            }
                                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            <Edit3 size={17} />
                                        </button>

                                        <button
                                            type="button"
                                            title={
                                                area.activo
                                                    ? 'Eliminar'
                                                    : 'Reactivar'
                                            }
                                            onClick={() =>
                                                cambiarEstado(area)
                                            }
                                            className={[
                                                'grid h-9 w-9 place-items-center rounded-lg transition',
                                                area.activo
                                                    ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                                                    : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                                            ].join(' ')}
                                        >
                                            {area.activo ? (
                                                <ToggleRight size={21} />
                                            ) : (
                                                <ToggleLeft size={21} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <AreaModal
                abierto={modalAbierto}
                areaEditar={areaSeleccionada}
                onCerrar={cerrarModal}
                onGuardado={cargarAreas}
            />
        </div>
    );
}

export default AreasPage;
