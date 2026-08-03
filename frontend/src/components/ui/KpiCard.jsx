import {
    ArrowDownRight,
    ArrowUpRight
} from 'lucide-react';

function KpiCard({
    titulo,
    valor,
    descripcion,
    variacion,
    tendencia = 'up',
    tono = 'verde'
}) {
    const estilos = {
        verde: {
            fondo: 'bg-emerald-100',
            texto: 'text-emerald-950',
            secundario: 'text-emerald-900/75',
            borde: 'border-emerald-200'
        },
        rojo: {
            fondo: 'bg-red-100',
            texto: 'text-red-950',
            secundario: 'text-red-900/75',
            borde: 'border-red-200'
        },
        ambar: {
            fondo: 'bg-amber-100',
            texto: 'text-amber-950',
            secundario: 'text-amber-900/75',
            borde: 'border-amber-200'
        },
        azul: {
            fondo: 'bg-blue-100',
            texto: 'text-blue-950',
            secundario: 'text-blue-900/75',
            borde: 'border-blue-200'
        }
    };

    const estilo =
        estilos[tono] || estilos.verde;

    const TendenciaIcono =
        tendencia === 'down'
            ? ArrowDownRight
            : ArrowUpRight;

    return (
        <article
            className={[
                'rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                estilo.fondo,
                estilo.borde
            ].join(' ')}
        >
            <div className="flex min-h-20 flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-3">
                    <p
                        className={[
                            'text-xs font-bold uppercase',
                            estilo.secundario
                        ].join(' ')}
                    >
                        {titulo}
                    </p>

                    {variacion && (
                        <span
                            className={[
                                'inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold',
                                tendencia === 'down'
                                    ? 'text-red-700'
                                    : 'text-emerald-700'
                            ].join(' ')}
                        >
                            <TendenciaIcono size={14} />
                            {variacion}
                        </span>
                    )}
                </div>

                <div>
                    <p
                        className={[
                            'text-2xl font-bold tracking-tight',
                            estilo.texto
                        ].join(' ')}
                    >
                        {valor}
                    </p>

                    <p
                        className={[
                            'mt-1 text-xs font-medium',
                            estilo.secundario
                        ].join(' ')}
                    >
                        {descripcion}
                    </p>
                </div>
            </div>
        </article>
    );
}

export default KpiCard;
