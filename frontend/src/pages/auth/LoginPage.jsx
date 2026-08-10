import { useEffect, useState } from 'react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Eye,
    EyeOff,
    LockKeyhole,
    ShieldCheck,
    UserRound
} from 'lucide-react';
import { useNavigate } from 'react-router';

import useAuth from '../../hooks/useAuth';

import {
    iniciarSesion,
    obtenerResumenDiarioLogin,
    obtenerToken
} from '../../services/auth.service';

function formatearMinutos(minutos) {
    if (minutos === null || minutos === undefined) {
        return 'Sin datos';
    }

    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return `${horas} h ${minutosRestantes} min`;
}

function LoginPage() {
    const navigate = useNavigate();

    const {
        usuario: usuarioAutenticado,
        cargando: cargandoSesion,
        actualizarUsuario
    } = useAuth();

    const [formulario, setFormulario] = useState({
        usuario: '',
        password: ''
    });

    const [mostrarPassword, setMostrarPassword] =
        useState(false);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [resumenDiario, setResumenDiario] = useState({
        cargando: true,
        reportesHoy: 0,
        promedioAtencionMinutos: null
    });

    function obtenerRutaInicial(usuario) {
        return usuario?.rol === 'usuario'
            ? '/incidencias'
            : '/';
    }

    useEffect(() => {
        if (
            !cargandoSesion &&
            (usuarioAutenticado || obtenerToken())
        ) {
            navigate(
                obtenerRutaInicial(usuarioAutenticado),
                { replace: true }
            );
        }
    }, [
        usuarioAutenticado,
        cargandoSesion,
        navigate
    ]);

    useEffect(() => {
        let activo = true;

        async function cargarResumenDiario() {
            try {
                const respuesta =
                    await obtenerResumenDiarioLogin();

                if (!activo) {
                    return;
                }

                setResumenDiario({
                    cargando: false,
                    reportesHoy:
                        respuesta.data?.reportes_hoy || 0,
                    promedioAtencionMinutos:
                        respuesta.data
                            ?.promedio_atencion_minutos ?? null
                });
            } catch (errorSolicitud) {
                console.warn(
                    'No fue posible cargar resumen diario:',
                    errorSolicitud
                );

                if (activo) {
                    setResumenDiario((actual) => ({
                        ...actual,
                        cargando: false
                    }));
                }
            }
        }

        cargarResumenDiario();

        return () => {
            activo = false;
        };
    }, []);

    function manejarCambio(evento) {
        const {
            name,
            value
        } = evento.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value
        }));

        if (error) {
            setError('');
        }
    }

    async function manejarEnvio(evento) {
        evento.preventDefault();

        const usuario = formulario.usuario.trim();
        const password = formulario.password;

        if (!usuario || !password) {
            setError(
                'Ingresa tu usuario y contraseña.'
            );
            return;
        }

        try {
            setCargando(true);
            setError('');

            const respuesta = await iniciarSesion({
                usuario,
                password
            });

            actualizarUsuario(respuesta.data);

            navigate(
                obtenerRutaInicial(respuesta.data),
                { replace: true }
            );
        } catch (errorSolicitud) {
            console.error(
                'Error al iniciar sesión:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible conectarse con el servidor.'
            );
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="relative h-dvh overflow-hidden bg-[#061426]">
            <div className="absolute inset-0">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="absolute -bottom-40 right-0 h-[32rem] w-[32rem] rounded-full bg-blue-500/10 blur-3xl" />

                <div
                    className="login-grid absolute inset-0 opacity-[0.1]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
                        backgroundSize: '44px 44px'
                    }}
                />
            </div>

            <div className="relative grid h-dvh lg:grid-cols-[1.15fr_0.85fr]">
                <section className="hidden h-dvh flex-col justify-between gap-8 p-8 lg:flex xl:p-12">
                    <div className="flex items-center gap-4">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
                            <Activity size={28} />
                        </div>

                        <div>
                            <p className="text-xl font-bold text-white">
                                Centro de Reportes
                            </p>

                            <p className="text-sm text-slate-400">
                                Gestión operativa en tiempo real
                            </p>
                        </div>
                    </div>

                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                            <ShieldCheck size={16} />
                            Operación efectiva
                        </span>

                        <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-5xl">
                            Respuesta 
                            <span className="text-emerald-400">
                                {' '}
                                inmediata,
                            </span>
                            <span className="text-white">
                                {' '}
                                para una producción
                            </span>
                            <span className="text-emerald-400">
                                {' '}
                                sin interrupciones.
                            </span>
                        </h1>

                        <p className="mt-5 max-w-xl text-base leading-7 text-slate-400 xl:text-lg xl:leading-8">
                            Reporta, asigna y monitorea incidentes
                            en un solo lugar.
                        </p>

                        <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                                <p className="text-2xl font-bold text-white">
                                    {resumenDiario.cargando
                                        ? '...'
                                        : resumenDiario.reportesHoy}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Reportes de hoy
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                                <p className="text-2xl font-bold text-white">
                                    {resumenDiario.cargando
                                        ? '...'
                                        : formatearMinutos(
                                            resumenDiario.promedioAtencionMinutos
                                        )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Tiempo promedio de atención
                                </p>
                            </div>

                            
                        </div>
                    </div>

                    <p className="text-sm text-slate-500">
                        Plataforma interna de gestión de incidencias
                    </p>
                </section>

                <section className="flex h-dvh items-center justify-center overflow-y-auto bg-white px-6 py-6 sm:px-10 lg:rounded-l-[2.5rem] lg:px-12 xl:px-16">
                    <div className="w-full max-w-md">
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white">
                                <Activity size={26} />
                            </div>

                            <div>
                                <p className="font-bold text-slate-900">
                                    Centro de incidencias
                                </p>

                                <p className="text-xs text-slate-500">
                                    Gestión operativa
                                </p>
                            </div>
                        </div>

                        <div className="mb-7">
                            <div className="mx-auto flex h-32 w-32 items-center justify-center">
                                <img
                                    src="/logo.png"
                                    alt="Centro de incidencias"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>

                            

                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Bienvenido
                            </h2>

                            <p className="mt-3 leading-7 text-slate-500">
                                Ingresa tus credenciales para acceder
                                al sistema.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <AlertCircle
                                    className="mt-0.5 shrink-0"
                                    size={18}
                                />

                                <span>
                                    {error}
                                </span>
                            </div>
                        )}

                        <form
                            className="space-y-5"
                            onSubmit={manejarEnvio}
                        >
                            <div>
                                <label
                                    htmlFor="usuario"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Usuario
                                </label>

                                <div className="relative">
                                    <UserRound
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={19}
                                    />

                                    <input
                                        id="usuario"
                                        name="usuario"
                                        type="text"
                                        value={formulario.usuario}
                                        onChange={manejarCambio}
                                        autoComplete="username"
                                        placeholder="Ingresa tu usuario"
                                        disabled={cargando}
                                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Contraseña
                                </label>

                                <div className="relative">
                                    <LockKeyhole
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={19}
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            mostrarPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={formulario.password}
                                        onChange={manejarCambio}
                                        autoComplete="current-password"
                                        placeholder="Ingresa tu contraseña"
                                        disabled={cargando}
                                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMostrarPassword(
                                                (actual) => !actual
                                            )
                                        }
                                        disabled={cargando}
                                        aria-label={
                                            mostrarPassword
                                                ? 'Ocultar contraseña'
                                                : 'Mostrar contraseña'
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {mostrarPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={cargando}
                                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {cargando ? (
                                    <>
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        Validando...
                                    </>
                                ) : (
                                    <>
                                        Iniciar sesión
                                        <ArrowRight size={19} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
                            <ShieldCheck size={16} />
                            Conexión protegida
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default LoginPage;
