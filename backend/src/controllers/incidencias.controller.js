const db = require('../config/db');

const ESTADOS = [
    'nueva',
    'asignada',
    'en_proceso',
    'resuelta',
    'cerrada',
    'cancelada'
];

const TIPOS = [
    'falla_equipo',
    'falta_material',
    'calidad',
    'seguridad',
    'proceso',
    'otro'
];

const PRIORIDADES = [
    'baja',
    'media',
    'alta',
    'critica'
];

function convertirIncidencia(incidencia) {
    return {
        ...incidencia,
        folio: `INC-${String(incidencia.id).padStart(6, '0')}`,
        area_destino_id:
            incidencia.area_responsable_id || null,
        responsable_usuario_id:
            incidencia.usuario_asignado_id || null,
        turno: incidencia.turno_nombre || null,
        detuvo_linea: Boolean(incidencia.detuvo_linea),
        linea_id: incidencia.linea_id || null
    };
}

async function registrarHistorial({
    incidenciaId,
    usuarioId,
    accion,
    estadoAnterior = null,
    estadoNuevo = null,
    comentario = null
}) {
    try {
        await db.query(
            `
            INSERT INTO historial_incidencias (
                incidencia_id,
                usuario_id,
                accion,
                estado_anterior,
                estado_nuevo,
                comentario
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                incidenciaId,
                usuarioId,
                accion,
                estadoAnterior,
                estadoNuevo,
                comentario
            ]
        );
    } catch (error) {
        console.warn(
            'No fue posible registrar historial de incidencia:',
            error.message
        );
    }
}

async function obtenerHistorialSeguro(incidenciaId) {
    try {
        const [historial] = await db.query(
            `
            SELECT
                h.id,
                h.accion,
                h.estado_anterior,
                h.estado_nuevo,
                h.comentario,
                h.fecha_creacion,
                u.nombre AS usuario_nombre
            FROM historial_incidencias h
            LEFT JOIN usuarios u
                ON u.id = h.usuario_id
            WHERE h.incidencia_id = ?
            ORDER BY h.fecha_creacion ASC, h.id ASC
            `,
            [incidenciaId]
        );

        return historial;
    } catch {
        return [];
    }
}

async function obtenerComentariosSeguro(incidenciaId) {
    try {
        const [comentarios] = await db.query(
            `
            SELECT
                c.id,
                c.comentario,
                c.fecha_creacion,
                u.nombre AS usuario_nombre
            FROM comentarios_incidencia c
            LEFT JOIN usuarios u
                ON u.id = c.usuario_id
            WHERE c.incidencia_id = ?
            ORDER BY c.fecha_creacion ASC, c.id ASC
            `,
            [incidenciaId]
        );

        return comentarios;
    } catch {
        return [];
    }
}

function validarPrioridad(prioridad) {
    return PRIORIDADES.includes(prioridad);
}

function validarTipo(tipo) {
    return TIPOS.includes(tipo);
}

function validarEstado(estado) {
    return ESTADOS.includes(estado);
}

async function obtenerIncidencias(req, res) {
    try {
        const {
            estado,
            tipo,
            prioridad,
            area_id,
            linea_id,
            responsable_usuario_id,
            buscar
        } = req.query;

        const condiciones = [];
        const valores = [];

        if (estado) {
            condiciones.push('i.estado = ?');
            valores.push(estado);
        }

        if (prioridad) {
            condiciones.push('i.prioridad = ?');
            valores.push(prioridad);
        }

        if (tipo) {
            condiciones.push('i.tipo = ?');
            valores.push(tipo);
        }

        if (area_id) {
            condiciones.push('i.area_responsable_id = ?');
            valores.push(area_id);
        }

        if (linea_id) {
            condiciones.push('i.linea_id = ?');
            valores.push(linea_id);
        }

        if (responsable_usuario_id) {
            condiciones.push('i.usuario_asignado_id = ?');
            valores.push(responsable_usuario_id);
        }

        if (buscar) {
            condiciones.push(`
                (
                    i.titulo LIKE ?
                    OR i.descripcion LIKE ?
                    OR a.nombre LIKE ?
                    OR l.nombre LIKE ?
                )
            `);

            const termino = `%${buscar.trim()}%`;
            valores.push(
                termino,
                termino,
                termino,
                termino
            );
        }

        const where = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const [incidencias] = await db.query(
            `
            SELECT
                i.id,
                i.titulo,
                i.descripcion,
                i.tipo,
                i.prioridad,
                i.detuvo_linea,
                i.cantidad_afectada,
                i.estado,
                i.fecha_creacion,
                i.fecha_asignacion,
                i.fecha_inicio_atencion,
                i.fecha_resolucion,
                i.fecha_reanudacion,
                i.fecha_cierre,
                i.observacion_cierre,
                i.causa_raiz,
                i.solucion_aplicada,
                i.usuario_creador_id,
                i.area_origen_id,
                i.area_responsable_id,
                i.usuario_asignado_id,
                i.linea_id,
                reporta.nombre AS reporta_nombre,
                origen.nombre AS area_origen_nombre,
                a.nombre AS area_nombre,
                responsable.nombre AS responsable_nombre,
                l.nombre AS linea_nombre,
                t.nombre AS turno_nombre
            FROM incidencias i
            LEFT JOIN usuarios reporta
                ON reporta.id = i.usuario_creador_id
            LEFT JOIN areas origen
                ON origen.id = i.area_origen_id
            LEFT JOIN areas a
                ON a.id = i.area_responsable_id
            LEFT JOIN usuarios responsable
                ON responsable.id = i.usuario_asignado_id
            LEFT JOIN lineas l
                ON l.id = i.linea_id
            LEFT JOIN turnos t
                ON t.id = i.turno_id
            ${where}
            ORDER BY
                FIELD(i.estado, 'nueva', 'asignada', 'en_proceso', 'resuelta', 'cerrada', 'cancelada'),
                FIELD(i.prioridad, 'critica', 'alta', 'media', 'baja'),
                i.fecha_creacion DESC
            `,
            valores
        );

        return res.json({
            success: true,
            data: incidencias.map(convertirIncidencia)
        });
    } catch (error) {
        console.error('Error al obtener incidencias:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener las incidencias'
        });
    }
}

async function obtenerIncidenciaPorId(req, res) {
    try {
        const { id } = req.params;

        const [incidencias] = await db.query(
            `
            SELECT
                i.*,
                reporta.nombre AS reporta_nombre,
                origen.nombre AS area_origen_nombre,
                a.nombre AS area_nombre,
                responsable.nombre AS responsable_nombre,
                l.nombre AS linea_nombre,
                t.nombre AS turno_nombre
            FROM incidencias i
            LEFT JOIN usuarios reporta
                ON reporta.id = i.usuario_creador_id
            LEFT JOIN areas origen
                ON origen.id = i.area_origen_id
            LEFT JOIN areas a
                ON a.id = i.area_responsable_id
            LEFT JOIN usuarios responsable
                ON responsable.id = i.usuario_asignado_id
            LEFT JOIN lineas l
                ON l.id = i.linea_id
            LEFT JOIN turnos t
                ON t.id = i.turno_id
            WHERE i.id = ?
            LIMIT 1
            `,
            [id]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        const [
            historial,
            comentarios
        ] = await Promise.all([
            obtenerHistorialSeguro(id),
            obtenerComentariosSeguro(id)
        ]);

        return res.json({
            success: true,
            data: {
                ...convertirIncidencia(incidencias[0]),
                historial,
                comentarios,
                adjuntos: []
            }
        });
    } catch (error) {
        console.error('Error al obtener incidencia:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener la incidencia'
        });
    }
}

async function crearIncidencia(req, res) {
    try {
        const {
            titulo,
            descripcion,
            tipo = 'otro',
            prioridad = 'media',
            detuvo_linea = false,
            cantidad_afectada = null,
            area_origen_id,
            area_responsable_id,
            area_destino_id,
            linea_id = null,
            turno_id = null
        } = req.body;

        if (!titulo || !titulo.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El título de la incidencia es obligatorio'
            });
        }

        if (!descripcion || !descripcion.trim()) {
            return res.status(400).json({
                success: false,
                message: 'La descripción de la incidencia es obligatoria'
            });
        }

        const areaResponsableId =
            area_responsable_id || area_destino_id;

        const areaOrigenId =
            area_origen_id || req.user.area_id;

        if (!areaOrigenId) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar el área origen'
            });
        }

        if (!areaResponsableId) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar el área responsable'
            });
        }

        if (!validarTipo(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'El tipo seleccionado no es válido'
            });
        }

        if (!validarPrioridad(prioridad)) {
            return res.status(400).json({
                success: false,
                message: 'La prioridad seleccionada no es válida'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO incidencias (
                titulo,
                descripcion,
                tipo,
                prioridad,
                detuvo_linea,
                cantidad_afectada,
                estado,
                linea_id,
                turno_id,
                area_origen_id,
                area_responsable_id,
                usuario_creador_id,
                usuario_asignado_id
            )
            VALUES (?, ?, ?, ?, ?, ?, 'nueva', ?, ?, ?, ?, ?, NULL)
            `,
            [
                titulo.trim(),
                descripcion.trim(),
                tipo,
                prioridad,
                Boolean(detuvo_linea),
                cantidad_afectada || null,
                linea_id || null,
                turno_id || null,
                areaOrigenId,
                areaResponsableId,
                req.user.id
            ]
        );

        const id = resultado.insertId;

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: 'Incidencia creada',
            estadoNuevo: 'nueva'
        });

        return res.status(201).json({
            success: true,
            message: 'Incidencia creada correctamente',
            data: {
                id,
                folio: `INC-${String(id).padStart(6, '0')}`
            }
        });
    } catch (error) {
        console.error('Error al crear incidencia:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible crear la incidencia'
        });
    }
}

