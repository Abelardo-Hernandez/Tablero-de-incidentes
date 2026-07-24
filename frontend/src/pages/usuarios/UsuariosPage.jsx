import {
    Edit3,
    KeyRound,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    UserRound,
    Users
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    cambiarEstadoUsuario,
    obtenerUsuarios
} from '../../services/usuarios.service';

import {
    obtenerAreasActivas,
    obtenerLineasActivas
} from '../../services/catalogos.service';

import PasswordModal from './PasswordModal';
import UsuarioModal from './UsuarioModal';

function UsuariosPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [areas, setAreas] = useState([]);
    const [lineas, setLineas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [modalUsuarioAbierto, setModalUsuarioAbierto] =
        useState(false);

    const [modalPasswordAbierto, setModalPasswordAbierto] =
        useState(false);

    const [usuarioSeleccionado, setUsuarioSeleccionado] =
        useState(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        activo: ''
    });

    const cargarUsuarios = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await obtenerUsuarios({
                buscar: filtros.buscar || undefined,
                activo:
                    filtros.activo !== ''
                        ? filtros.activo
                        : undefined
            });

            setUsuarios(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener usuarios:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar los usuarios.'
            );
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarUsuarios();
        }, 300);

        return () => clearTimeout(temporizador);
    }, [cargarUsuarios]);

    useEffect(() => {
        async function cargarCatalogos() {
            try {
                const [
                    respuestaAreas,
                    respuestaLineas
                ] = await Promise.all([
                    obtenerAreasActivas(),
                    obtenerLineasActivas()
                ]);

                setAreas(respuestaAreas.data || []);
                setLineas(respuestaLineas.data || []);
            } catch (errorSolicitud) {
                console.error(
                    'Error al obtener catálogos:',
                    errorSolicitud
                );
            }
        }

        cargarCatalogos();
    }, []);

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

    function abrirNuevoUsuario() {
        setUsuarioSeleccionado(null);
        setModalUsuarioAbierto(true);
    }

    function abrirEditarUsuario(usuario) {
        setUsuarioSeleccionado(usuario);
        setModalUsuarioAbierto(true);
    }

    function abrirCambioPassword(usuario) {
        setUsuarioSeleccionado(usuario);
        setModalPasswordAbierto(true);
    }

    function cerrarModalUsuario() {
        setModalUsuarioAbierto(false);
        setUsuarioSeleccionado(null);
    }

    function cerrarModalPassword() {
        setModalPasswordAbierto(false);
        setUsuarioSeleccionado(null);
    }

    async function cambiarEstado(usuario) {
        const accion = usuario.activo
            ? 'desactivar'
            : 'activar';

        const confirmado = window.confirm(
            `¿Deseas ${accion} a ${usuario.nombre}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            await cambiarEstadoUsuario(
                usuario.id,
                !usuario.activo
            );

            await cargarUsuarios();
        } catch (errorSolicitud) {
            window.alert(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar el estado.'
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
                        Usuarios del sistema
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Supervisa accesos, áreas, líneas y responsables.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={abrirNuevoUsuario}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                >
                    <Plus size={19} />
                    Nuevo usuario
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
                            placeholder="Buscar por nombre, usuario, área o línea..."
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
                            Activos
                        </option>

                        <option value="false">
                            Inactivos
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
                            <Users size={21} />
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-950">
                                Usuarios registrados
                            </h3>

                            <p className="text-sm text-slate-500">
                                {usuarios.length} resultado(s)
                            </p>
                        </div>
                    </div>
                </div>

                {cargando ? (
                    <div className="grid min-h-72 place-items-center">
                        <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                            <p className="mt-4 text-sm text-slate-500">
                                Cargando usuarios...
                            </p>
                        </div>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="grid min-h-72 place-items-center px-6 text-center">
                        <div>
                            <UserRound
                                size={44}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-bold text-slate-700">
                                No se encontraron usuarios
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Modifica los filtros o registra un usuario nuevo.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {usuarios.map((usuario) => {
                            const iniciales = usuario.nombre
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((parte) => parte[0])
                                .join('')
                                .toUpperCase();

                            return (
                                <article
                                    key={usuario.id}
                                    className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-200 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                                                {iniciales}
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className="truncate font-bold text-slate-900">
                                                    {usuario.nombre}
                                                </h4>

                                                <p className="truncate text-sm text-slate-500">
                                                    @{usuario.usuario}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={[
                                                'rounded-full px-2.5 py-1 text-xs font-bold',
                                                usuario.activo
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            ].join(' ')}
                                        >
                                            {usuario.activo
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </div>

                                    <div className="mt-5 space-y-3 border-y border-slate-100 py-4 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-400">
                                                Rol
                                            </span>

                                            <span className="font-semibold capitalize text-slate-700">
                                                {usuario.rol}
                                            </span>
                                        </div>

                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-400">
                                                Área
                                            </span>

                                            <span className="truncate font-semibold text-slate-700">
                                                {usuario.area_nombre ||
                                                    'Sin área'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-400">
                                                Línea
                                            </span>

                                            <span className="truncate font-semibold text-slate-700">
                                                {usuario.linea_nombre ||
                                                    'No aplica'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        {usuario.es_lider ? (
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                Líder de área
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                Colaborador
                                            </span>
                                        )}

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                title="Editar"
                                                onClick={() =>
                                                    abrirEditarUsuario(usuario)
                                                }
                                                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                <Edit3 size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Cambiar contraseña"
                                                onClick={() =>
                                                    abrirCambioPassword(usuario)
                                                }
                                                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                                            >
                                                <KeyRound size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                title={
                                                    usuario.activo
                                                        ? 'Desactivar'
                                                        : 'Activar'
                                                }
                                                onClick={() =>
                                                    cambiarEstado(usuario)
                                                }
                                                className={[
                                                    'grid h-9 w-9 place-items-center rounded-lg transition',
                                                    usuario.activo
                                                        ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                                                        : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                                                ].join(' ')}
                                            >
                                                {usuario.activo ? (
                                                    <ToggleRight size={21} />
                                                ) : (
                                                    <ToggleLeft size={21} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <UsuarioModal
                abierto={modalUsuarioAbierto}
                usuarioEditar={usuarioSeleccionado}
                areas={areas}
                lineas={lineas}
                onCerrar={cerrarModalUsuario}
                onGuardado={cargarUsuarios}
            />

            <PasswordModal
                abierto={modalPasswordAbierto}
                usuario={usuarioSeleccionado}
                onCerrar={cerrarModalPassword}
            />
        </div>
    );
}

export default UsuariosPage;