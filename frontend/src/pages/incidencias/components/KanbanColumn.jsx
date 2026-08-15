import {
    CircleDashed
} from 'lucide-react';

import IncidenciaCard from './IncidenciaCard';

function KanbanColumn({
    titulo,
    descripcion,
    incidencias,
    icono: Icono,
    estiloIcono,
    estiloContador,
    onSeleccionar
}) {
    return (
        <section className="flex h-[580px] min-h-[420px] min-w-[270px] max-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-100/70">
            <header className="shrink-0 border-b border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className={[
                                'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                                estiloIcono
                            ].join(' ')}
                        >
                            <Icono size={20} />
                        </div>

                        <div className="min-w-0">
                            <h3 className="font-bold text-slate-900">
                                {titulo}
                            </h3>

                            <p className="truncate text-xs text-slate-500">
                                {descripcion}
                            </p>
                        </div>
                    </div>

                    <span
                        className={[
                            'rounded-full px-2.5 py-1 text-xs font-bold',
                            estiloContador
                        ].join(' ')}
                    >
                        {incidencias.length}
                    </span>
                </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
                {incidencias.length === 0 ? (
                    <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 text-center">
                        <div>
                            <CircleDashed
                                size={34}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                                No hay incidencias
                            </p>
                        </div>
                    </div>
                ) : (
                    incidencias.map((incidencia) => (
                        <IncidenciaCard
                            key={incidencia.id}
                            incidencia={incidencia}
                            onSeleccionar={onSeleccionar}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export default KanbanColumn;
