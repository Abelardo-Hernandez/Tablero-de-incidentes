import {
    ArrowRight,
    Clock3,
    Factory,
    ShieldCheck,
    Target,
    TrendingUp
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { obtenerIncidencias } from '../../services/incidencias.service';
import { obtenerTiempoTranscurrido } from '../../utils/fechas';

const estadosAbiertos = [
    'nueva', 'asignada', 'en_proceso', 'pendiente_confirmacion'
];

function milisegundos(fecha) {
    if (!fecha) return null;
    const valor = new Date(fecha).getTime();
    return Number.isFinite(valor) ? valor : null;
}

function formatearDuracion(valor) {
    if (!Number.isFinite(valor)) return 'Sin datos';
    const minutos = Math.max(0, Math.round(valor / 60000));
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return horas ? `${horas} h ${resto} min` : `${resto} min`;
}

function promedioEntre(incidencias, campoFin) {
    const tiempos = incidencias
        .map((incidencia) => {
            const inicio = milisegundos(incidencia.fecha_creacion);
            const fin = milisegundos(incidencia[campoFin]);
            return inicio !== null && fin !== null
                ? Math.max(0, fin - inicio)
                : null;
        })
        .filter((valor) => valor !== null);

    if (!tiempos.length) return null;
    return tiempos.reduce((total, valor) => total + valor, 0) / tiempos.length;
}

function principalPor(incidencias, obtenerNombre, vacio) {
    const conteos = new Map();
    incidencias.forEach((incidencia) => {
        const nombre = obtenerNombre(incidencia) || vacio;
        conteos.set(nombre, (conteos.get(nombre) || 0) + 1);
    });
    return [...conteos.entries()]
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)[0] || null;
}

function fechaLocal(fecha) {
    return String(fecha || '').slice(0, 10);
}

