const estilos = {
    nueva:
        'bg-emerald-50 text-emerald-700 ring-emerald-600/10',

    asignada:
        'bg-blue-50 text-blue-700 ring-blue-600/10',

    en_proceso:
        'bg-amber-50 text-amber-800 ring-amber-600/10',

    resuelta:
        'bg-teal-50 text-teal-700 ring-teal-600/10',

    cerrada:
        'bg-slate-100 text-slate-700 ring-slate-600/10',

    cancelada:
        'bg-red-50 text-red-700 ring-red-600/10'
};

const etiquetas = {
    nueva: 'Nueva',
    asignada: 'Asignada',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada'
};

function StatusBadge({
    estado
}) {
    return (
        <span
            className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset',
                estilos[estado] ||
                    estilos.cerrada
            ].join(' ')}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />

            {etiquetas[estado] || estado}
        </span>
    );
}

export default StatusBadge;