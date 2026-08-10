import {
    AlertCircle,
    Clock3,
    Save
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';
import useAuth from '../../hooks/useAuth';

import {
    actualizarTurno,
    crearTurno,
    obtenerUnidadesNegocio
} from '../../services/catalogos.service';

const formularioInicial = {
    nombre: '',
    hora_inicio: '',
    hora_fin: '',
    unidad_negocio_id: '',
    activo: true
};

function limpiarHora(hora) {
    if (!hora) {
        return '';
    }

    return String(hora).slice(0, 5);
}

function TurnoModal({
    abierto,
    turnoEditar,
    onCerrar,
    onGuardado
}) {
    const { usuario } = useAuth();
    const esSuperAdmin = usuario?.rol === 'super_admin';
    const editando = Boolean(turnoEditar?.id);

    const [formulario, setFormulario] =
        useState(formularioInicial);
    const [unidadesNegocio, setUnidadesNegocio] = useState([]);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        if (turnoEditar) {
            setFormulario({
                nombre: turnoEditar.nombre || '',
                hora_inicio: limpiarHora(turnoEditar.hora_inicio),
                hora_fin: limpiarHora(turnoEditar.hora_fin),
                unidad_negocio_id:
                    turnoEditar.unidad_negocio_id || '',
                activo: Boolean(turnoEditar.activo)
            });
        } else {
            setFormulario({
                ...formularioInicial,
                unidad_negocio_id:
                    usuario?.unidad_negocio_id || ''
            });
        }

        setError('');
    }, [abierto, turnoEditar, usuario?.unidad_negocio_id]);

    useEffect(() => {
        async function cargarUnidades() {
            if (!abierto || !esSuperAdmin) {
                return;
            }

            try {
                const respuesta = await obtenerUnidadesNegocio({
                    activo: true
                });

                setUnidadesNegocio(respuesta.data || []);
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar unidades:',
                    errorSolicitud
                );
            }
        }

        cargarUnidades();
    }, [abierto, esSuperAdmin]);

    function manejarCambio(evento) {
        const {
            name,
            value,
            type,
            checked
        } = evento.target;

        setFormulario((actual) => ({
            ...actual,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));

        if (error) {
            setError('');
        }
    }

    async function manejarEnvio(evento) {
        evento.preventDefault();

        if (!formulario.nombre.trim()) {
            setError('El nombre del turno es obligatorio.');
            return;
        }

        if (!formulario.hora_inicio || !formulario.hora_fin) {
            setError('La hora de inicio y la hora final son obligatorias.');
            return;
        }

        if (
            esSuperAdmin &&
            !editando &&
            !formulario.unidad_negocio_id
        ) {
            setError('Selecciona la unidad de negocio.');
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            hora_inicio: formulario.hora_inicio,
            hora_fin: formulario.hora_fin,
            activo: formulario.activo
        };

        if (esSuperAdmin && formulario.unidad_negocio_id) {
            datos.unidad_negocio_id = Number(
                formulario.unidad_negocio_id
            );
        }

        try {
            setGuardando(true);
            setError('');

            if (editando) {
                await actualizarTurno(turnoEditar.id, datos);
            } else {
                await crearTurno(datos);
            }

            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar turno:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar el turno.'
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo={
                editando
                    ? 'Editar turno'
                    : 'Registrar turno'
            }
            descripcion={
                editando
                    ? 'Actualiza el nombre, horario y disponibilidad.'
                    : 'Agrega un nuevo turno con hora de inicio y final.'
            }
        >
            <form onSubmit={manejarEnvio}>
                <div className="space-y-6 p-6">
                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <AlertCircle
                                size={18}
                                className="mt-0.5 shrink-0"
                            />

                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="nombre"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Nombre del turno
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            placeholder="Ej. Matutino"
                            disabled={guardando}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="hora_inicio"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Hora de inicio
                            </label>

                            <input
                                id="hora_inicio"
                                name="hora_inicio"
                                type="time"
                                value={formulario.hora_inicio}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="hora_fin"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Hora final
                            </label>

                            <input
                                id="hora_fin"
                                name="hora_fin"
                                type="time"
                                value={formulario.hora_fin}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>
                    </div>

                    {esSuperAdmin && (
                        <div>
                            <label
                                htmlFor="unidad_negocio_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Unidad de negocio
                            </label>

                            <select
                                id="unidad_negocio_id"
                                name="unidad_negocio_id"
                                value={formulario.unidad_negocio_id}
                                onChange={manejarCambio}
                                disabled={guardando || editando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <option value="">
                                    Selecciona unidad
                                </option>

                                {unidadesNegocio.map((unidad) => (
                                    <option
                                        key={unidad.id}
                                        value={unidad.id}
                                    >
                                        {unidad.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700">
                                <Clock3 size={20} />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Turno habilitado
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Disponible para operación y filtros.
                                </p>
                            </div>
                        </div>

                        <input
                            name="activo"
                            type="checkbox"
                            checked={formulario.activo}
                            onChange={manejarCambio}
                            disabled={guardando}
                            className="h-5 w-5 accent-emerald-600"
                        />
                    </label>
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCerrar}
                        disabled={guardando}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={guardando}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {guardando ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Guardar turno
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default TurnoModal;