function DashboardPage() {
    const [incidencias, setIncidencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [, setTick] = useState(0);

    useEffect(() => {
        let activo = true;

        async function cargar(silencioso = false) {
            try {
                if (!silencioso) setCargando(true);
                const respuesta = await obtenerIncidencias();
                if (activo) {
                    setIncidencias(respuesta.data || []);
                    setError('');
                }
            } catch (errorSolicitud) {
                if (activo) {
                    setError(
                        errorSolicitud.response?.data?.message ||
                        'No fue posible cargar la información del dashboard.'
                    );
                }
            } finally {
                if (activo && !silencioso) setCargando(false);
            }
        }

        cargar();
        const intervalo = window.setInterval(() => cargar(true), 15000);
        const actualizarAlRegresar = () => {
            if (document.visibilityState === 'visible') cargar(true);
        };
        document.addEventListener('visibilitychange', actualizarAlRegresar);

        return () => {
            activo = false;
            window.clearInterval(intervalo);
            document.removeEventListener('visibilitychange', actualizarAlRegresar);
        };
    }, []);

    useEffect(() => {
        const intervalo = window.setInterval(
            () => setTick((actual) => actual + 1),
            30000
        );
        return () => window.clearInterval(intervalo);
    }, []);

    const datos = useMemo(() => {
        const hoy = new Date().toLocaleDateString('en-CA');
        const delDia = incidencias.filter(
            (incidencia) => fechaLocal(incidencia.fecha_creacion) === hoy
        );
        const abiertas = incidencias.filter(
            (incidencia) => estadosAbiertos.includes(incidencia.estado)
        );
        const atendibles = delDia.filter(
            (incidencia) => incidencia.estado !== 'cancelada'
        );
        const atendidas = atendibles.filter(
            (incidencia) =>
                incidencia.fecha_inicio_atencion ||
                ['pendiente_confirmacion', 'resuelta', 'cerrada'].includes(incidencia.estado)
        );
        const porcentajeAtendido = atendibles.length
            ? Math.round((atendidas.length / atendibles.length) * 100)
            : 0;
        const finales = delDia.filter((incidencia) =>
            ['resuelta', 'cerrada'].includes(incidencia.estado)
        ).length;
        const distribucion = [
            { etiqueta: 'Nuevas', valor: delDia.filter((i) => i.estado === 'nueva').length, color: 'bg-blue-500' },
            { etiqueta: 'En atención', valor: delDia.filter((i) => ['asignada', 'en_proceso'].includes(i.estado)).length, color: 'bg-amber-500' },
            { etiqueta: 'Por confirmar', valor: delDia.filter((i) => i.estado === 'pendiente_confirmacion').length, color: 'bg-violet-500' },
            { etiqueta: 'Finalizadas', valor: finales, color: 'bg-emerald-500' }
        ];

        return {
            abiertas,
            criticas: abiertas.filter((i) => i.prioridad === 'critica'),
            paros: abiertas.filter((i) => i.detuvo_linea),
            delDia,
            porcentajeAtendido,
            promedioEspera: formatearDuracion(promedioEntre(delDia, 'fecha_inicio_atencion')),
            promedioSolucion: formatearDuracion(promedioEntre(delDia, 'fecha_resolucion')),
            lineaPrincipal: principalPor(delDia, (i) => i.linea_nombre, 'Sin línea'),
            areaPrincipal: principalPor(delDia, (i) => i.area_nombre, 'Sin área'),
            distribucion,
            activas: [...abiertas]
                .sort((a, b) => {
                    const orden = ['critica', 'alta', 'media', 'baja'];
                    const diferencia = orden.indexOf(a.prioridad) - orden.indexOf(b.prioridad);
                    return diferencia || milisegundos(a.fecha_creacion) - milisegundos(b.fecha_creacion);
                })
                .slice(0, 3)
        };
    }, [incidencias]);

    return (
        <div className="mx-auto max-w-[1600px] space-y-6">
            {error && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    {error}
                </section>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard titulo="Incidencias abiertas" valor={cargando ? '...' : String(datos.abiertas.length)} descripcion="Operación actual" variacion={null} tono="verde" />
                <KpiCard titulo="Incidencias críticas" valor={cargando ? '...' : String(datos.criticas.length)} descripcion="Requieren intervención" variacion={null} tono="rojo" />
                <KpiCard titulo="Tiempo promedio" valor={cargando ? '...' : datos.promedioSolucion} descripcion="Solución durante el día" variacion={null} tono="ambar" />
                <KpiCard titulo="Paros de línea" valor={cargando ? '...' : String(datos.paros.length)} descripcion="Impacto productivo actual" variacion={null} tono="azul" />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#071629] text-white shadow-xl shadow-slate-950/10">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Resumen analítico de hoy</h2>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                            {datos.delDia.length} reporte(s) creado(s)
                        </span>
                    </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[0.75fr_1.4fr_1fr]">
                    <article className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
                        <div
                            className="grid h-40 w-40 place-items-center rounded-full p-3"
                            style={{
                                background: `conic-gradient(#10b981 ${datos.porcentajeAtendido}%, rgba(255,255,255,.09) 0)`
                            }}
                        >
                            <div className="grid h-full w-full place-items-center rounded-full bg-[#0b1d32]">
                                <div>
                                    <p className="text-4xl font-black">{datos.porcentajeAtendido}%</p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Atendidos</p>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-400">Reportes del día que ya iniciaron atención</p>
                    </article>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <MetricaAnalitica icono={Clock3} etiqueta="Espera promedio" valor={datos.promedioEspera} detalle="Hasta iniciar atención" tono="text-sky-300" />
                        <MetricaAnalitica icono={Target} etiqueta="Solución promedio" valor={datos.promedioSolucion} detalle="Desde su creación" tono="text-amber-300" />
                        <MetricaAnalitica icono={Factory} etiqueta="Línea con más reportes" valor={datos.lineaPrincipal?.nombre || 'Sin datos'} detalle={datos.lineaPrincipal ? `${datos.lineaPrincipal.cantidad} reporte(s)` : 'Sin actividad hoy'} tono="text-violet-300" />
                        <MetricaAnalitica icono={ShieldCheck} etiqueta="Área con más reportes" valor={datos.areaPrincipal?.nombre || 'Sin datos'} detalle={datos.areaPrincipal ? `${datos.areaPrincipal.cantidad} reporte(s)` : 'Sin actividad hoy'} tono="text-emerald-300" />
                    </div>

                    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-300" />
                            <h3 className="font-bold">Distribución del día</h3>
                        </div>
                        <div className="mt-6 space-y-5">
                            {datos.distribucion.map((item) => {
                                const porcentaje = datos.delDia.length
                                    ? Math.round((item.valor / datos.delDia.length) * 100)
                                    : 0;
                                return (
                                    <div key={item.etiqueta}>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300">{item.etiqueta}</span>
                                            <strong>{item.valor}</strong>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${porcentaje}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">Reportes recientes</h2>
                        <p className="mt-1 text-sm text-slate-500">Selecciona una tarjeta para abrir el detalle completo</p>
                    </div>
                    <Link to="/incidencias" className="rounded-xl border border-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-emerald-700 transition hover:bg-emerald-50">
                        Ver todos
                    </Link>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {cargando ? (
                        <div className="col-span-full grid min-h-40 place-items-center text-sm text-slate-500">Cargando incidencias...</div>
                    ) : datos.activas.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No hay incidencias activas.</div>
                    ) : datos.activas.map((incidencia) => (
                        <Link
                            key={incidencia.id}
                            to={`/incidencias?incidencia=${incidencia.id}`}
                            className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-red-600">{incidencia.folio}</p>
                                    <h3 className="mt-2 line-clamp-2 font-bold text-slate-900">{incidencia.titulo}</h3>
                                </div>
                                <PrioridadBadge prioridad={incidencia.prioridad} />
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm">
                                <Dato etiqueta="Línea" valor={incidencia.linea_nombre || 'Sin línea'} />
                                <Dato etiqueta="Área que atiende" valor={incidencia.area_nombre || 'Sin área'} />
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs text-slate-400">Tiempo transcurrido</p>
                                    <p className="mt-1 font-mono text-xl font-bold text-slate-950">{obtenerTiempoTranscurrido(incidencia.fecha_creacion)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge estado={incidencia.estado} />
                                    <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

function MetricaAnalitica({ icono: Icono, etiqueta, valor, detalle, tono }) {
    return (
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Icono size={21} className={tono} />
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
            <p className="mt-2 truncate text-xl font-black" title={valor}>{valor}</p>
            <p className="mt-1 text-xs text-slate-500">{detalle}</p>
        </article>
    );
}

function Dato({ etiqueta, valor }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-slate-400">{etiqueta}</p>
            <p className="mt-1 truncate font-semibold text-slate-700">{valor}</p>
        </div>
    );
}

function PrioridadBadge({ prioridad }) {
    const estilos = {
        critica: 'bg-red-50 text-red-700', alta: 'bg-orange-50 text-orange-700',
        media: 'bg-amber-50 text-amber-700', baja: 'bg-emerald-50 text-emerald-700'
    };
    const etiquetas = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
    return (
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${estilos[prioridad] || estilos.media}`}>
            {etiquetas[prioridad] || prioridad}
        </span>
    );
}

export default DashboardPage;
