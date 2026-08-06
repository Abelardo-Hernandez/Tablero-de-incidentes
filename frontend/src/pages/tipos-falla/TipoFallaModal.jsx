import {
    AlertCircle,
    Save,
    Tag
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';

import {
    actualizarTipoFalla,
    crearTipoFalla
} from '../../services/catalogos.service';

const formularioInicial = {
    nombre: '',
    activo: true
};

function TipoFallaModal({
    abierto,
    tipoEditar,
    onCerrar,
    onGuardado
}) {
    const editando = Boolean(tipoEditar?.id);

    const [formulario, setFormulario] =
        useState(formularioInicial);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        setFormulario(
            tipoEditar
                ? {
                    nombre: tipoEditar.nombre || '',
                    activo: Boolean(tipoEditar.activo)
                }
                : formularioInicial
        );
        setError('');
    }, [abierto, tipoEditar]);

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
            setError('El nombre del tipo de falla es obligatorio.');
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            activo: formulario.activo
        };

        try {
            setGuardando(true);
            setError('');

            if (editando) {
                await actualizarTipoFalla(tipoEditar.id, datos);
            } else {
                await crearTipoFalla(datos);
            }

            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar tipo de falla:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar el tipo de falla.'
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
                    ? 'Editar tipo de falla'
                    : 'Registrar tipo de falla'
            }
            descripcion="Administra las opciones disponibles en el formulario de reportes."
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
                            Nombre del tipo
                        </label>

                        <input
                            id="nombre"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={manejarCambio}
                            placeholder="Ej. Sensor descalibrado"
                            disabled={guardando}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700">
                                <Tag size={20} />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Tipo disponible
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Visible en formularios y filtros.
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
                                Guardar tipo
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default TipoFallaModal;
