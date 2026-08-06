import {
    ArrowLeft,
    Edit3,
    KeyRound,
    Plus,
    Search,
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
    Link
} from 'react-router';

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
            <div className="flex items-start gap-3">
                <Link
                    to="/configuracion"
                    title="Volver a configuraciÃ³n"
                    aria-label="Volver a configuraciÃ³n"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                    <ArrowLeft size={20} />
                </Link>

                <section className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
                    <div className="relative">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            name="buscar"
                            value={filtros.buscar}
                            onChange={manejarFiltro}
                            placeholder="Buscar por nombre, usuario, correo, área o línea..."
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

                    <button
                        type="button"
                        onClick={abrirNuevoUsuario}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                    >
                        <Plus size={19} />
                        Nuevo usuario
                    </button>
                </div>
                </section>
            </div>

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
                    <div className="custom-scrollbar overflow-x-auto">
                        <table className="w-full min-w-[1120px] table-fixed text-left">
                            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400">
                                <tr>
                                    <th className="w-[18%] px-4 py-2.5">Usuario</th>
                                    <th className="w-[16%] px-4 py-2.5">Correo</th>
                                    <th className="w-[9%] px-4 py-2.5">Rol</th>
                                    <th className="w-[13%] px-4 py-2.5">Área</th>
                                    <th className="w-[13%] px-4 py-2.5">Línea</th>
                                    <th className="w-[12%] px-4 py-2.5">Responsabilidad</th>
                                    <th className="w-[7%] px-4 py-2.5">Estado</th>
                                    <th className="w-[12%] py-2.5 pl-4 pr-8">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {usuarios.map((usuario) => {
                                    const iniciales = usuario.nombre
                                        .split(' ')
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((parte) => parte[0])
                                        .join('')
                                        .toUpperCase();

                                    return (
                                        <tr
                                            key={usuario.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                                                        {iniciales}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-52 truncate text-sm font-bold text-slate-900">
                                                            {usuario.nombre}
                                                        </p>

                                                        <p className="truncate text-sm text-slate-500">
                                                            @{usuario.usuario}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-2.5">
                                                <p className="max-w-52 truncate text-sm font-semibold text-slate-700">
                                                    {usuario.correo ||
                                                        'Sin correo'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-2.5 text-sm font-semibold capitalize text-slate-700">
                                                {usuario.rol}
                                            </td>

                                            <td className="px-4 py-2.5">
                                                <p className="max-w-48 truncate text-sm font-semibold text-slate-700">
                                                    {usuario.area_nombre ||
                                                        'Sin área'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-2.5">
                                                <p className="max-w-48 truncate text-sm font-semibold text-slate-700">
                                                    {usuario.linea_nombre ||
                                                        'No aplica'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-2.5">
                                                {usuario.es_lider ? (
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                                        Líder de área
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-500">
                                                        Colaborador
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                                                        usuario.activo
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                    ].join(' ')}
                                                >
                                                    {usuario.activo
                                                        ? 'Activo'
                                                        : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="py-2.5 pl-4 pr-8">
                                                <div className="flex items-center justify-start gap-1">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() =>
                                                            abrirEditarUsuario(usuario)
                                                        }
                                                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Cambiar contraseña"
                                                        onClick={() =>
                                                            abrirCambioPassword(usuario)
                                                        }
                                                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                                                    >
                                                        <KeyRound size={16} />
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
                                                            'grid h-8 w-8 place-items-center rounded-lg transition',
                                                            usuario.activo
                                                                ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                                                                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                                                        ].join(' ')}
                                                    >
                                                        {usuario.activo ? (
                                                            <ToggleRight size={20} />
                                                        ) : (
                                                            <ToggleLeft size={20} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
