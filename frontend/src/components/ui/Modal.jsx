import { useEffect } from 'react';
import { X } from 'lucide-react';

function Modal({
    abierto,
    titulo,
    descripcion,
    onCerrar,
    children,
    ancho = 'max-w-2xl'
}) {
    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        function cerrarConEscape(evento) {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        }

        document.addEventListener('keydown', cerrarConEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener(
                'keydown',
                cerrarConEscape
            );

            document.body.style.overflow = '';
        };
    }, [abierto, onCerrar]);

    if (!abierto) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="Cerrar modal"
                onClick={onCerrar}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <section
                role="dialog"
                aria-modal="true"
                className={[
                    'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl',
                    ancho
                ].join(' ')}
            >
                <header className="flex items-start justify-between gap-5 border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            {titulo}
                        </h2>

                        {descripcion && (
                            <p className="mt-1 text-sm text-slate-500">
                                {descripcion}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onCerrar}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="custom-scrollbar overflow-y-auto">
                    {children}
                </div>
            </section>
        </div>
    );
}

export default Modal;