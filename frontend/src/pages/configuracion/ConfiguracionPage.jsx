import {
    Bell,
    Building2,
    CheckCircle2,
    Clock3,
    Database,
    Mail,
    Monitor,
    RotateCcw,
    Save,
    Send,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Tag,
    Users
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    Link
} from 'react-router';

import {
    obtenerAreas,
    obtenerLineas,
    obtenerTiposFalla,
    obtenerTurnos,
    obtenerUnidadesNegocio
} from '../../services/catalogos.service';

import useAuth from '../../hooks/useAuth';

import {
    obtenerUsuarios
} from '../../services/usuarios.service';

import {
    validarRutaVideos
} from '../../services/videos.service';

import {
    enviarResumenDiarioPrueba,
    guardarConfiguracionGeneral,
    guardarConfiguracionTv,
    guardarConfigEnvioDiario as guardarConfigEnvioDiarioServidor,
    obtenerConfigEnvioDiario,
    obtenerConfiguracionGeneral,
    obtenerConfiguracionTv
} from '../../services/configuracion.service';

import {
    cargarConfiguracion,
    configuracionInicial,
    guardarConfiguracion as guardarConfiguracionLocal,
    prioridadesConfiguracion,
    zonasHorariasConfiguracion
} from '../../utils/configuracion';

