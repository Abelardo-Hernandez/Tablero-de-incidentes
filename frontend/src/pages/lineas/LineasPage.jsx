import {
    ArrowLeft,
    Edit3,
    Plus,
    Route,
    Search,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    Link
} from 'react-router';

import {
    cambiarEstadoLinea,
    obtenerLineas
} from '../../services/catalogos.service';

import LineaModal from './LineaModal';

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

function LineasPage() {
    const [lineas, setLineas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [lineaSeleccionada, setLineaSeleccionada] =
        useState(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        activo: ''
    });

    const cargarLineas = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await obtenerLineas({
                buscar: filtros.buscar || undefined,
                activo:
                    filtros.activo !== ''
                        ? filtros.activo
                        : undefined
            });

            setLineas(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener líneas:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar las líneas.'
            );
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarLineas();
        }, 300);

        return () => clearTimeout(temporizador);
    }, [cargarLineas]);

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

    function abrirNuevaLinea() {
        setLineaSeleccionada(null);
        setModalAbierto(true);
    }

    function abrirEditarLinea(linea) {
        setLineaSeleccionada(linea);
        setModalAbierto(true);
    }

    function cerrarModal() {
        setModalAbierto(false);
        setLineaSeleccionada(null);
    }

    async function cambiarEstado(linea) {
        const accion = linea.activo
            ? 'deshabilitar'
            : 'habilitar';

        const confirmado = window.confirm(
            `¿Deseas ${accion} la línea ${linea.nombre}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            await cambiarEstadoLinea(linea.id, !linea.activo);
            await cargarLineas();
        } catch (errorSolicitud) {
            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar el estado de la línea.'
            );
        }
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to="/configuracion"
                    title="Volver a configuraciÃ³n"
                    aria-label="Volver a configuraciÃ³n"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                    <ArrowLeft size={20} />
                </Link>

                <section className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
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
                            Habilitadas
                        </option>

                        <option value="false">
                            Deshabilitadas
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={abrirNuevaLinea}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                    >
                        <Plus size={19} />
                        Nueva línea
                    </button>
                </div>
                </section>
            </div>

            {error && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Route size={21} />
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-950">
                                Líneas registradas
                            </h3>

                            <p className="text-sm text-slate-500">
                                {lineas.length} resultado(s)
                            </p>
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <div className="grid min-h-72 place-items-center">
                        <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                            <p className="mt-4 text-sm text-slate-500">
                                Cargando líneas...
                            </p>
                        </div>
                    </div>
                ) : lineas.length === 0 ? (
                    <div className="grid min-h-72 place-items-center px-6 text-center">
                        <div>
                            <Route
                                size={44}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-bold text-slate-700">
                                No se encontraron líneas
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Modifica los filtros o registra una línea nueva.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="custom-scrollbar overflow-x-auto">
                        <table className="w-full min-w-[940px] table-fixed text-left">
                            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400">
                                <tr>
                                    <th className="w-[22%] px-6 py-2.5">Línea</th>
                                    <th className="w-[24%] px-6 py-2.5">Descripción</th>
                                    <th className="w-[16%] px-6 py-2.5">Unidad</th>
                                    <th className="w-[13%] px-6 py-2.5">Estado</th>
                                    <th className="w-[13%] px-6 py-2.5">Creación</th>
                                    <th className="w-[12%] px-6 py-2.5">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {lineas.map((linea) => (
                                    <tr
                                        key={linea.id}
                                        className="transition hover:bg-slate-50"
                                    >
                                        <td className="px-6 py-2.5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                                                    <Route size={17} />
                                                </div>

                                                <p className="max-w-56 truncate font-bold text-slate-900">
                                                    {linea.nombre}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-6 py-2.5">
                                            <p className="line-clamp-2 max-w-md text-sm leading-5 text-slate-500">
                                                {linea.descripcion ||
                                                    'Sin descripción registrada.'}
                                            </p>
                                        </td>

                                        <td className="px-6 py-2.5">
                                            <p className="max-w-44 truncate text-sm font-semibold text-slate-700">
                                                {linea.unidad_negocio_nombre ||
                                                    'Sin unidad'}
                                            </p>
                                        </td>

                                        <td className="px-6 py-2.5">
                                            <span
                                                className={[
                                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                                                    linea.activo
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                ].join(' ')}
                                            >
                                                {linea.activo
                                                    ? 'Habilitada'
                                                    : 'Deshabilitada'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-2.5 text-sm font-semibold text-slate-600">
                                            {formatearFecha(linea.fecha_creacion)}
                                        </td>

                                        <td className="px-6 py-2.5">
                                            <div className="flex items-center justify-start gap-1">
                                                <button
                                                    type="button"
                                                    title="Editar"
                                                    onClick={() =>
                                                        abrirEditarLinea(linea)
                                                    }
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <Edit3 size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={
                                                        linea.activo
                                                            ? 'Deshabilitar'
                                                            : 'Habilitar'
                                                    }
                                                    onClick={() =>
                                                        cambiarEstado(linea)
                                                    }
                                                    className={[
                                                        'grid h-8 w-8 place-items-center rounded-lg transition',
                                                        linea.activo
                                                            ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                                                            : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                                                    ].join(' ')}
                                                >
                                                    {linea.activo ? (
                                                        <ToggleRight size={20} />
                                                    ) : (
                                                        <ToggleLeft size={20} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <LineaModal
                abierto={modalAbierto}
                lineaEditar={lineaSeleccionada}
                onCerrar={cerrarModal}
                onGuardado={cargarLineas}
            />
        </div>
    );
}

export default LineasPage;
