import {
    AlertCircle,
    Save,
    UserPlus
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';

import {
    actualizarUsuario,
    crearUsuario
} from '../../services/usuarios.service';

const formularioInicial = {
    nombre: '',
    usuario: '',
    correo: '',
    password: '',
    rol: 'usuario',
    area_id: '',
    linea_id: '',
    es_lider: false,
    activo: true
};

function UsuarioModal({
    abierto,
    usuarioEditar,
    areas,
    lineas,
    onCerrar,
    onGuardado
}) {
    const editando = Boolean(usuarioEditar?.id);

    const [formulario, setFormulario] =
        useState(formularioInicial);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto) {
            return;
        }

        if (usuarioEditar) {
            setFormulario({
                nombre: usuarioEditar.nombre || '',
                usuario: usuarioEditar.usuario || '',
                correo: usuarioEditar.correo || '',
                password: '',
                rol: usuarioEditar.rol || 'usuario',
                area_id: usuarioEditar.area_id || '',
                linea_id: usuarioEditar.linea_id || '',
                es_lider: Boolean(usuarioEditar.es_lider),
                activo: Boolean(usuarioEditar.activo)
            });
        } else {
            setFormulario(formularioInicial);
        }

        setError('');
    }, [abierto, usuarioEditar]);

    const areaSeleccionada = useMemo(
        () =>
            areas.find(
                (area) =>
                    Number(area.id) ===
                    Number(formulario.area_id)
            ),
        [areas, formulario.area_id]
    );

    const esProduccion = useMemo(() => {
        const nombre =
            areaSeleccionada?.nombre
                ?.trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

        return nombre === 'produccion';
    }, [areaSeleccionada]);

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

        if (
            !formulario.nombre.trim() ||
            !formulario.usuario.trim()
        ) {
            setError(
                'El nombre y el usuario son obligatorios.'
            );
            return;
        }

        if (
            !editando &&
            formulario.password.length < 8
        ) {
            setError(
                'La contraseña debe tener al menos 8 caracteres.'
            );
            return;
        }

        if (
            formulario.correo &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formulario.correo.trim()
            )
        ) {
            setError('El correo no tiene un formato válido.');
            return;
        }

        if (
            formulario.rol === 'usuario' &&
            !formulario.area_id
        ) {
            setError(
                'Debes seleccionar el área del usuario.'
            );
            return;
        }

        if (
            formulario.rol === 'usuario' &&
            esProduccion &&
            !formulario.linea_id
        ) {
            setError(
                'La línea es obligatoria para usuarios de Producción.'
            );
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            usuario: formulario.usuario.trim(),
            correo: formulario.correo.trim() || null,
            rol: formulario.rol,
            area_id: formulario.area_id
                ? Number(formulario.area_id)
                : null,
            linea_id: formulario.linea_id
                ? Number(formulario.linea_id)
                : null,
            es_lider: formulario.es_lider,
            activo: formulario.activo
        };

        if (!editando) {
            datos.password = formulario.password;
        }

        try {
            setGuardando(true);
            setError('');

            if (editando) {
                await actualizarUsuario(
                    usuarioEditar.id,
                    datos
                );
            } else {
                await crearUsuario(datos);
            }

            await onGuardado();
            onCerrar();
        } catch (errorSolicitud) {
            console.error(
                'Error al guardar usuario:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible guardar el usuario.'
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
                    ? 'Editar usuario'
                    : 'Registrar usuario'
            }
            descripcion={
                editando
                    ? 'Actualiza los datos, permisos y asignaciones.'
                    : 'Agrega un nuevo integrante al Centro de incidencias.'
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

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="nombre"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Nombre completo
                            </label>

                            <input
                                id="nombre"
                                name="nombre"
                                value={formulario.nombre}
                                onChange={manejarCambio}
                                placeholder="Ej. Carlos Hernández"
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="usuario"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Usuario
                            </label>

                            <input
                                id="usuario"
                                name="usuario"
                                value={formulario.usuario}
                                onChange={manejarCambio}
                                placeholder="Ej. carlos.mecanico"
                                disabled={guardando}
                                autoComplete="off"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="correo"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Correo
                            </label>

                            <input
                                id="correo"
                                name="correo"
                                type="email"
                                value={formulario.correo}
                                onChange={manejarCambio}
                                placeholder="Ej. carlos@empresa.com"
                                disabled={guardando}
                                autoComplete="email"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />
                        </div>

                        {!editando && (
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Contraseña inicial
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formulario.password}
                                    onChange={manejarCambio}
                                    placeholder="Mínimo 8 caracteres"
                                    disabled={guardando}
                                    autoComplete="new-password"
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                                />
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="rol"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Rol
                            </label>

                            <select
                                id="rol"
                                name="rol"
                                value={formulario.rol}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="usuario">
                                    Usuario
                                </option>

                                <option value="administrador">
                                    Administrador
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="area_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Área
                            </label>

                            <select
                                id="area_id"
                                name="area_id"
                                value={formulario.area_id}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            >
                                <option value="">
                                    Sin área asignada
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
                                {esProduccion && (
                                    <span className="ml-1 text-red-500">
                                        *
                                    </span>
                                )}
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
                                    No aplica
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

                            {esProduccion && (
                                <p className="mt-2 text-xs text-amber-700">
                                    Los usuarios de Producción deben
                                    tener una línea asignada.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white p-4">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Líder de área
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Puede asignar incidencias.
                                </p>
                            </div>

                            <input
                                name="es_lider"
                                type="checkbox"
                                checked={formulario.es_lider}
                                onChange={manejarCambio}
                                disabled={guardando}
                                className="h-5 w-5 accent-emerald-600"
                            />
                        </label>

                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white p-4">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Usuario activo
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Permite iniciar sesión.
                                </p>
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
                        ) : editando ? (
                            <>
                                <Save size={18} />
                                Guardar cambios
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Registrar usuario
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default UsuarioModal;
