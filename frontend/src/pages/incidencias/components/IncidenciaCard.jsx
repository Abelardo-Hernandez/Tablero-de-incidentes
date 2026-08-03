import {
    AlertTriangle,
    Building2,
    Clock3,
    MapPin,
    UserRound
} from 'lucide-react';

import {
    useEffect,
    useState
} from 'react';

import {
    obtenerTiempoTranscurrido
} from '../../../utils/fechas';

const estilosPrioridad = {
    critica: {
        etiqueta: 'Crítica',
        clase: 'bg-red-100 text-red-700 border-red-200'
    },
    alta: {
        etiqueta: 'Alta',
        clase: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    media: {
        etiqueta: 'Media',
        clase: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    baja: {
        etiqueta: 'Baja',
        clase: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
};

const etiquetasTipo = {
    falla_equipo: 'Falla de equipo',
    falta_material: 'Falta de material',
    calidad: 'Calidad',
    seguridad: 'Seguridad',
    proceso: 'Proceso',
    otro: 'Otro'
};

function IncidenciaCard({
    incidencia,
    onSeleccionar
}) {
    const [tiempo, setTiempo] = useState(
        obtenerTiempoTranscurrido(
            incidencia.fecha_creacion
        )
    );

    useEffect(() => {
        const temporizador = window.setInterval(() => {
            setTiempo(
                obtenerTiempoTranscurrido(
                    incidencia.fecha_creacion
                )
            );
        }, 1000);

        return () => window.clearInterval(temporizador);
    }, [incidencia.fecha_creacion]);

    const prioridad =
        estilosPrioridad[incidencia.prioridad] ||
        estilosPrioridad.media;

    return (
        <article
            onClick={() => onSeleccionar(incidencia)}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                        {incidencia.folio ||
                            `INC-${String(incidencia.id).padStart(6, '0')}`}
                    </p>

                    <h4 className="mt-2 line-clamp-2 font-bold leading-6 text-slate-900">
                        {incidencia.titulo ||
                            incidencia.descripcion ||
                            'Incidencia sin título'}
                    </h4>
                </div>

                <span
                    className={[
                        'shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold',
                        prioridad.clase
                    ].join(' ')}
                >
                    {prioridad.etiqueta}
                </span>
            </div>

            {incidencia.descripcion &&
                incidencia.titulo && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                        {incidencia.descripcion}
                    </p>
                )}

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                {etiquetasTipo[incidencia.tipo] || 'Otro'}
                {incidencia.detuvo_linea ? ' · Detuvo línea' : ''}
            </p>

            <div className="mt-4 space-y-2.5 border-y border-slate-100 py-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                    <MapPin
                        size={16}
                        className="shrink-0 text-emerald-600"
                    />

                    <span className="truncate font-semibold">
                        {incidencia.linea_nombre ||
                            'Sin línea asignada'}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                    <Building2
                        size={16}
                        className="shrink-0 text-blue-600"
                    />

                    <span className="truncate">
                        {incidencia.area_nombre ||
                            'Sin área que atiende'}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                    <UserRound
                        size={16}
                        className="shrink-0 text-violet-600"
                    />

                    <span className="truncate">
                        {incidencia.responsable_nombre ||
                            'Sin responsable'}
                    </span>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <Clock3
                        size={16}
                        className="text-slate-400"
                    />

                    {tiempo}
                </div>

                {incidencia.prioridad === 'critica' && (
                    <div
                        className="flex items-center gap-1 text-xs font-bold text-red-600"
                        title="Atención inmediata"
                    >
                        <AlertTriangle size={15} />
                        Urgente
                    </div>
                )}
            </div>
        </article>
    );
}

export default IncidenciaCard;
