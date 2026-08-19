import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    MessageSquarePlus,
    PlayCircle,
    Send,
    ShieldAlert,
    UserPlus,
    X,
    XCircle
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    agregarComentarioIncidencia,
    asignarIncidencia,
    cambiarEstadoIncidencia,
    cerrarIncidenciaAdministrativamente,
    obtenerIncidenciaPorId
} from '../../services/incidencias.service';

import Modal from '../../components/ui/Modal';

import {
    formatearFechaHora,
    obtenerTiempoTranscurrido
} from '../../utils/fechas';

import useAuth from '../../hooks/useAuth';

const etiquetasEstado = {
    nueva: 'Nueva',
    asignada: 'Asignada',
    en_proceso: 'En proceso',
    pendiente_confirmacion: 'Pendiente de confirmacion',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada'
};

const etiquetasPrioridad = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
};

const etiquetasTipo = {
    falla_equipo: 'Falla de equipo',
    falta_material: 'Falta de material',
    calidad: 'Calidad',
    seguridad: 'Seguridad',
    proceso: 'Proceso',
    otro: 'Otro'
};

function IncidenciaDetallePanel({
    incidencia,
    usuarios,
    abierto,
    onCerrar,
    onActualizado
}) {
    const { usuario } = useAuth();

    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [comentario, setComentario] = useState('');
    const [solucionAplicada, setSolucionAplicada] = useState('');
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [modoCancelacion, setModoCancelacion] = useState(false);
    const [responsableId, setResponsableId] = useState('');
    const [modalCierreAdministrativo, setModalCierreAdministrativo] = useState(false);
    const [motivoCierreAdministrativo, setMotivoCierreAdministrativo] = useState('');
    const [confirmacionCierreAdministrativo, setConfirmacionCierreAdministrativo] = useState(false);
    const [errorCierreAdministrativo, setErrorCierreAdministrativo] = useState('');

    useEffect(() => {
        async function cargarDetalle() {
            if (!incidencia?.id || !abierto) {
                return;
            }

            try {
                setCargando(true);
                setError('');
                setModoCancelacion(false);
                setMotivoCancelacion('');
                setModalCierreAdministrativo(false);
                setMotivoCierreAdministrativo('');
                setConfirmacionCierreAdministrativo(false);
                setErrorCierreAdministrativo('');

                const respuesta = await obtenerIncidenciaPorId(
                    incidencia.id
                );

                setDetalle(respuesta.data);
                setResponsableId(
                    respuesta.data.responsable_usuario_id || ''
                );
                setSolucionAplicada(
                    respuesta.data.solucion_aplicada || ''
                );
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar incidencia:',
                    errorSolicitud
                );

                setError(
                    errorSolicitud.response?.data?.message ||
                    'No fue posible cargar la incidencia.'
                );
            } finally {
                setCargando(false);
            }
        }

        cargarDetalle();
    }, [incidencia?.id, abierto]);

    const usuariosResponsables = useMemo(() => {
        if (
            ['administrador', 'super_admin'].includes(usuario?.rol)
        ) {
            return usuarios;
        }

        if (!detalle?.area_responsable_id) {
            return [];
        }

        return usuarios.filter(
            (candidato) =>
                Number(candidato.area_id) ===
                Number(detalle.area_responsable_id)
        );
    }, [usuarios, detalle?.area_responsable_id, usuario?.rol]);

    if (!abierto || !incidencia) {
        return null;
    }

    const incidenciaActual = detalle || incidencia;
    const esAdmin = [
        'administrador',
        'super_admin'
    ].includes(usuario?.rol);
    const puedeCierreAdministrativo =
        esAdmin &&
        !['cerrada', 'cancelada'].includes(incidenciaActual.estado);
    const pendienteConfirmacion =
        incidenciaActual.estado === 'pendiente_confirmacion';
    const puedeAsignarResponsable =
        !pendienteConfirmacion && (
            ['administrador', 'super_admin'].includes(usuario?.rol) ||
            Number(usuario?.area_id) ===
                Number(incidenciaActual.area_responsable_id)
        );
    const puedeIniciar = incidenciaActual.estado === 'asignada';
    const puedeResolver = incidenciaActual.estado === 'en_proceso';
    const puedeCapturarSolucion = [
        'asignada',
        'en_proceso'
    ].includes(incidenciaActual.estado);
    const puedeConfirmar =
        pendienteConfirmacion &&
            (
                Number(usuario?.id) ===
                    Number(incidenciaActual.usuario_creador_id) ||
                Number(usuario?.area_id) ===
                    Number(incidenciaActual.area_origen_id)
            ) &&
            Number(usuario?.id) !==
                Number(incidenciaActual.responsable_usuario_id);
    const usuarioQueAtendio =
        pendienteConfirmacion &&
        Number(usuario?.id) ===
            Number(incidenciaActual.responsable_usuario_id);
    const estadoCancelable = [
        'nueva',
        'asignada',
        'en_proceso'
    ].includes(incidenciaActual.estado);
    const puedeCancelar =
        estadoCancelable && (
            ['administrador', 'super_admin'].includes(usuario?.rol) ||
            Number(usuario?.area_id) ===
                Number(incidenciaActual.area_origen_id)
        );
    const ayudaIniciar = incidenciaActual.estado === 'nueva'
        ? 'Asigna un responsable antes de iniciar atención.'
        : 'La atención ya fue iniciada o el caso está cerrado.';

    async function refrescarDetalle() {
        const respuesta = await obtenerIncidenciaPorId(
            incidenciaActual.id
        );

        setDetalle(respuesta.data);
        setResponsableId(
            respuesta.data.responsable_usuario_id || ''
        );
        setSolucionAplicada(
            respuesta.data.solucion_aplicada || ''
        );
        await onActualizado();
    }

    async function asignar() {
        if (!responsableId) {
            setError('Selecciona un responsable.');
            return;
        }

        try {
            setGuardando(true);
            setError('');
            await asignarIncidencia(
                incidenciaActual.id,
                Number(responsableId)
            );
            await refrescarDetalle();
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible asignar la incidencia.'
            );
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(estado, datos = {}) {
        try {
            setGuardando(true);
            setError('');
            await cambiarEstadoIncidencia(
                incidenciaActual.id,
                estado,
                datos
            );
            await refrescarDetalle();
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar el estado.'
            );
        } finally {
            setGuardando(false);
        }
    }

    async function resolver() {
        if (!solucionAplicada.trim()) {
            setError('Registra la solución aplicada antes de resolver.');
            return;
        }

        try {
            setGuardando(true);
            setError('');

            if (incidenciaActual.estado === 'asignada') {
                await cambiarEstadoIncidencia(
                    incidenciaActual.id,
                    'en_proceso'
                );
            }

            await cambiarEstadoIncidencia(
                incidenciaActual.id,
                'pendiente_confirmacion',
                {
                    solucion_aplicada: solucionAplicada.trim()
                }
            );

            await refrescarDetalle();
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible resolver la incidencia.'
            );
        } finally {
            setGuardando(false);
        }
    }

    async function rechazarSolucion() {
        if (!motivoRechazo.trim()) {
            setError('Indica por que la falla continua.');
            return;
        }

        await cambiarEstado('en_proceso', {
            comentario: motivoRechazo.trim()
        });
        setMotivoRechazo('');
    }

    async function cancelarIncidencia() {
        if (!motivoCancelacion.trim()) {
            setError('Indica el motivo de la cancelacion.');
            return;
        }

        await cambiarEstado('cancelada', {
            comentario: motivoCancelacion.trim()
        });
        setMotivoCancelacion('');
        setModoCancelacion(false);
    }

    async function ejecutarCierreAdministrativo() {
        if (motivoCierreAdministrativo.trim().length < 10) {
            setErrorCierreAdministrativo('El motivo debe tener al menos 10 caracteres.');
            return;
        }

        if (!confirmacionCierreAdministrativo) {
            setErrorCierreAdministrativo('Confirma que revisaste la incidencia.');
            return;
        }

        try {
            setGuardando(true);
            setErrorCierreAdministrativo('');
            await cerrarIncidenciaAdministrativamente(
                incidenciaActual.id,
                motivoCierreAdministrativo.trim()
            );
            setModalCierreAdministrativo(false);
            setMotivoCierreAdministrativo('');
            setConfirmacionCierreAdministrativo(false);
            setErrorCierreAdministrativo('');
            await refrescarDetalle();
        } catch (errorSolicitud) {
            setErrorCierreAdministrativo(
                errorSolicitud.response?.data?.message ||
                'No fue posible realizar el cierre administrativo.'
            );
        } finally {
            setGuardando(false);
        }
    }

    async function comentar(evento) {
        evento.preventDefault();

        if (!comentario.trim()) {
            return;
        }

        try {
            setGuardando(true);
            setError('');
            await agregarComentarioIncidencia(
                incidenciaActual.id,
                comentario.trim()
            );
            setComentario('');
            await refrescarDetalle();
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible agregar el comentario.'
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[90]">
            <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={onCerrar}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <aside className="custom-scrollbar absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
                <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                                {incidenciaActual.folio ||
                                    `INC-${incidenciaActual.id}`}
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-slate-950">
                                {incidenciaActual.titulo}
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                {etiquetasEstado[incidenciaActual.estado]} · {etiquetasPrioridad[incidenciaActual.prioridad]}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onCerrar}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

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

                    {cargando ? (
                        <div className="grid min-h-80 place-items-center">
                            <div className="text-center">
                                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                                <p className="mt-4 text-sm text-slate-500">
                                    Cargando detalle...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <section className="rounded-3xl border border-slate-200 p-5">
                                <h3 className="font-bold text-slate-950">
                                    Información general
                                </h3>

                                <p className="mt-4 leading-7 text-slate-600">
                                    {incidenciaActual.descripcion}
                                </p>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <Info
                                        etiqueta="Área que reporta"
                                        valor={incidenciaActual.area_origen_nombre || 'Sin origen'}
                                    />
                                    <Info
                                        etiqueta="Área que atiende"
                                        valor={incidenciaActual.area_nombre || 'Sin área'}
                                    />
                                    <Info
                                        etiqueta="Línea"
                                        valor={incidenciaActual.linea_nombre || 'Sin línea'}
                                    />
                                    <Info
                                        etiqueta="Reporta"
                                        valor={incidenciaActual.reporta_nombre || 'Sin usuario'}
                                    />
                                    <Info
                                        etiqueta="Responsable"
                                        valor={incidenciaActual.responsable_nombre || 'Sin responsable'}
                                    />
                                    <Info
                                        etiqueta="Turno"
                                        valor={incidenciaActual.turno || 'Sin turno'}
                                    />
                                    <Info
                                        etiqueta="Tipo"
                                        valor={
                                            incidenciaActual.tipo_nombre ||
                                            etiquetasTipo[incidenciaActual.tipo] ||
                                            'Otro'
                                        }
                                    />
                                    <Info
                                        etiqueta="Detuvo línea"
                                        valor={incidenciaActual.detuvo_linea ? 'Sí' : 'No'}
                                    />
                                    <Info
                                        etiqueta="Cantidad afectada"
                                        valor={incidenciaActual.cantidad_afectada || 'No registrada'}
                                    />
                                    <Info
                                        etiqueta="Tiempo"
                                        valor={obtenerTiempoTranscurrido(incidenciaActual.fecha_creacion)}
                                    />
                                </div>

                                {incidenciaActual.solucion_aplicada && (
                                    <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                                        <p className="text-xs font-bold uppercase text-emerald-700">
                                            Solucion aplicada
                                        </p>
                                        <p className="mt-2 leading-6 text-slate-700">
                                            {incidenciaActual.solucion_aplicada}
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-3xl border border-slate-200 p-5">
                                <h3 className="font-bold text-slate-950">
                                    Responsable
                                </h3>

                                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                                    <select
                                        value={responsableId}
                                        onChange={(evento) =>
                                            setResponsableId(
                                                evento.target.value
                                            )
                                        }
                                        disabled={
                                            guardando ||
                                            !puedeAsignarResponsable
                                        }
                                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                                    >
                                        <option value="">
                                            Seleccionar responsable
                                        </option>

                                        {usuariosResponsables.map(
                                            (usuario) => (
                                                <option
                                                    key={usuario.id}
                                                    value={usuario.id}
                                                >
                                                    {usuario.nombre}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={asignar}
                                        disabled={
                                            guardando ||
                                            !puedeAsignarResponsable
                                        }
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                                    >
                                        <UserPlus size={18} />
                                        Asignar
                                    </button>
                                </div>

                                {!puedeAsignarResponsable && (
                                    <p className="mt-3 text-sm text-slate-500">
                                        Solo el área que atiende o un administrador puede asignar responsable.
                                    </p>
                                )}
                            </section>

                            <section className="rounded-3xl border border-slate-200 p-5">
                                <h3 className="font-bold text-slate-950">
                                    Acciones
                                </h3>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <Accion
                                        texto="Iniciar atencion"
                                        icono={PlayCircle}
                                        onClick={() =>
                                            cambiarEstado('en_proceso')
                                        }
                                        disabled={
                                            guardando ||
                                            !puedeIniciar
                                        }
                                        ayuda={
                                            puedeIniciar
                                                ? ''
                                                : ayudaIniciar
                                        }
                                    />
                                    <Accion
                                        texto="Cancelar reporte"
                                        icono={XCircle}
                                        onClick={() =>
                                            setModoCancelacion(true)
                                        }
                                        disabled={
                                            guardando ||
                                            !puedeCancelar
                                        }
                                        ayuda={
                                            puedeCancelar
                                                ? 'Abre el formulario para indicar el motivo.'
                                                : estadoCancelable
                                                    ? 'Solo el area que reporto o un administrador puede cancelar.'
                                                    : 'La incidencia ya esta en un estado final.'
                                        }
                                        peligro
                                    />
                                </div>

                                {puedeCancelar && modoCancelacion && (
                                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/60 p-4">
                                        <label
                                            htmlFor="motivo-cancelacion"
                                            className="text-sm font-bold text-red-900"
                                        >
                                            Motivo de cancelacion
                                        </label>
                                        <textarea
                                            id="motivo-cancelacion"
                                            value={motivoCancelacion}
                                            onChange={(evento) =>
                                                setMotivoCancelacion(evento.target.value)
                                            }
                                            rows={2}
                                            disabled={guardando}
                                            placeholder="Explica por que debe cancelarse este reporte."
                                            className="mt-3 w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                        />
                                        <p className="mt-2 text-xs text-red-700">
                                            Este texto se guardara como motivo de cancelacion. No es una accion realizada ni una solucion aplicada.
                                        </p>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModoCancelacion(false);
                                                    setMotivoCancelacion('');
                                                }}
                                                disabled={guardando}
                                                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700 disabled:opacity-60"
                                            >
                                                Volver
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelarIncidencia}
                                                disabled={
                                                    guardando ||
                                                    !motivoCancelacion.trim()
                                                }
                                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 font-bold text-white disabled:opacity-60"
                                            >
                                                <XCircle size={18} />
                                                Enviar cancelacion
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {puedeCapturarSolucion && !modoCancelacion && (
                                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                        <label
                                            htmlFor="solucion-aplicada"
                                            className="text-sm font-bold text-slate-800"
                                        >
                                            Solucion aplicada
                                        </label>
                                        <textarea
                                            id="solucion-aplicada"
                                            value={solucionAplicada}
                                            onChange={(evento) =>
                                                setSolucionAplicada(
                                                    evento.target.value
                                                )
                                            }
                                            rows={3}
                                            disabled={guardando}
                                            placeholder="Describe que se hizo para resolver la incidencia."
                                            className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                                        />
                                        <button
                                            type="button"
                                            onClick={resolver}
                                            disabled={
                                                guardando ||
                                                !solucionAplicada.trim()
                                            }
                                            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                                        >
                                            <CheckCircle2 size={18} />
                                            {puedeResolver
                                                ? 'Enviar a confirmacion'
                                                : 'Iniciar y enviar'}
                                        </button>
                                    </div>
                                )}

                                {pendienteConfirmacion && (
                                    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                                        <p className="text-sm font-bold text-violet-950">
                                            El area responsable indico que la falla fue atendida.
                                        </p>
                                        <p className="mt-1 text-sm text-violet-700">
                                            El area que reporto debe confirmar si la solucion funciono.
                                        </p>
                                        <p className="mt-2 text-xs font-semibold text-violet-600">
                                            Si no hay respuesta, se confirmara automaticamente una hora despues del envio.
                                        </p>

                                        {puedeConfirmar ? (
                                            <>
                                                <textarea
                                                    value={motivoRechazo}
                                                    onChange={(evento) => setMotivoRechazo(evento.target.value)}
                                                    rows={2}
                                                    disabled={guardando}
                                                    placeholder="Si la falla continua, explica que sigue ocurriendo."
                                                    className="mt-3 w-full resize-none rounded-xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                                />
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => cambiarEstado('cerrada')}
                                                        disabled={guardando}
                                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:opacity-60"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                        Confirmar solucion
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={rechazarSolucion}
                                                        disabled={guardando || !motivoRechazo.trim()}
                                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 font-bold text-white disabled:opacity-60"
                                                    >
                                                        <XCircle size={18} />
                                                        La falla continua
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="mt-3 text-sm font-semibold text-violet-800">
                                                Esperando confirmacion del area que reporto.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {esAdmin && (
                                    <div className="mt-5 border-t border-slate-200 pt-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                            Administracion
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setErrorCierreAdministrativo('');
                                                setModalCierreAdministrativo(true);
                                            }}
                                            disabled={
                                                guardando ||
                                                !puedeCierreAdministrativo
                                            }
                                            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            title={
                                                puedeCierreAdministrativo
                                                    ? 'Finaliza excepcionalmente esta incidencia.'
                                                    : 'La incidencia ya esta en un estado final.'
                                            }
                                        >
                                            <ShieldAlert size={18} />
                                            Cierre administrativo
                                        </button>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-3xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2">
                                    <Clock3
                                        size={18}
                                        className="text-emerald-700"
                                    />
                                    <h3 className="font-bold text-slate-950">
                                        Timeline
                                    </h3>
                                </div>

                                <div className="mt-5 space-y-4">
                                    {(incidenciaActual.historial || []).length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            Sin movimientos registrados.
                                        </p>
                                    ) : (
                                        incidenciaActual.historial.map(
                                            (evento) => (
                                                <div
                                                    key={evento.id}
                                                    className="border-l-2 border-emerald-200 pl-4"
                                                >
                                                    <p className="font-semibold text-slate-800">
                                                        {
                                                            !evento.usuario_nombre &&
                                                            evento.comentario?.includes('vencimiento del plazo')
                                                                ? 'Cerrado automaticamente por tiempo'
                                                                : evento.accion
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {formatearFechaHora(evento.fecha_creacion)} · {evento.usuario_nombre || 'Sistema'}
                                                    </p>
                                                    {evento.comentario && (
                                                        <p className="mt-2 text-sm text-slate-500">
                                                            {evento.comentario}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2">
                                    <MessageSquarePlus
                                        size={18}
                                        className="text-emerald-700"
                                    />
                                    <h3 className="font-bold text-slate-950">
                                        Comentarios
                                    </h3>
                                </div>

                                <form
                                    onSubmit={comentar}
                                    className="mt-4 flex gap-3"
                                >
                                    <input
                                        value={comentario}
                                        onChange={(evento) =>
                                            setComentario(
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Agregar comentario interno..."
                                        disabled={guardando || usuarioQueAtendio}
                                        className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                                    />
                                    <button
                                        type="submit"
                                        disabled={guardando || usuarioQueAtendio}
                                        className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-60"
                                        aria-label="Agregar comentario"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>

                                <div className="mt-5 space-y-3">
                                    {(incidenciaActual.comentarios || []).length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            Sin comentarios internos.
                                        </p>
                                    ) : (
                                        incidenciaActual.comentarios.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-2xl bg-slate-50 p-4"
                                                >
                                                    <p className="text-sm text-slate-700">
                                                        {item.comentario}
                                                    </p>
                                                    <p className="mt-2 text-xs text-slate-400">
                                                        {item.usuario_nombre || 'Usuario'} · {formatearFechaHora(item.fecha_creacion)}
                                                    </p>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </aside>

            <Modal
                abierto={modalCierreAdministrativo}
                titulo="Cerrar incidencia administrativamente"
                descripcion="Esta accion finaliza la incidencia sin completar el flujo normal de confirmacion."
                onCerrar={() => {
                    if (guardando) return;
                    setModalCierreAdministrativo(false);
                    setMotivoCierreAdministrativo('');
                    setConfirmacionCierreAdministrativo(false);
                    setErrorCierreAdministrativo('');
                }}
                ancho="max-w-xl"
            >
                <div className="space-y-5 p-6">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                            {incidenciaActual.folio || `INC-${String(incidenciaActual.id).padStart(6, '0')}`}
                        </p>
                        <p className="mt-1 font-bold text-amber-950">
                            {incidenciaActual.titulo}
                        </p>
                        <p className="mt-2 text-sm text-amber-800">
                            Estado actual: {etiquetasEstado[incidenciaActual.estado]}
                            {' · '}
                            Responsable: {incidenciaActual.responsable_nombre || 'Sin responsable'}
                        </p>
                    </div>

                    {incidenciaActual.solucion_aplicada && (
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Solucion aplicada
                            </p>
                            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                {incidenciaActual.solucion_aplicada}
                            </p>
                        </div>
                    )}

                    {errorCierreAdministrativo && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span>{errorCierreAdministrativo}</span>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="motivo-cierre-administrativo"
                            className="text-sm font-bold text-slate-800"
                        >
                            Motivo del cierre
                        </label>
                        <textarea
                            id="motivo-cierre-administrativo"
                            value={motivoCierreAdministrativo}
                            onChange={(evento) => setMotivoCierreAdministrativo(evento.target.value)}
                            rows={4}
                            maxLength={500}
                            disabled={guardando}
                            placeholder="Explica por que es necesario cerrar esta incidencia fuera del flujo normal."
                            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            Minimo 10 caracteres. Se guardara en el historial.
                        </p>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                        <input
                            type="checkbox"
                            checked={confirmacionCierreAdministrativo}
                            onChange={(evento) => setConfirmacionCierreAdministrativo(evento.target.checked)}
                            disabled={guardando}
                            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                            Confirmo que revise esta incidencia y que requiere un cierre administrativo.
                        </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                setModalCierreAdministrativo(false);
                                setMotivoCierreAdministrativo('');
                                setConfirmacionCierreAdministrativo(false);
                                setErrorCierreAdministrativo('');
                            }}
                            disabled={guardando}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 font-bold text-slate-700 disabled:opacity-60"
                        >
                            Volver
                        </button>
                        <button
                            type="button"
                            onClick={ejecutarCierreAdministrativo}
                            disabled={
                                guardando ||
                                motivoCierreAdministrativo.trim().length < 10 ||
                                !confirmacionCierreAdministrativo
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                        >
                            <ShieldAlert size={18} />
                            {guardando ? 'Cerrando...' : 'Cerrar incidencia'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function Info({
    etiqueta,
    valor
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
                {etiqueta}
            </p>
            <p className="mt-1 truncate font-semibold text-slate-800">
                {valor}
            </p>
        </div>
    );
}

function Accion({
    texto,
    icono: Icono,
    onClick,
    disabled,
    ayuda = '',
    peligro = false
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={ayuda}
            className={[
                'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
                peligro
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
            ].join(' ')}
        >
            <Icono size={18} />
            {texto}
        </button>
    );
}

export default IncidenciaDetallePanel;
