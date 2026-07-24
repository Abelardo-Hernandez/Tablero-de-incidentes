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
    icono: Icono,
    tono = 'verde'
}) {
    const estilos = {
        verde: {
            fondo: 'bg-emerald-50',
            icono: 'text-emerald-700',
            borde: 'border-emerald-100'
        },
        rojo: {
            fondo: 'bg-red-50',
            icono: 'text-red-700',
            borde: 'border-red-100'
        },
        ambar: {
            fondo: 'bg-amber-50',
            icono: 'text-amber-700',
            borde: 'border-amber-100'
        },
        azul: {
            fondo: 'bg-blue-50',
            icono: 'text-blue-700',
            borde: 'border-blue-100'
        }
    };

    const estilo =
        estilos[tono] || estilos.verde;

    const TendenciaIcono =
        tendencia === 'down'
            ? ArrowDownRight
            : ArrowUpRight;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div
                    className={[
                        'grid h-12 w-12 place-items-center rounded-2xl border',
                        estilo.fondo,
                        estilo.icono,
                        estilo.borde
                    ].join(' ')}
                >
                    <Icono size={23} />
                </div>

                {variacion && (
                    <span
                        className={[
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                            tendencia === 'down'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-emerald-50 text-emerald-700'
                        ].join(' ')}
                    >
                        <TendenciaIcono size={14} />
                        {variacion}
                    </span>
                )}
            </div>

            <p className="mt-6 text-sm font-medium text-slate-500">
                {titulo}
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                {valor}
            </p>

            <p className="mt-2 text-xs text-slate-400">
                {descripcion}
            </p>
        </article>
    );
}

export default KpiCard;