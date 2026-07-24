import {
    AlertCircle,
    Eye,
    EyeOff,
    KeyRound
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import Modal from '../../components/ui/Modal';

import {
    cambiarPasswordUsuario
} from '../../services/usuarios.service';

function PasswordModal({
    abierto,
    usuario,
    onCerrar
}) {
    const [password, setPassword] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [mostrar, setMostrar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (abierto) {
            setPassword('');
            setConfirmacion('');
            setMostrar(false);
            setError('');
        }
    }, [abierto]);

    async function manejarEnvio(evento) {
        evento.preventDefault();

        if (password.length < 8) {
            setError(
                'La contraseña debe tener al menos 8 caracteres.'
            );
            return;
        }

        if (password !== confirmacion) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        try {
            setGuardando(true);
            setError('');

            await cambiarPasswordUsuario(
                usuario.id,
                password
            );

            window.alert(
                'Contraseña actualizada correctamente.'
            );

            onCerrar();
        } catch (errorSolicitud) {
            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cambiar la contraseña.'
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="max-w-lg"
            titulo="Cambiar contraseña"
            descripcion={
                usuario
                    ? `Define una nueva contraseña para ${usuario.nombre}.`
                    : ''
            }
        >
            <form onSubmit={manejarEnvio}>
                <div className="space-y-5 p-6">
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
                            htmlFor="nuevaPassword"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Nueva contraseña
                        </label>

                        <div className="relative">
                            <input
                                id="nuevaPassword"
                                type={
                                    mostrar
                                        ? 'text'
                                        : 'password'
                                }
                                value={password}
                                onChange={(evento) => {
                                    setPassword(evento.target.value);
                                    setError('');
                                }}
                                disabled={guardando}
                                autoComplete="new-password"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setMostrar(
                                        (actual) => !actual
                                    )
                                }
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                                {mostrar ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="confirmacionPassword"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Confirmar contraseña
                        </label>

                        <input
                            id="confirmacionPassword"
                            type={
                                mostrar
                                    ? 'text'
                                    : 'password'
                            }
                            value={confirmacion}
                            onChange={(evento) => {
                                setConfirmacion(
                                    evento.target.value
                                );

                                setError('');
                            }}
                            disabled={guardando}
                            autoComplete="new-password"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
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
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                        {guardando ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <KeyRound size={18} />
                                Cambiar contraseña
                            </>
                        )}
                    </button>
                </footer>
            </form>
        </Modal>
    );
}

export default PasswordModal;