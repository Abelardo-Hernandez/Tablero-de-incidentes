import {
    AlertCircle,
    Route,
    Save
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';
import useAuth from '../../hooks/useAuth';

import {
    actualizarLinea,
    crearLinea,
    obtenerUnidadesNegocio
} from '../../services/catalogos.service';

const formularioInicial = {
    nombre: '',
    descripcion: '',
    unidad_negocio_id: '',
    activo: true
};

function LineaModal({
    abierto,
    lineaEditar,
    onCerrar,
    onGuardado
}) {
    const { usuario } = useAuth();
    const esSuperAdmin = usuario?.rol === 'super_admin';
    const editando = Boolean(lineaEditar?.id);

    const [formulario, setFormulario] =
        useState(formularioInicial);
    const [unidadesNegocio, setUnidadesNegocio] = useState([]);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        if (lineaEditar) {
            setFormulario({
                nombre: lineaEditar.nombre || '',
                descripcion: lineaEditar.descripcion || '',
                unidad_negocio_id:
                    lineaEditar.unidad_negocio_id || '',
                activo: Boolean(lineaEditar.activo)
            });
        } else {
            setFormulario({
                ...formularioInicial,
                unidad_negocio_id:
                    usuario?.unidad_negocio_id || ''
            });
        }

        setError('');
    }, [abierto, lineaEditar, usuario?.unidad_negocio_id]);

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
            setError('El nombre de la línea es obligatorio.');
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
            descripcion:
                formulario.descripcion.trim() || null,
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
                await actualizarLinea(lineaEditar.id, datos);
            } else {
                await crearLinea(datos);
            }

            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar línea:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar la línea.'
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
                    ? 'Editar línea'
                    : 'Registrar línea'
            }
            descripcion={
                editando
                    ? 'Actualiza el nombre, descripción y disponibilidad.'
                    : 'Agrega una nueva línea para asignaciones operativas.'
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
                            Nombre de la línea
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            placeholder="Ej. Línea 1"
                            disabled={guardando}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="descripcion"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Descripción
                        </label>

                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formulario.descripcion}
                            onChange={manejarCambio}
                            placeholder="Describe brevemente la línea o su ubicación."
                            disabled={guardando}
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
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
                                <Route size={20} />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Línea habilitada
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Disponible para asignaciones y operación.
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
                                Guardar línea
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default LineaModal;