async function asignarIncidencia(req, res) {
    try {
        const { id } = req.params;
        const { responsable_usuario_id, comentario = '' } = req.body;

        if (!responsable_usuario_id) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar un responsable'
            });
        }

        const [incidencias] = await db.query(
            `
            SELECT id, estado
            FROM incidencias
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        const estadoAnterior = incidencias[0].estado;

        await db.query(
            `
            UPDATE incidencias
            SET
                usuario_asignado_id = ?,
                estado = 'asignada',
                fecha_asignacion = COALESCE(fecha_asignacion, NOW())
            WHERE id = ?
            `,
            [responsable_usuario_id, id]
        );

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: 'Incidencia asignada',
            estadoAnterior,
            estadoNuevo: 'asignada',
            comentario: comentario?.trim() || null
        });

        return res.json({
            success: true,
            message: 'Incidencia asignada correctamente'
        });
    } catch (error) {
        console.error('Error al asignar incidencia:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible asignar la incidencia'
        });
    }
}

async function cambiarEstadoIncidencia(req, res) {
    try {
        const { id } = req.params;
        const { estado, comentario = '' } = req.body;

        if (!validarEstado(estado)) {
            return res.status(400).json({
                success: false,
                message: 'El estado seleccionado no es válido'
            });
        }

        const [incidencias] = await db.query(
            `
            SELECT id, estado
            FROM incidencias
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        const estadoAnterior = incidencias[0].estado;
        const camposFecha = [];

        if (estado === 'asignada') {
            camposFecha.push(
                'fecha_asignacion = COALESCE(fecha_asignacion, NOW())'
            );
        }

        if (estado === 'en_proceso') {
            camposFecha.push(
                'fecha_inicio_atencion = COALESCE(fecha_inicio_atencion, NOW())'
            );
        }

        if (estado === 'resuelta') {
            camposFecha.push('fecha_resolucion = NOW()');
        }

        if (estado === 'cerrada') {
            camposFecha.push('fecha_cierre = NOW()');
        }

        const setFechas = camposFecha.length
            ? `, ${camposFecha.join(', ')}`
            : '';

        await db.query(
            `
            UPDATE incidencias
            SET estado = ?
                ${setFechas}
            WHERE id = ?
            `,
            [estado, id]
        );

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: `Estado cambiado a ${estado}`,
            estadoAnterior,
            estadoNuevo: estado,
            comentario: comentario?.trim() || null
        });

        return res.json({
            success: true,
            message: 'Estado actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado de incidencia:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible cambiar el estado'
        });
    }
}

async function agregarComentario(req, res) {
    try {
        const { id } = req.params;
        const { comentario } = req.body;

        if (!comentario || !comentario.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El comentario es obligatorio'
            });
        }

        const [incidencias] = await db.query(
            `
            SELECT id
            FROM incidencias
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        await db.query(
            `
            INSERT INTO comentarios_incidencia (
                incidencia_id,
                usuario_id,
                comentario
            )
            VALUES (?, ?, ?)
            `,
            [
                id,
                req.user.id,
                comentario.trim()
            ]
        );

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: 'Comentario agregado',
            comentario: comentario.trim()
        });

        return res.status(201).json({
            success: true,
            message: 'Comentario agregado correctamente'
        });
    } catch (error) {
        console.error('Error al agregar comentario:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible agregar el comentario'
        });
    }
}

module.exports = {
    obtenerIncidencias,
    obtenerIncidenciaPorId,
    crearIncidencia,
    asignarIncidencia,
    cambiarEstadoIncidencia,
    agregarComentario
};
