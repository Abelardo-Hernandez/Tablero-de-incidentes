import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    ListChecks,
    PlayCircle,
    Plus,
    Search,
    UserCheck
} from 'lucide-react';

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    obtenerAreasActivas,
    obtenerLineasActivas,
    obtenerTurnosActivos
} from '../../services/catalogos.service';

import {
    obtenerIncidencias
} from '../../services/incidencias.service';

import {
    obtenerUsuarios
} from '../../services/usuarios.service';

import IncidenciaDetallePanel from './IncidenciaDetallePanel';
import IncidenciaModal from './IncidenciaModal';
import KanbanColumn from './components/KanbanColumn';

const columnas = [
    {
        estado: 'nueva',
        titulo: 'Nuevas',
        descripcion: 'Recién creadas',
        icono: ClipboardList,
        estiloIcono: 'bg-blue-50 text-blue-700',
        estiloContador: 'bg-blue-50 text-blue-700'
    },
    {
        estado: 'asignada',
        titulo: 'Asignadas',
        descripcion: 'Con responsable',
        icono: UserCheck,
        estiloIcono: 'bg-violet-50 text-violet-700',
        estiloContador: 'bg-violet-50 text-violet-700'
    },
    {
        estado: 'en_proceso',
        titulo: 'En proceso',
        descripcion: 'En atención',
        icono: PlayCircle,
        estiloIcono: 'bg-amber-50 text-amber-700',
        estiloContador: 'bg-amber-50 text-amber-700'
    },
    {
        estado: 'resuelta',
        titulo: 'Resueltas',
        descripcion: 'Atención terminada',
        icono: CheckCircle2,
        estiloIcono: 'bg-emerald-50 text-emerald-700',
        estiloContador: 'bg-emerald-50 text-emerald-700'
    }
];