function ConfiguracionPage() {
    const { usuario } = useAuth();
    const esSuperAdmin = usuario?.rol === 'super_admin';
    const [configuracion, setConfiguracion] = useState(
        cargarConfiguracion
    );
    const [guardado, setGuardado] = useState(false);
    const [guardadoEnvio, setGuardadoEnvio] = useState(false);
    const [enviandoPrueba, setEnviandoPrueba] = useState(false);
    const [validandoVideos, setValidandoVideos] = useState(false);
    const [resultadoVideos, setResultadoVideos] = useState(null);
    const [unidadTvId, setUnidadTvId] = useState(
        usuario?.unidad_negocio_id || ''
    );
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [errorEnvio, setErrorEnvio] = useState('');
    const [envioDiario, setEnvioDiario] = useState({
        activo: false,
        hora_envio: '17:00',
        destinatarios: []
    });
    const [catalogos, setCatalogos] = useState({
        areas: [],
        lineas: [],
        turnos: [],
        tiposFalla: [],
        usuarios: [],
        unidadesNegocio: []
    });

    useEffect(() => {
        async function cargarCatalogos() {
            try {
                setCargando(true);
                setError('');

                const [
                    respuestaAreas,
                    respuestaLineas,
                    respuestaTurnos,
                    respuestaTiposFalla,
                    respuestaUsuarios,
                    respuestaUnidades,
                    respuestaEnvioDiario,
                    respuestaConfiguracionGeneral,
                    respuestaConfiguracionTv
                ] = await Promise.all([
                    obtenerAreas(),
                    obtenerLineas(),
                    obtenerTurnos(),
                    obtenerTiposFalla(),
                    obtenerUsuarios(),
                    esSuperAdmin
                        ? obtenerUnidadesNegocio()
                        : Promise.resolve({ data: [] }),
                    obtenerConfigEnvioDiario(),
                    obtenerConfiguracionGeneral(),
                    obtenerConfiguracionTv(usuario?.unidad_negocio_id)
                ]);

                const configuracionServidor = {
                    ...configuracionInicial,
                    ...(respuestaConfiguracionGeneral.data || {}),
                    ...(respuestaConfiguracionTv.data || {})
                };

                setConfiguracion(configuracionServidor);
                guardarConfiguracionLocal(configuracionServidor);

                setCatalogos({
                    areas: respuestaAreas.data || [],
                    lineas: respuestaLineas.data || [],
                    turnos: respuestaTurnos.data || [],
                    tiposFalla:
                        respuestaTiposFalla.data || [],
                    usuarios: respuestaUsuarios.data || [],
                    unidadesNegocio:
                        respuestaUnidades.data || []
                });

                setEnvioDiario({
                    activo:
                        respuestaEnvioDiario.data?.activo || false,
                    hora_envio:
                        respuestaEnvioDiario.data?.hora_envio ||
                        '17:00',
                    destinatarios:
                        respuestaEnvioDiario.data?.destinatarios ||
                        []
                });
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar configuración:',
                    errorSolicitud
                );

                setError(
                    errorSolicitud.response?.data?.message ||
                    'No fue posible cargar el resumen del sistema.'
                );
            } finally {
                setCargando(false);
            }
        }

        cargarCatalogos();
    }, [esSuperAdmin, usuario?.unidad_negocio_id]);

    async function cambiarUnidadTv(evento) {
        const id = Number(evento.target.value);
        setUnidadTvId(id);
        setResultadoVideos(null);
        try {
            const respuesta = await obtenerConfiguracionTv(id);
            setConfiguracion((actual) => ({
                ...actual,
                ...(respuesta.data || {})
            }));
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar la configuracion TV de la unidad.'
            );
        }
    }

    const resumen = useMemo(
        () => {
            const elementos = [
            {
                titulo: 'Usuarios',
                valor: catalogos.usuarios.length,
                activos: catalogos.usuarios.filter(
                    (usuario) => usuario.activo
                ).length,
                ruta: '/usuarios',
                icono: Users
            },
            {
                titulo: 'Áreas',
                valor: catalogos.areas.length,
                activos: catalogos.areas.filter(
                    (area) => area.activo
                ).length,
                ruta: '/areas',
                icono: ShieldCheck
            },
            {
                titulo: 'Líneas',
                valor: catalogos.lineas.length,
                activos: catalogos.lineas.filter(
                    (linea) => linea.activo
                ).length,
                ruta: '/lineas',
                icono: Database
            },
            {
                titulo: 'Turnos',
                valor: catalogos.turnos.length,
                activos: catalogos.turnos.filter(
                    (turno) => turno.activo
                ).length,
                ruta: '/turnos',
                icono: Clock3
            },
            {
                titulo: 'Tipos de falla',
                valor: catalogos.tiposFalla.length,
                activos: catalogos.tiposFalla.filter(
                    (tipo) => tipo.activo
                ).length,
                ruta: '/tipos-falla',
                icono: Tag
            }
        ];

            if (esSuperAdmin) {
                elementos.push({
                    titulo: 'Unidades',
                    valor: catalogos.unidadesNegocio.length,
                    activos: catalogos.unidadesNegocio.filter(
                        (unidad) => unidad.activo
                    ).length,
                    ruta: '/unidades-negocio',
                    icono: Building2
                });
            }

            return elementos;
        },
        [catalogos, esSuperAdmin]
    );
    const usuariosConCorreo = useMemo(
        () =>
            catalogos.usuarios.filter(
                (item) => item.activo && item.correo
            ),
        [catalogos.usuarios]
    );

    function manejarCambio(evento) {
        const {
            name,
            type,
            checked,
            value
        } = evento.target;

        setGuardado(false);
        setConfiguracion((actual) => ({
            ...actual,
            [name]:
                type === 'checkbox'
                    ? checked
                    : type === 'number'
                        ? Number(value)
                        : value
        }));
    }

    function manejarCambioEnvio(evento) {
        const {
            name,
            type,
            checked,
            value
        } = evento.target;

        setGuardadoEnvio(false);
        setErrorEnvio('');
        setEnvioDiario((actual) => ({
            ...actual,
            [name]: type === 'checkbox'
                ? checked
                : value
        }));
    }

    function manejarDestinatario(usuarioId, seleccionado) {
        setGuardadoEnvio(false);
        setErrorEnvio('');
        setEnvioDiario((actual) => {
            const actuales = new Set(actual.destinatarios);

            if (seleccionado) {
                actuales.add(usuarioId);
            } else {
                actuales.delete(usuarioId);
            }

            return {
                ...actual,
                destinatarios: [...actuales]
            };
        });
    }

    async function guardarConfiguracion(evento) {
        evento.preventDefault();

        try {
            setErrorEnvio('');
            await guardarConfiguracionGeneral(configuracion);

            await guardarConfiguracionTv({
                unidad_negocio_id: unidadTvId,
                mostrarVideosTv: configuracion.mostrarVideosTv,
                mostrarCerradasTv: configuracion.mostrarCerradasTv,
                refrescoTv: configuracion.refrescoTv
            });

            await guardarConfigEnvioDiarioServidor(envioDiario);

            const respuestaSesion = await obtenerConfiguracionGeneral();
            guardarConfiguracionLocal({
                ...configuracionInicial,
                ...(respuestaSesion.data || {})
            });

            setGuardado(true);
            setGuardadoEnvio(true);
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar configuracion:',
                errorSolicitud
            );

            setErrorEnvio(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar el envio automatico.'
            );
        }
    }

    async function validarCarpetaVideos() {
        try {
            setValidandoVideos(true);
            setResultadoVideos(null);
            setErrorEnvio('');

            const respuesta = await validarRutaVideos(
                configuracion.rutaVideos || '',
                unidadTvId
            );
            const rutaAplicada = respuesta.data?.ruta || '';
            const siguiente = {
                ...configuracion,
                rutaVideos: rutaAplicada
            };

            setConfiguracion(siguiente);
            if (Number(unidadTvId) === Number(usuario?.unidad_negocio_id)) {
                guardarConfiguracionLocal(siguiente);
            }
            setResultadoVideos({
                correcto: true,
                mensaje: respuesta.message
            });
        } catch (errorSolicitud) {
            setResultadoVideos({
                correcto: false,
                mensaje:
                    errorSolicitud.response?.data?.message ||
                    'No fue posible validar la carpeta.'
            });
        } finally {
            setValidandoVideos(false);
        }
    }

    async function probarEnvioDiario() {
        try {
            setEnviandoPrueba(true);
            setErrorEnvio('');

            await guardarConfigEnvioDiarioServidor(envioDiario);
            await enviarResumenDiarioPrueba();

            setGuardadoEnvio(true);
            window.alert('Resumen diario enviado correctamente.');
        } catch (errorSolicitud) {
            console.error(
                'Error al enviar resumen diario:',
                errorSolicitud
            );

            setErrorEnvio(
                errorSolicitud.response?.data?.message ||
                'No fue posible enviar el resumen diario.'
            );
        } finally {
            setEnviandoPrueba(false);
        }
    }

    function restaurarValores() {
        const confirmado = window.confirm(
            '¿Deseas restaurar la configuración básica?'
        );

        if (!confirmado) {
            return;
        }

        setConfiguracion(configuracionInicial);
        guardarConfiguracionLocal(configuracionInicial);
        setGuardado(true);
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6">
            {error && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {resumen.map((item) => {
                    const Icono = item.icono;

                    return (
                        <Link
                            key={item.titulo}
                            to={item.ruta}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">
                                        {item.titulo}
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-slate-950">
                                        {cargando
                                            ? '--'
                                            : item.valor}
                                    </p>
                                </div>

                                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Icono size={22} />
                                </div>
                            </div>

                            <p className="mt-4 text-sm text-slate-500">
                                {cargando
                                    ? 'Cargando...'
                                    : `${item.activos} activo(s)`}
                            </p>
                        </Link>
                    );
                })}
            </section>

            <form
                onSubmit={guardarConfiguracion}
                className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
            >
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Settings size={21} />
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Datos generales
                            </h2>

                            <p className="text-sm text-slate-500">
                                Identidad y comportamiento base del sistema.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <CampoTexto
                            label="Nombre del sistema"
                            name="nombreSistema"
                            value={configuracion.nombreSistema}
                            onChange={manejarCambio}
                        />

                        <CampoTexto
                            label="Empresa"
                            name="empresa"
                            value={configuracion.empresa}
                            onChange={manejarCambio}
                        />

                        <CampoSelect
                            label="Zona horaria"
                            name="zonaHoraria"
                            value={configuracion.zonaHoraria}
                            onChange={manejarCambio}
                            opciones={zonasHorariasConfiguracion}
                        />

                        <CampoSelect
                            label="Prioridad por defecto"
                            name="prioridadDefault"
                            value={configuracion.prioridadDefault}
                            onChange={manejarCambio}
                            opciones={prioridadesConfiguracion}
                        />

                        {esSuperAdmin && (
                            <label className="md:col-span-2">
                                <span className="mb-2 block text-sm font-bold text-slate-700">
                                    Unidad para configurar la vista TV
                                </span>
                                <select
                                    value={unidadTvId}
                                    onChange={cambiarUnidadTv}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                                >
                                    {catalogos.unidadesNegocio.map((unidad) => (
                                        <option key={unidad.id} value={unidad.id}>
                                            {unidad.nombre}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-slate-500">
                                    Los cambios de videos, refresco y contenido TV se aplican solo a esta unidad.
                                </p>
                            </label>
                        )}

                        <div className="md:col-span-2">
                            <CampoTexto
                                label="Carpeta de videos en el servidor"
                                name="rutaVideos"
                                value={configuracion.rutaVideos || ''}
                                onChange={manejarCambio}
                                placeholder="Ejemplo: D:\\Videos\\Tablero"
                            />
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                Si se deja vacía se utiliza la carpeta de videos incluida con el sistema. Se reproducen todos los archivos MP4, WebM, OGG y MOV encontrados.
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={validarCarpetaVideos}
                                    disabled={validandoVideos}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                >
                                    <Monitor size={16} />
                                    {validandoVideos
                                        ? 'Revisando carpeta...'
                                        : 'Validar y aplicar'}
                                </button>

                                {resultadoVideos && (
                                    <p className={[
                                        'text-sm font-semibold',
                                        resultadoVideos.correcto
                                            ? 'text-emerald-700'
                                            : 'text-red-600'
                                    ].join(' ')}>
                                        {resultadoVideos.mensaje}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                            <SlidersHorizontal size={21} />
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Parámetros operativos
                            </h2>

                            <p className="text-sm text-slate-500">
                                Tiempos guía para seguimiento y pantallas.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                        <CampoNumero
                            label="Primera respuesta"
                            ayuda="minutos"
                            name="tiempoPrimeraRespuesta"
                            value={configuracion.tiempoPrimeraRespuesta}
                            min={1}
                            onChange={manejarCambio}
                        />

                        <CampoNumero
                            label="Resolución esperada"
                            ayuda="minutos"
                            name="tiempoResolucion"
                            value={configuracion.tiempoResolucion}
                            min={1}
                            onChange={manejarCambio}
                        />

                        <CampoNumero
                            label="Refresco vista TV"
                            ayuda="segundos"
                            name="refrescoTv"
                            value={configuracion.refrescoTv}
                            min={5}
                            onChange={manejarCambio}
                        />
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
                            <Bell size={21} />
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Avisos y tablero
                            </h2>

                            <p className="text-sm text-slate-500">
                                Preferencias compartidas para alertas y TV.
                            </p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        <Toggle
                            label="Notificaciones en pantalla"
                            descripcion="Mostrar avisos visuales de cambios importantes."
                            name="notificacionesPantalla"
                            checked={
                                configuracion.notificacionesPantalla
                            }
                            onChange={manejarCambio}
                        />

                        <Toggle
                            label="Sonido en alertas críticas"
                            descripcion="Reproducir sonido cuando se registre una prioridad crítica."
                            name="sonidoAlertas"
                            checked={configuracion.sonidoAlertas}
                            onChange={manejarCambio}
                        />

                        <Toggle
                            label="Resumen diario"
                            descripcion="Preparar indicadores para revisión de cierre de turno."
                            name="resumenDiario"
                            checked={configuracion.resumenDiario}
                            onChange={manejarCambio}
                        />

                        <Toggle
                            label="Mostrar videos en TV"
                            descripcion="Alternar entre tablero con videos o incidencias a todo lo ancho."
                            name="mostrarVideosTv"
                            checked={configuracion.mostrarVideosTv}
                            onChange={manejarCambio}
                        />

                        <Toggle
                            label="Mostrar cerradas en TV"
                            descripcion="Incluir incidencias cerradas en la pantalla de monitoreo."
                            name="mostrarCerradasTv"
                            checked={configuracion.mostrarCerradasTv}
                            onChange={manejarCambio}
                        />
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Mail size={21} />
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Envío automático
                            </h2>

                            <p className="text-sm text-slate-500">
                                Resumen diario por correo para cierre operativo.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_170px]">
                        <Toggle
                            label="Enviar resumen diario"
                            descripcion="Se enviará el reporte una vez al día."
                            name="activo"
                            checked={envioDiario.activo}
                            onChange={manejarCambioEnvio}
                        />

                        <CampoTexto
                            label="Hora"
                            name="hora_envio"
                            type="time"
                            value={envioDiario.hora_envio}
                            onChange={manejarCambioEnvio}
                        />
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-bold text-slate-700">
                            Destinatarios
                        </p>

                        <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                            {usuariosConCorreo.length > 0 ? (
                                usuariosConCorreo.map((item) => (
                                    <label
                                        key={item.id}
                                        className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-bold text-slate-950">
                                                {item.nombre}
                                            </span>

                                            <span className="block truncate text-xs text-slate-500">
                                                {item.correo}
                                            </span>
                                        </span>

                                        <input
                                            type="checkbox"
                                            checked={envioDiario.destinatarios.includes(
                                                item.id
                                            )}
                                            onChange={(evento) =>
                                                manejarDestinatario(
                                                    item.id,
                                                    evento.target.checked
                                                )
                                            }
                                            className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                        />
                                    </label>
                                ))
                            ) : (
                                <div className="p-4 text-sm text-slate-500">
                                    No hay usuarios activos con correo registrado.
                                </div>
                            )}
                        </div>
                    </div>

                    {errorEnvio && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {errorEnvio}
                        </div>
                    )}

                    {guardadoEnvio && (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                            Envío automático guardado.
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={probarEnvioDiario}
                        disabled={enviandoPrueba}
                        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <Send size={16} />
                        {enviandoPrueba
                            ? 'Enviando...'
                            : 'Enviar prueba'}
                    </button>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700">
                            <Monitor size={21} />
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-950">
                                Estado de configuración
                            </h2>

                            <p className="text-sm text-slate-500">
                                Los cambios se guardan centralmente en la DB.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-500">
                            Configuración activa
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-950">
                            {configuracion.nombreSistema}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {configuracion.empresa}
                        </p>
                    </div>

                    {guardado && (
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                            <CheckCircle2 size={18} />
                            Configuración guardada.
                        </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                        >
                            <Save size={18} />
                            Guardar cambios
                        </button>

                        <button
                            type="button"
                            onClick={restaurarValores}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            <RotateCcw size={18} />
                            Restaurar
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}

function CampoTexto({
    label,
    ...props
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
            </span>

            <input
                {...props}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
            />
        </label>
    );
}

function CampoNumero({
    label,
    ayuda,
    ...props
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
            </span>

            <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10">
                <input
                    {...props}
                    type="number"
                    className="min-w-0 flex-1 bg-transparent px-4 outline-none"
                />

                <span className="grid place-items-center border-l border-slate-200 px-4 text-sm font-semibold text-slate-500">
                    {ayuda}
                </span>
            </div>
        </label>
    );
}

function CampoSelect({
    label,
    opciones,
    ...props
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
            </span>

            <select
                {...props}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
            >
                {Object.entries(opciones).map(
                    ([valor, etiqueta]) => (
                        <option
                            key={valor}
                            value={valor}
                        >
                            {etiqueta}
                        </option>
                    )
                )}
            </select>
        </label>
    );
}

function Toggle({
    label,
    descripcion,
    name,
    checked,
    onChange
}) {
    return (
        <label className="flex items-center justify-between gap-4 py-4">
            <span>
                <span className="block font-bold text-slate-900">
                    {label}
                </span>

                <span className="mt-1 block text-sm text-slate-500">
                    {descripcion}
                </span>
            </span>

            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
        </label>
    );
}

export default ConfiguracionPage;
