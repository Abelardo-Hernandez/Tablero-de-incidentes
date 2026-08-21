import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const DURACION_ENTRADA = 430;
const DURACION_SALIDA = 350;

let bloqueosActivos = 0;
let estilosOriginalesBody = null;

function bloquearDesplazamiento() {
    if (bloqueosActivos === 0) {
        const anchoBarra = Math.max(
            0,
            window.innerWidth - document.documentElement.clientWidth
        );

        estilosOriginalesBody = {
            overflow: document.body.style.overflow,
            paddingRight: document.body.style.paddingRight
        };

        if (anchoBarra > 0) {
            const paddingActual = Number.parseFloat(
                window.getComputedStyle(document.body).paddingRight
            ) || 0;

            document.body.style.paddingRight =
                `${paddingActual + anchoBarra}px`;
        }

        document.body.style.overflow = 'hidden';
    }

    bloqueosActivos += 1;

    return () => {
        bloqueosActivos = Math.max(0, bloqueosActivos - 1);

        if (bloqueosActivos === 0 && estilosOriginalesBody) {
            document.body.style.overflow =
                estilosOriginalesBody.overflow;
            document.body.style.paddingRight =
                estilosOriginalesBody.paddingRight;
            estilosOriginalesBody = null;
        }
    };
}

function Modal({
    abierto,
    titulo,
    descripcion,
    onCerrar,
    children,
    ancho = 'max-w-2xl'
}) {
    const [renderizado, setRenderizado] = useState(abierto);
    const [visible, setVisible] = useState(false);
    const temporizadorRef = useRef(null);
    const onCerrarRef = useRef(onCerrar);

    onCerrarRef.current = onCerrar;

    useEffect(() => {
        window.clearTimeout(temporizadorRef.current);

        if (abierto) {
            setRenderizado(true);
            let segundoCuadro;
            const primerCuadro = window.requestAnimationFrame(() => {
                segundoCuadro = window.requestAnimationFrame(() => {
                    setVisible(true);
                });
            });

            return () => {
                window.cancelAnimationFrame(primerCuadro);
                window.cancelAnimationFrame(segundoCuadro);
            };
        }

        setVisible(false);
        temporizadorRef.current = window.setTimeout(() => {
            setRenderizado(false);
        }, DURACION_SALIDA);

        return () => window.clearTimeout(temporizadorRef.current);
    }, [abierto]);

    useEffect(() => {
        if (!renderizado) {
            return undefined;
        }

        function cerrarConEscape(evento) {
            if (evento.key === 'Escape') {
                onCerrarRef.current();
            }
        }

        document.addEventListener('keydown', cerrarConEscape);
        const desbloquearDesplazamiento = bloquearDesplazamiento();

        return () => {
            document.removeEventListener(
                'keydown',
                cerrarConEscape
            );

            desbloquearDesplazamiento();
        };
    }, [renderizado]);

    if (!renderizado) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="Cerrar modal"
                onClick={onCerrar}
                className={[
                    'absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity',
                    visible ? 'opacity-100' : 'opacity-0'
                ].join(' ')}
                style={{
                    transitionDuration: `${visible
                        ? DURACION_ENTRADA
                        : DURACION_SALIDA}ms`,
                    transitionTimingFunction: 'ease-out'
                }}
            />

            <section
                role="dialog"
                aria-modal="true"
                className={[
                    'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_32px_90px_rgba(2,8,23,0.38)] transition-[opacity,transform] motion-reduce:transform-none motion-reduce:transition-none',
                    visible ? 'opacity-100' : 'opacity-0',
                    ancho
                ].join(' ')}
                style={{
                    transitionDuration: `${visible
                        ? DURACION_ENTRADA
                        : DURACION_SALIDA}ms`,
                    transitionTimingFunction: visible
                        ? 'cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'cubic-bezier(0.4, 0, 0.8, 0.25)',
                    transformOrigin: 'center top',
                    transform: visible
                        ? 'perspective(1200px) translateY(0) rotateX(0deg) scale(1)'
                        : 'perspective(1200px) translateY(34px) rotateX(-8deg) scale(0.955)'
                }}
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