function IncidenciasPage() {
    const [incidencias, setIncidencias] = useState([]);
    const [areas, setAreas] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [incidenciaSeleccionada, setIncidenciaSeleccionada] =
        useState(null);

    const [filtros, setFiltros] = useState({
        buscar: '',
        tipo: '',
        prioridad: '',
        area_id: '',
        linea_id: ''
    });

    const cargarIncidencias = useCallback(async () => {
        try {
            setCargando(true);
            setError('');

            const respuesta = await obtenerIncidencias({
                buscar: filtros.buscar || undefined,
                tipo: filtros.tipo || undefined,
                prioridad: filtros.prioridad || undefined,
                area_id: filtros.area_id || undefined,
                linea_id: filtros.linea_id || undefined
            });

            setIncidencias(respuesta.data || []);
        } catch (errorSolicitud) {
            console.error(
                'Error al obtener incidencias:',
                errorSolicitud
            );

            setError(
                errorSolicitud.response?.data?.message ||
                'No fue posible cargar las incidencias.'
            );
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarIncidencias();
        }, 300);

        return () => clearTimeout(temporizador);
    }, [cargarIncidencias]);

    useEffect(() => {
        async function cargarCatalogos() {
            try {
                const resultados = await Promise.allSettled([
                    obtenerAreasActivas(),
                    obtenerLineasActivas(),
                    obtenerTurnosActivos(),
                    obtenerUsuarios({
                        activo: true
                    })
                ]);

                if (resultados[0].status === 'fulfilled') {
                    setAreas(resultados[0].value.data || []);
                }

                if (resultados[1].status === 'fulfilled') {
                    setLineas(resultados[1].value.data || []);
                }

                if (resultados[2].status === 'fulfilled') {
                    setTurnos(resultados[2].value.data || []);
                }

                if (resultados[3].status === 'fulfilled') {
                    setUsuarios(resultados[3].value.data || []);
                }
            } catch (errorSolicitud) {
                console.error(
                    'Error al cargar catálogos:',
                    errorSolicitud
                );
            }
        }

        cargarCatalogos();
    }, []);

    const metricas = useMemo(() => {
        const abiertas = incidencias.filter(
            (incidencia) =>
                ![
                    'resuelta',
                    'cancelada'
                ].includes(incidencia.estado)
        );

        return {
            abiertas: abiertas.length,
            criticas: abiertas.filter(
                (incidencia) =>
                    incidencia.prioridad === 'critica'
            ).length,
            sinResponsable: abiertas.filter(
                (incidencia) =>
                    !incidencia.responsable_usuario_id
            ).length,
            resueltas: incidencias.filter(
                (incidencia) =>
                    [
                        'resuelta',
                        'cerrada'
                    ].includes(incidencia.estado)
            ).length
        };
    }, [incidencias]);

    function manejarFiltro(evento) {
        const {
            name,
            value
        } = evento.target;

        setFiltros((actual) => ({
            ...actual,
            [name]: value
        }));
    }

    return (
        <div className="mx-auto max-w-[1800px] space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <ListChecks size={18} />
                        Centro de Incidencias
                    </div>

                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                        Tablero de Reportes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Registra, asigna, atiende y da seguimiento a incidencias de producción.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setModalAbierto(true)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-bold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-600"
                >
                    <Plus size={19} />
                    Nueva incidencia
                </button>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <Kpi
                    titulo="Abiertas"
                    valor={metricas.abiertas}
                    tono="emerald"
                />
                <Kpi
                    titulo="Críticas"
                    valor={metricas.criticas}
                    tono="red"
                />
                <Kpi
                    titulo="Sin responsable"
                    valor={metricas.sinResponsable}
                    tono="amber"
                />
                <Kpi
                    titulo="Resueltas"
                    valor={metricas.resueltas}
                    tono="blue"
                />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1fr_190px_180px_220px_220px]">
                    <div className="relative">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            name="buscar"
                            value={filtros.buscar}
                            onChange={manejarFiltro}
                            placeholder="Buscar por folio, título, área o línea..."
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                        />
                    </div>

                    <select
                        name="tipo"
                        value={filtros.tipo}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Tipo
                        </option>
                        <option value="falla_equipo">
                            Falla equipo
                        </option>
                        <option value="falta_material">
                            Falta material
                        </option>
                        <option value="calidad">
                            Calidad
                        </option>
                        <option value="seguridad">
                            Seguridad
                        </option>
                        <option value="proceso">
                            Proceso
                        </option>
                        <option value="otro">
                            Otro
                        </option>
                    </select>

                    <select
                        name="prioridad"
                        value={filtros.prioridad}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Prioridad
                        </option>
                        <option value="critica">
                            Crítica
                        </option>
                        <option value="alta">
                            Alta
                        </option>
                        <option value="media">
                            Media
                        </option>
                        <option value="baja">
                            Baja
                        </option>
                    </select>

                    <select
                        name="area_id"
                        value={filtros.area_id}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Todas las áreas
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

                    <select
                        name="linea_id"
                        value={filtros.linea_id}
                        onChange={manejarFiltro}
                        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    >
                        <option value="">
                            Todas las líneas
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
                </div>
            </section>

            {error && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </section>
            )}

            {cargando ? (
                <section className="grid min-h-96 place-items-center rounded-3xl border border-slate-200 bg-white">
                    <div className="text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                        <p className="mt-4 text-sm text-slate-500">
                            Cargando incidencias...
                        </p>
                    </div>
                </section>
            ) : (
                <section className="custom-scrollbar flex gap-4 overflow-x-auto pb-2">
                    {columnas.map((columna) => (
                        <KanbanColumn
                            key={columna.estado}
                            titulo={columna.titulo}
                            descripcion={columna.descripcion}
                            icono={columna.icono}
                            estiloIcono={columna.estiloIcono}
                            estiloContador={columna.estiloContador}
                            incidencias={incidencias.filter(
                                (incidencia) =>
                                    incidencia.estado ===
                                    columna.estado
                            )}
                            onSeleccionar={
                                setIncidenciaSeleccionada
                            }
                        />
                    ))}
                </section>
            )}

            <IncidenciaModal
                abierto={modalAbierto}
                areas={areas}
                lineas={lineas}
                turnos={turnos}
                onCerrar={() => setModalAbierto(false)}
                onGuardado={cargarIncidencias}
            />

            <IncidenciaDetallePanel
                abierto={Boolean(incidenciaSeleccionada)}
                incidencia={incidenciaSeleccionada}
                usuarios={usuarios}
                onCerrar={() =>
                    setIncidenciaSeleccionada(null)
                }
                onActualizado={cargarIncidencias}
            />
        </div>
    );
}

function Kpi({
    titulo,
    valor,
    tono
}) {
    const tonos = {
        emerald: 'bg-emerald-50 text-emerald-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-blue-50 text-blue-700'
    };

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500">
                    {titulo}
                </p>

                <div
                    className={[
                        'grid h-10 w-10 place-items-center rounded-xl',
                        tonos[tono]
                    ].join(' ')}
                >
                    <AlertTriangle size={18} />
                </div>
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-950">
                {valor}
            </p>
        </article>
    );
}

export default IncidenciasPage;
