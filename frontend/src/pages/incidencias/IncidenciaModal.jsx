import {
    AlertCircle,
    PlusCircle
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';
import useAuth from '../../hooks/useAuth';

import {
    crearIncidencia
} from '../../services/incidencias.service';

const formularioInicial = {
    titulo: '',
    descripcion: '',
    tipo: 'otro',
    prioridad: 'media',
    detuvo_linea: false,
    cantidad_afectada: '',
    area_origen_id: '',
    area_responsable_id: '',
    linea_id: '',
    turno_id: ''
};

function IncidenciaModal({
    abierto,
    areas,
    lineas,
    turnos,
    onCerrar,
    onGuardado
}) {
    const {
        usuario
    } = useAuth();

    const [formulario, setFormulario] =
        useState(formularioInicial);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        setFormulario({
            ...formularioInicial,
            area_origen_id: usuario?.area_id || ''
        });
        setError('');
    }, [abierto, usuario?.area_id]);

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

        if (!formulario.titulo.trim()) {
            setError('El título es obligatorio.');
            return;
        }

        if (!formulario.descripcion.trim()) {
            setError('La descripción es obligatoria.');
            return;
        }

        if (!formulario.area_origen_id) {
            setError('Selecciona el área origen.');
            return;
        }

        if (!formulario.area_responsable_id) {
            setError('Selecciona el área responsable.');
            return;
        }

        const datos = {
            titulo: formulario.titulo.trim(),
            descripcion: formulario.descripcion.trim(),
            tipo: formulario.tipo,
            prioridad: formulario.prioridad,
            detuvo_linea: formulario.detuvo_linea,
            cantidad_afectada: formulario.cantidad_afectada
                ? Number(formulario.cantidad_afectada)
                : null,
            area_origen_id: Number(formulario.area_origen_id),
            area_responsable_id: Number(formulario.area_responsable_id),
            linea_id: formulario.linea_id
                ? Number(formulario.linea_id)
                : null,
            turno_id: formulario.turno_id
                ? Number(formulario.turno_id)
                : null
        };

        try {
            setGuardando(true);
            setError('');

            await crearIncidencia(datos);
            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al crear incidencia:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible registrar la incidencia.'
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo="Registrar incidencia"
            descripcion="Captura el problema detectado y envíalo al área responsable."
            ancho="max-w-3xl"
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
                            htmlFor="titulo"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Título
                        </label>

                        <input
                            id="titulo"
                            name="titulo"
                            value={formulario.titulo}
                            onChange={manejarCambio}
                            placeholder="Ej. Motor principal sin respuesta"
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
                            placeholder="Describe qué ocurrió, dónde se detectó y cualquier dato relevante."
                            disabled={guardando}
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="tipo"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Tipo
                            </label>

                            <select
                                id="tipo"
                                name="tipo"
                                value={formulario.tipo}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="falla_equipo">
                                    Falla de equipo
                                </option>
                                <option value="falta_material">
                                    Falta de material
                                </option>
                                <option value="calidad">
                                    Calidad
                                </option>
                                <option value="seguridad">
                                    Seguridad
                                </option>
                                <option value="proceso">
                                    Proceso
                                </option>
                                <option value="otro">
                                    Otro
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="prioridad"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Prioridad
                            </label>

                            <select
                                id="prioridad"
                                name="prioridad"
                                value={formulario.prioridad}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="critica">
                                    Crítica
                                </option>
                                <option value="alta">
                                    Alta
                                </option>
                                <option value="media">
                                    Media
                                </option>
                                <option value="baja">
                                    Baja
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="area_origen_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Área origen
                            </label>

                            <select
                                id="area_origen_id"
                                name="area_origen_id"
                                value={formulario.area_origen_id}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="">
                                    Selecciona un área
                                </option>

                                {areas.map((area) => (
                                    <option
                                        key={area.id}
                                        value={area.id}
                                    >
                                        {area.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="area_responsable_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Área responsable
                            </label>

                            <select
                                id="area_responsable_id"
                                name="area_responsable_id"
                                value={formulario.area_responsable_id}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="">
                                    Selecciona un área
                                </option>

                                {areas.map((area) => (
                                    <option
                                        key={area.id}
                                        value={area.id}
                                    >
                                        {area.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="linea_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Línea
                            </label>

                            <select
                                id="linea_id"
                                name="linea_id"
                                value={formulario.linea_id}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="">
                                    Sin línea
                                </option>

                                {lineas.map((linea) => (
                                    <option
                                        key={linea.id}
                                        value={linea.id}
                                    >
                                        {linea.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="turno_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Turno
                            </label>

                            <select
                                id="turno_id"
                                name="turno_id"
                                value={formulario.turno_id}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="">
                                    Sin turno
                                </option>

                                {turnos.map((turno) => (
                                    <option
                                        key={turno.id}
                                        value={turno.id}
                                    >
                                        {turno.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white p-4">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Detuvo línea
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Marca si la producción se detuvo.
                                </p>
                            </div>

                            <input
                                name="detuvo_linea"
                                type="checkbox"
                                checked={formulario.detuvo_linea}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-5 w-5 accent-emerald-600"
                            />
                        </label>

                        <div>
                            <label
                                htmlFor="cantidad_afectada"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Cantidad afectada
                            </label>

                            <input
                                id="cantidad_afectada"
                                name="cantidad_afectada"
                                type="number"
                                min="0"
                                value={formulario.cantidad_afectada}
                                onChange={manejarCambio}
                                placeholder="Opcional"
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>
                    </div>
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
                                <PlusCircle size={18} />
                                Registrar incidencia
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default IncidenciaModal;
