import {
    Clock3,
    Edit3,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    cambiarEstadoTurno,
    obtenerTurnos
} from '../../services/catalogos.service';

import TurnoModal from './TurnoModal';

function limpiarHora(hora) {
    if (!hora) {
        return '--:--';
    }

    return String(hora).slice(0, 5);
}

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

function TurnosPage() {
    const [turnos, setTurnos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [turnoSeleccionado, setTurnoSeleccionado] =
        useState(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        activo: ''
    });

    const cargarTurnos = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await obtenerTurnos({
                activo:
                    filtros.activo !== ''
                        ? filtros.activo
                        : undefined
            });

            setTurnos(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener turnos:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar los turnos.'
            );
        } finally {
            setCargando(false);
        }
    }, [filtros.activo]);

    useEffect(() => {
        cargarTurnos();
    }, [cargarTurnos]);

    const turnosFiltrados = useMemo(() => {
        const busqueda = filtros.buscar
            .trim()
            .toLowerCase();

        if (!busqueda) {
            return turnos;
        }

        return turnos.filter((turno) =>
            [
                turno.nombre,
                limpiarHora(turno.hora_inicio),
                limpiarHora(turno.hora_fin)
            ]
                .join(' ')
                .toLowerCase()
                .includes(busqueda)
        );
    }, [turnos, filtros.buscar]);

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

    function abrirNuevoTurno() {
        setTurnoSeleccionado(null);
        setModalAbierto(true);
    }

    function abrirEditarTurno(turno) {
        setTurnoSeleccionado(turno);
        setModalAbierto(true);
    }

    function cerrarModal() {
        setModalAbierto(false);
        setTurnoSeleccionado(null);
    }

    async function cambiarEstado(turno) {
        const accion = turno.activo
            ? 'deshabilitar'
            : 'habilitar';

        const confirmado = window.confirm(
            `¿Deseas ${accion} el turno ${turno.nombre}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            await cambiarEstadoTurno(turno.id, !turno.activo);
            await cargarTurnos();
        } catch (errorSolicitud) {
            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar el estado del turno.'
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
                        Turnos operativos
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Crea, edita y administra horarios de inicio y final.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={abrirNuevoTurno}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                >
                    <Plus size={19} />
                    Nuevo turno
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
                            placeholder="Buscar por nombre u horario..."
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
                            Habilitados
                        </option>

                        <option value="false">
                            Deshabilitados
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
                            <Clock3 size={21} />
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-950">
                                Turnos registrados
                            </h3>

                            <p className="text-sm text-slate-500">
                                {turnosFiltrados.length} resultado(s)
                            </p>
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <div className="grid min-h-72 place-items-center">
                        <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                            <p className="mt-4 text-sm text-slate-500">
                                Cargando turnos...
                            </p>
                        </div>
                    </div>
                ) : turnosFiltrados.length === 0 ? (
                    <div className="grid min-h-72 place-items-center px-6 text-center">
                        <div>
                            <Clock3
                                size={44}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-bold text-slate-700">
                                No se encontraron turnos
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Modifica los filtros o registra un turno nuevo.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {turnosFiltrados.map((turno) => (
                            <article
                                key={turno.id}
                                className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-200 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                                            <Clock3 size={22} />
                                        </div>

                                        <div className="min-w-0">
                                            <h4 className="truncate font-bold text-slate-900">
                                                {turno.nombre}
                                            </h4>

                                            <p className="text-sm text-slate-500">
                                                Creado {formatearFecha(turno.fecha_creacion)}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={[
                                            'rounded-full px-2.5 py-1 text-xs font-bold',
                                            turno.activo
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                        ].join(' ')}
                                    >
                                        {turno.activo
                                            ? 'Habilitado'
                                            : 'Deshabilitado'}
                                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase text-slate-400">
                                            Inicio
                                        </p>

                                        <p className="mt-1 text-2xl font-bold text-slate-900">
                                            {limpiarHora(turno.hora_inicio)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase text-slate-400">
                                            Final
                                        </p>

                                        <p className="mt-1 text-2xl font-bold text-slate-900">
                                            {limpiarHora(turno.hora_fin)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-xs font-semibold text-slate-400">
                                        ID #{turno.id}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            title="Editar"
                                            onClick={() =>
                                                abrirEditarTurno(turno)
                                            }
                                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            <Edit3 size={17} />
                                        </button>

                                        <button
                                            type="button"
                                            title={
                                                turno.activo
                                                    ? 'Deshabilitar'
                                                    : 'Habilitar'
                                            }
                                            onClick={() =>
                                                cambiarEstado(turno)
                                            }
                                            className={[
                                                'grid h-9 w-9 place-items-center rounded-lg transition',
                                                turno.activo
                                                    ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                                                    : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                                            ].join(' ')}
                                        >
                                            {turno.activo ? (
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

            <TurnoModal
                abierto={modalAbierto}
                turnoEditar={turnoSeleccionado}
                onCerrar={cerrarModal}
                onGuardado={cargarTurnos}
            />
        </div>
    );
}

export default TurnosPage;
