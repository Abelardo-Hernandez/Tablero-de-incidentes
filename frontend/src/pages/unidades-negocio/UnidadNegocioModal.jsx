import {
    AlertCircle,
    Building2,
    Save
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';

import {
    actualizarUnidadNegocio,
    crearUnidadNegocio
} from '../../services/catalogos.service';

const formularioInicial = {
    nombre: '',
    descripcion: '',
    activo: true
};

function UnidadNegocioModal({
    abierto,
    unidadEditar,
    onCerrar,
    onGuardado
}) {
    const editando = Boolean(unidadEditar?.id);

    const [formulario, setFormulario] =
        useState(formularioInicial);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        if (unidadEditar) {
            setFormulario({
                nombre: unidadEditar.nombre || '',
                descripcion: unidadEditar.descripcion || '',
                activo: Boolean(unidadEditar.activo)
            });
        } else {
            setFormulario(formularioInicial);
        }

        setError('');
    }, [abierto, unidadEditar]);

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
            setError('El nombre de la unidad es obligatorio.');
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            descripcion:
                formulario.descripcion.trim() || null,
            activo: formulario.activo
        };

        try {
            setGuardando(true);
            setError('');

            if (editando) {
                await actualizarUnidadNegocio(
                    unidadEditar.id,
                    datos
                );
            } else {
                await crearUnidadNegocio(datos);
            }

            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar unidad:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar la unidad de negocio.'
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
                    ? 'Editar unidad'
                    : 'Registrar unidad'
            }
            descripcion={
                editando
                    ? 'Actualiza el nombre, descripcion y estado.'
                    : 'Agrega una unidad para separar usuarios y catalogos.'
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
                            Nombre de la unidad
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            placeholder="Ej. Planta Norte"
                            disabled={guardando}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="descripcion"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Descripcion
                        </label>

                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formulario.descripcion}
                            onChange={manejarCambio}
                            placeholder="Describe brevemente esta unidad."
                            disabled={guardando}
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700">
                                <Building2 size={20} />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Unidad activa
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Disponible para usuarios y catalogos.
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
                                Guardar unidad
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default UnidadNegocioModal;
