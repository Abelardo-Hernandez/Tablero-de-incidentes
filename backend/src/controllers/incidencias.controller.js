const db = require('../config/db');

const {
    enviarCorreo
} = require('../services/correo.service');

const {
    asegurarCatalogoTiposFalla,
    tipoFallaActivoExiste
} = require('../services/tipos-falla.service');

const {
    notificarNuevaIncidencia
} = require('../services/push.service');

const {
    crearNotificacionIncidencia
} = require('../services/notificaciones.service');

const ESTADOS = [
    'nueva',
    'asignada',
    'en_proceso',
    'pendiente_confirmacion',
    'resuelta',
    'cerrada',
    'cancelada'
];

const TRANSICIONES_ESTADO = {
    nueva: [
        'cancelada'
    ],
    asignada: [
        'en_proceso',
        'cancelada'
    ],
    en_proceso: [
        'pendiente_confirmacion',
        'cancelada'
    ],
    pendiente_confirmacion: [
        'en_proceso',
        'cerrada'
    ],
    resuelta: [
        'cerrada'
    ],
    cerrada: [],
    cancelada: []
};

const ETIQUETAS_ESTADO = {
    nueva: 'Nueva',
    asignada: 'Asignada',
    en_proceso: 'En proceso',
    pendiente_confirmacion: 'Pendiente de confirmacion',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada'
};

const ACCIONES_ESTADO = {
    en_proceso: 'Atencion iniciada',
    pendiente_confirmacion: 'Solucion enviada a confirmacion',
    resuelta: 'Incidencia resuelta',
    cerrada: 'Incidencia cerrada',
    cancelada: 'Incidencia cancelada'
};

const PRIORIDADES = [
    'baja',
    'media',
    'alta',
    'critica'
];

function esAdministrador(usuario) {
    return [
        'administrador',
        'super_admin'
    ].includes(usuario?.rol);
}

const ETIQUETAS_PRIORIDAD = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica'
};

function escaparHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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
    const acciones = {
        'Incidencia creada': 'creacion',
        'Incidencia asignada': 'asignacion_usuario',
        'Atencion iniciada': 'cambio_estado',
        'Solucion enviada a confirmacion': 'resolucion',
        'Falla reportada nuevamente': 'reapertura',
        'Incidencia resuelta': 'resolucion',
        'Incidencia cerrada': 'cierre',
        'Incidencia cancelada': 'cancelacion',
        'Comentario agregado': 'comentario'
    };
    const accionHistorial =
        acciones[accion] || 'otro';
    const campoModificado =
        estadoAnterior !== null || estadoNuevo !== null
            ? 'estado'
            : null;

    try {
        await db.query(
            `
            INSERT INTO historial_incidencias (
                incidencia_id,
                usuario_id,
                accion,
                campo_modificado,
                valor_anterior,
                valor_nuevo,
                comentario
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                incidenciaId,
                usuarioId,
                accionHistorial,
                campoModificado,
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
                h.valor_anterior AS estado_anterior,
                h.valor_nuevo AS estado_nuevo,
                h.campo_modificado,
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

async function notificarLiderAreaNuevaIncidencia({
    incidenciaId,
    titulo,
    descripcion,
    prioridad,
    areaResponsableId,
    areaOrigenId,
    lineaId,
    turnoId
}) {
    try {
        const [destinatarios] = await db.query(
            `
            SELECT
                u.nombre,
                u.correo,
                a.nombre AS area_nombre
            FROM usuarios u
            INNER JOIN areas a
                ON a.id = u.area_id
            WHERE u.area_id = ?
              AND u.es_lider = 1
              AND u.activo = 1
              AND u.correo IS NOT NULL
              AND u.correo <> ''
            ORDER BY u.nombre ASC
            LIMIT 1
            `,
            [areaResponsableId]
        );

        if (destinatarios.length === 0) {
            console.warn(
                `Correo no enviado para incidencia ${incidenciaId}: el área responsable no tiene líder activo con correo.`
            );
            return;
        }

        const [contexto] = await db.query(
            `
            SELECT
                origen.nombre AS area_origen,
                linea.nombre AS linea_nombre,
                turno.nombre AS turno_nombre
            FROM areas origen
            LEFT JOIN lineas linea
                ON linea.id = ?
            LEFT JOIN turnos turno
                ON turno.id = ?
            WHERE origen.id = ?
            LIMIT 1
            `,
            [
                lineaId || null,
                turnoId || null,
                areaOrigenId
            ]
        );

        const destinatario = destinatarios[0];
        const datosContexto = contexto[0] || {};
        const folio = `INC-${String(incidenciaId).padStart(6, '0')}`;
        const prioridadEtiqueta =
            ETIQUETAS_PRIORIDAD[prioridad] || prioridad;
        const htmlSeguro = {
            nombre: escaparHtml(destinatario.nombre),
            area: escaparHtml(destinatario.area_nombre),
            folio: escaparHtml(folio),
            titulo: escaparHtml(titulo),
            prioridad: escaparHtml(prioridadEtiqueta),
            areaOrigen: escaparHtml(
                datosContexto.area_origen || 'No registrada'
            ),
            linea: escaparHtml(
                datosContexto.linea_nombre || 'No aplica'
            ),
            turno: escaparHtml(
                datosContexto.turno_nombre || 'No aplica'
            ),
            descripcion: escaparHtml(descripcion).replace(
                /\n/g,
                '<br>'
            )
        };

        await enviarCorreo({
            para: destinatario.correo,
            asunto: `${folio} - Nueva incidencia para ${destinatario.area_nombre}`,
            texto: [
                `Hola ${destinatario.nombre},`,
                '',
                `Se registró una nueva incidencia para el área ${destinatario.area_nombre}.`,
                '',
                `Folio: ${folio}`,
                `Título: ${titulo}`,
                `Prioridad: ${prioridadEtiqueta}`,
                `Área que reporta: ${datosContexto.area_origen || 'No registrada'}`,
                `Línea: ${datosContexto.linea_nombre || 'No aplica'}`,
                `Turno: ${datosContexto.turno_nombre || 'No aplica'}`,
                '',
                descripcion,
                '',
                'Ingresa al sistema para revisar y asignar la atención.'
            ].join('\n'),
            html: `
                <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.5;">
                    <h2 style="margin: 0 0 12px;">Nueva incidencia asignada al área</h2>
                    <p>Hola <strong>${htmlSeguro.nombre}</strong>, se registró una nueva incidencia para <strong>${htmlSeguro.area}</strong>.</p>
                    <table style="border-collapse: collapse; margin-top: 16px;">
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Folio</td><td style="padding: 6px 0;"><strong>${htmlSeguro.folio}</strong></td></tr>
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Título</td><td style="padding: 6px 0;">${htmlSeguro.titulo}</td></tr>
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Prioridad</td><td style="padding: 6px 0;">${htmlSeguro.prioridad}</td></tr>
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Área que reporta</td><td style="padding: 6px 0;">${htmlSeguro.areaOrigen}</td></tr>
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Línea</td><td style="padding: 6px 0;">${htmlSeguro.linea}</td></tr>
                        <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Turno</td><td style="padding: 6px 0;">${htmlSeguro.turno}</td></tr>
                    </table>
                    <p style="margin-top: 16px;"><strong>Descripción:</strong><br>${htmlSeguro.descripcion}</p>
                    <p style="margin-top: 18px;">Ingresa al sistema para revisar y asignar la atención.</p>
                </div>
            `
        });
    } catch (error) {
        console.warn(
            'No fue posible enviar correo de nueva incidencia:',
            error.message
        );
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
            FROM comentarios_incidencias c
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

function validarEstado(estado) {
    return ESTADOS.includes(estado);
}

function validarTransicionEstado(estadoAnterior, estadoNuevo) {
    if (estadoAnterior === estadoNuevo) {
        return `La incidencia ya esta en estado ${ETIQUETAS_ESTADO[estadoNuevo]}.`;
    }

    if (
        !TRANSICIONES_ESTADO[estadoAnterior]?.includes(estadoNuevo)
    ) {
        return `No se puede cambiar de ${ETIQUETAS_ESTADO[estadoAnterior]} a ${ETIQUETAS_ESTADO[estadoNuevo]}.`;
    }

    return '';
}

async function obtenerIncidencias(req, res) {
    try {
        await asegurarCatalogoTiposFalla(
            req.user.unidad_negocio_id
        );

        const {
            estado,
            tipo,
            prioridad,
            area_id,
            linea_id,
            responsable_usuario_id,
            buscar,
            vista_tv,
            incluir_cerradas_tv,
            unidad_negocio_id
        } = req.query;

        const condiciones = [];
        const valores = [];

        if (req.user.rol === 'super_admin') {
            if (unidad_negocio_id) {
                condiciones.push('i.unidad_negocio_id = ?');
                valores.push(Number(unidad_negocio_id));
            }
        } else {
            condiciones.push('i.unidad_negocio_id = ?');
            valores.push(req.user.unidad_negocio_id);
        }

        if (vista_tv === 'true') {
            condiciones.push(
                incluir_cerradas_tv === 'true'
                    ? "i.estado IN ('nueva', 'asignada', 'en_proceso', 'pendiente_confirmacion', 'resuelta', 'cerrada')"
                    : "i.estado IN ('nueva', 'asignada', 'en_proceso', 'pendiente_confirmacion')"
            );
        }

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
                i.unidad_negocio_id,
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
                i.turno_id,
                reporta.nombre AS reporta_nombre,
                origen.nombre AS area_origen_nombre,
                a.nombre AS area_nombre,
                responsable.nombre AS responsable_nombre,
                l.nombre AS linea_nombre,
                t.nombre AS turno_nombre,
                tf.nombre AS tipo_nombre
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
            LEFT JOIN tipos_falla tf
                ON tf.clave = i.tipo
               AND tf.unidad_negocio_id = i.unidad_negocio_id
            ${where}
            ORDER BY
                FIELD(i.estado, 'nueva', 'asignada', 'en_proceso', 'pendiente_confirmacion', 'resuelta', 'cerrada', 'cancelada'),
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

async function obtenerResponsables(req, res) {
    try {
        const condiciones = ['u.activo = 1'];
        const valores = [];

        if (req.user.rol !== 'super_admin') {
            condiciones.push('u.unidad_negocio_id = ?');
            valores.push(req.user.unidad_negocio_id);
        }

        if (!esAdministrador(req.user)) {
            if (!req.user.area_id) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            condiciones.push('u.area_id = ?');
            valores.push(req.user.area_id);
        }

        const [usuarios] = await db.query(
            `
            SELECT
                u.id,
                u.nombre,
                u.usuario,
                u.correo,
                u.rol,
                u.unidad_negocio_id,
                u.area_id,
                u.linea_id,
                u.es_lider,
                u.activo,
                a.nombre AS area_nombre,
                l.nombre AS linea_nombre
            FROM usuarios u
            LEFT JOIN areas a
                ON a.id = u.area_id
               AND a.unidad_negocio_id = u.unidad_negocio_id
            LEFT JOIN lineas l
                ON l.id = u.linea_id
               AND l.unidad_negocio_id = u.unidad_negocio_id
            WHERE ${condiciones.join(' AND ')}
            ORDER BY
                u.es_lider DESC,
                u.nombre ASC
            `,
            valores
        );

        return res.json({
            success: true,
            data: usuarios.map((usuario) => ({
                ...usuario,
                es_lider: Boolean(usuario.es_lider),
                activo: Boolean(usuario.activo)
            }))
        });
    } catch (error) {
        console.error('Error al obtener responsables:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener los responsables'
        });
    }
}

async function obtenerIncidenciaPorId(req, res) {
    try {
        await asegurarCatalogoTiposFalla(
            req.user.unidad_negocio_id
        );

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
                t.nombre AS turno_nombre,
                tf.nombre AS tipo_nombre
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
            LEFT JOIN tipos_falla tf
                ON tf.clave = i.tipo
               AND tf.unidad_negocio_id = i.unidad_negocio_id
            WHERE i.id = ?
              AND (
                  i.unidad_negocio_id = ?
                  OR ? = 'super_admin'
              )
            LIMIT 1
            `,
            [
                id,
                req.user.unidad_negocio_id,
                req.user.rol
            ]
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
            turno_id = null,
            unidad_negocio_id
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
        const unidadObjetivoId =
            req.user.rol === 'super_admin' && unidad_negocio_id
                ? Number(unidad_negocio_id)
                : req.user.unidad_negocio_id;

        const [unidades] = await db.query(
            `
            SELECT id, activo
            FROM unidades_negocio
            WHERE id = ?
            LIMIT 1
            `,
            [unidadObjetivoId]
        );

        if (unidades.length === 0 || !unidades[0].activo) {
            return res.status(400).json({
                success: false,
                message: 'La unidad de negocio seleccionada no existe o esta desactivada'
            });
        }

        const areaOrigenId =
            esAdministrador(req.user)
                ? area_origen_id || req.user.area_id
                : req.user.area_id;

        if (!areaOrigenId) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar el área que reporta'
            });
        }

        if (!areaResponsableId) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar el área que atiende'
            });
        }

        const [catalogosValidos] = await db.query(
            `
            SELECT
                (
                    SELECT COUNT(*)
                    FROM areas
                    WHERE id = ?
                      AND unidad_negocio_id = ?
                      AND activo = 1
                ) AS area_origen_valida,
                (
                    SELECT COUNT(*)
                    FROM areas
                    WHERE id = ?
                      AND unidad_negocio_id = ?
                      AND activo = 1
                ) AS area_responsable_valida,
                (
                    SELECT COUNT(*)
                    FROM lineas
                    WHERE (? IS NULL OR id = ?)
                      AND unidad_negocio_id = ?
                      AND activo = 1
                ) AS lineas_validas,
                (
                    SELECT COUNT(*)
                    FROM turnos
                    WHERE (? IS NULL OR id = ?)
                      AND unidad_negocio_id = ?
                      AND activo = 1
                ) AS turnos_validos
            `,
            [
                areaOrigenId,
                unidadObjetivoId,
                areaResponsableId,
                unidadObjetivoId,
                linea_id || null,
                linea_id || null,
                unidadObjetivoId,
                turno_id || null,
                turno_id || null,
                unidadObjetivoId
            ]
        );

        if (
            Number(catalogosValidos[0].area_origen_valida) === 0 ||
            Number(catalogosValidos[0].area_responsable_valida) === 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Selecciona areas validas de tu unidad de negocio'
            });
        }

        if (linea_id && Number(catalogosValidos[0].lineas_validas) === 0) {
            return res.status(400).json({
                success: false,
                message: 'La linea seleccionada no pertenece a tu unidad de negocio'
            });
        }

        if (turno_id && Number(catalogosValidos[0].turnos_validos) === 0) {
            return res.status(400).json({
                success: false,
                message: 'El turno seleccionado no pertenece a tu unidad de negocio'
            });
        }

        const tipoValido = await tipoFallaActivoExiste(
            tipo,
            unidadObjetivoId
        );

        const prioridadFinal = Boolean(detuvo_linea)
            ? 'critica'
            : prioridad;

        if (!tipoValido) {
            return res.status(400).json({
                success: false,
                message: 'El tipo seleccionado no es válido'
            });
        }

        if (!validarPrioridad(prioridadFinal)) {
            return res.status(400).json({
                success: false,
                message: 'La prioridad seleccionada no es válida'
            });
        }

        const [resultado] = await db.query(
            `
            INSERT INTO incidencias (
                titulo,
                unidad_negocio_id,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, 'nueva', ?, ?, ?, ?, ?, NULL)
            `,
            [
                titulo.trim(),
                unidadObjetivoId,
                descripcion.trim(),
                tipo,
                prioridadFinal,
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

        let lineaNombre = '';
        if (linea_id) {
            const [lineas] = await db.query(
                'SELECT nombre FROM lineas WHERE id = ? LIMIT 1',
                [linea_id]
            );
            lineaNombre = lineas[0]?.nombre || '';
        }

        crearNotificacionIncidencia({
            incidenciaId: id,
            areaId: areaResponsableId,
            unidadNegocioId: unidadObjetivoId,
            tipo: 'nueva_incidencia',
            titulo: prioridadFinal === 'critica'
                ? 'Nueva incidencia crítica'
                : 'Nueva incidencia',
            mensaje: lineaNombre
                ? `Línea: ${lineaNombre} · ${titulo.trim()}`
                : titulo.trim()
        }).catch((error) => {
            console.warn(
                'No fue posible guardar la notificacion en MySQL:',
                error.message
            );
        });

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: 'Incidencia creada',
            estadoNuevo: 'nueva'
        });

        notificarLiderAreaNuevaIncidencia({
            incidenciaId: id,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            prioridad: prioridadFinal,
            areaResponsableId,
            areaOrigenId,
            lineaId: linea_id || null,
            turnoId: turno_id || null
        }).catch((error) => {
            console.warn(
                'No fue posible iniciar notificación por correo:',
                error.message
            );
        });

        notificarNuevaIncidencia({
            incidenciaId: id,
            titulo: titulo.trim(),
            prioridad: prioridadFinal,
            areaResponsableId,
            unidadNegocioId: unidadObjetivoId,
            lineaId: linea_id || null
        }).catch((error) => {
            console.warn(
                'No fue posible iniciar notificaciÃ³n push:',
                error.message
            );
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

        const [usuariosSolicitantes] = await db.query(
            `
            SELECT id, rol, area_id, unidad_negocio_id, activo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (
            usuariosSolicitantes.length === 0 ||
            !usuariosSolicitantes[0].activo
        ) {
            return res.status(403).json({
                success: false,
                message: 'El usuario no esta activo o ya no existe'
            });
        }

        const usuarioSolicitante = usuariosSolicitantes[0];

        const [incidencias] = await db.query(
            `
            SELECT id, estado, fecha_inicio_atencion, area_responsable_id
            FROM incidencias
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                id,
                usuarioSolicitante.unidad_negocio_id
            ]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        const estadoAnterior = incidencias[0].estado;
        const areaResponsableId =
            incidencias[0].area_responsable_id;
        const estadosNoAsignables = [
            'pendiente_confirmacion',
            'resuelta',
            'cerrada',
            'cancelada'
        ];

        if (estadosNoAsignables.includes(estadoAnterior)) {
            return res.status(400).json({
                success: false,
                message: 'No se puede asignar una incidencia resuelta, cerrada o cancelada'
            });
        }

        const [responsables] = await db.query(
            `
            SELECT id, nombre, area_id, activo, unidad_negocio_id
            FROM usuarios
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                responsable_usuario_id,
                usuarioSolicitante.unidad_negocio_id
            ]
        );

        if (responsables.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Responsable no encontrado'
            });
        }

        const responsable = responsables[0];

        if (!responsable.activo) {
            return res.status(400).json({
                success: false,
                message: 'El responsable seleccionado está inactivo'
            });
        }

        if (
            !esAdministrador(usuarioSolicitante) &&
            Number(usuarioSolicitante.area_id) !== Number(areaResponsableId)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Solo el área que atiende puede asignar esta incidencia'
            });
        }

        if (
            !esAdministrador(usuarioSolicitante) &&
            Number(responsable.area_id) !== Number(areaResponsableId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Selecciona un responsable del área que atiende la incidencia'
            });
        }

        const estadoNuevo = [
            'nueva',
            'asignada'
        ].includes(estadoAnterior)
            ? 'en_proceso'
            : estadoAnterior;

        await db.query(
            `
            UPDATE incidencias
            SET
                usuario_asignado_id = ?,
                estado = ?,
                fecha_asignacion = COALESCE(fecha_asignacion, NOW()),
                fecha_inicio_atencion = CASE
                    WHEN ? = 'en_proceso'
                    THEN COALESCE(fecha_inicio_atencion, NOW())
                    ELSE fecha_inicio_atencion
                END
            WHERE id = ?
              AND unidad_negocio_id = ?
            `,
            [
                responsable_usuario_id,
                estadoNuevo,
                estadoNuevo,
                id,
                usuarioSolicitante.unidad_negocio_id
            ]
        );

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion: 'Incidencia asignada',
            estadoAnterior,
            estadoNuevo,
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
        const {
            estado,
            comentario = '',
            solucion_aplicada = '',
            causa_raiz = '',
            observacion_cierre = ''
        } = req.body;

        if (!validarEstado(estado)) {
            return res.status(400).json({
                success: false,
                message: 'El estado seleccionado no es válido'
            });
        }

        const [usuariosSolicitantes] = await db.query(
            `
            SELECT id, rol, area_id, unidad_negocio_id, activo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (
            usuariosSolicitantes.length === 0 ||
            !usuariosSolicitantes[0].activo
        ) {
            return res.status(403).json({
                success: false,
                message: 'El usuario no esta activo o ya no existe'
            });
        }

        const usuarioSolicitante = usuariosSolicitantes[0];

        const [incidencias] = await db.query(
            `
            SELECT id, estado, fecha_inicio_atencion,
                   area_origen_id, area_responsable_id,
                   unidad_negocio_id, usuario_creador_id,
                   usuario_asignado_id, titulo
            FROM incidencias
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                id,
                usuarioSolicitante.unidad_negocio_id
            ]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        const estadoAnterior = incidencias[0].estado;
        const incidenciaActual = incidencias[0];
        const errorTransicion = validarTransicionEstado(
            estadoAnterior,
            estado
        );

        if (errorTransicion) {
            return res.status(400).json({
                success: false,
                message: errorTransicion
            });
        }

        if (
            estado === 'pendiente_confirmacion' &&
            !incidencias[0].fecha_inicio_atencion
        ) {
            return res.status(400).json({
                success: false,
                message: 'Debes iniciar atencion antes de resolver la incidencia'
            });
        }

        if (
            estado === 'pendiente_confirmacion' &&
            !solucion_aplicada.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Debes registrar la solucion aplicada antes de solicitar confirmacion'
            });
        }

        if (
            estadoAnterior === 'pendiente_confirmacion' &&
            (
                (
                    Number(usuarioSolicitante.id) !==
                        Number(incidenciaActual.usuario_creador_id) &&
                    Number(usuarioSolicitante.area_id) !==
                        Number(incidenciaActual.area_origen_id)
                ) ||
                Number(usuarioSolicitante.id) ===
                    Number(incidenciaActual.usuario_asignado_id)
            )
        ) {
            return res.status(403).json({
                success: false,
                message: 'Solo el area que reporto, excepto quien atendio la falla, puede confirmar o rechazar la solucion'
            });
        }

        if (
            estado === 'pendiente_confirmacion' &&
            !esAdministrador(usuarioSolicitante) &&
            Number(usuarioSolicitante.area_id) !== Number(incidenciaActual.area_responsable_id) &&
            Number(usuarioSolicitante.id) !== Number(incidenciaActual.usuario_asignado_id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Solo el area responsable puede enviar la solucion a confirmacion'
            });
        }

        if (
            estadoAnterior === 'pendiente_confirmacion' &&
            estado === 'en_proceso' &&
            !comentario.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Indica por que la falla continua'
            });
        }

        if (
            estado === 'cancelada' &&
            !esAdministrador(usuarioSolicitante) &&
            Number(usuarioSolicitante.area_id) !==
                Number(incidenciaActual.area_origen_id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Solo el area que reporto o un administrador puede cancelar la incidencia'
            });
        }

        if (estado === 'cancelada' && !comentario.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Debes indicar el motivo de la cancelacion'
            });
        }

        const campos = [
            'estado = ?'
        ];
        const valores = [
            estado
        ];

        if (estado === 'en_proceso') {
            campos.push(
                'fecha_inicio_atencion = COALESCE(fecha_inicio_atencion, NOW())'
            );

            if (estadoAnterior === 'pendiente_confirmacion') {
                campos.push('fecha_resolucion = NULL');
            }
        }

        if (estado === 'pendiente_confirmacion') {
            campos.push(
                'fecha_resolucion = NOW()',
                'solucion_aplicada = ?'
            );
            valores.push(solucion_aplicada.trim());

            if (causa_raiz.trim()) {
                campos.push('causa_raiz = ?');
                valores.push(causa_raiz.trim());
            }
        }

        if (estado === 'cerrada' || estado === 'cancelada') {
            campos.push('fecha_cierre = NOW()');

            if (
                estado === 'cerrada' &&
                estadoAnterior === 'pendiente_confirmacion'
            ) {
                campos.push(
                    "observacion_cierre = COALESCE(observacion_cierre, 'Solucion confirmada por el area que reporto')"
                );
            }

            if (estado === 'cerrada' && observacion_cierre.trim()) {
                campos.push('observacion_cierre = ?');
                valores.push(observacion_cierre.trim());
            }
        }

        valores.push(id);
        await db.query(
            `
            UPDATE incidencias
            SET ${campos.join(', ')}
            WHERE id = ?
              AND unidad_negocio_id = ?
            `,
            [
                ...valores,
                usuarioSolicitante.unidad_negocio_id
            ]
        );

        await registrarHistorial({
            incidenciaId: id,
            usuarioId: req.user.id,
            accion:
                estadoAnterior === 'pendiente_confirmacion' &&
                estado === 'en_proceso'
                    ? 'Falla reportada nuevamente'
                    : ACCIONES_ESTADO[estado] || `Estado cambiado a ${estado}`,
            estadoAnterior,
            estadoNuevo: estado,
            comentario:
                comentario?.trim() ||
                solucion_aplicada.trim() ||
                observacion_cierre.trim() ||
                null
        });

        if (estado === 'pendiente_confirmacion') {
            await crearNotificacionIncidencia({
                incidenciaId: Number(id),
                areaId: incidenciaActual.area_origen_id,
                unidadNegocioId: incidenciaActual.unidad_negocio_id,
                tipo: 'cambio_estado',
                titulo: 'Solucion pendiente de confirmacion',
                mensaje: `${incidenciaActual.titulo}: el area responsable indico que la falla fue atendida. Confirma si ya quedo resuelta.`
            });
        }

        if (
            estadoAnterior === 'pendiente_confirmacion' &&
            estado === 'en_proceso'
        ) {
            await crearNotificacionIncidencia({
                incidenciaId: Number(id),
                areaId: incidenciaActual.area_responsable_id,
                unidadNegocioId: incidenciaActual.unidad_negocio_id,
                tipo: 'cambio_estado',
                titulo: 'La falla continua',
                mensaje: `${incidenciaActual.titulo}: el area que reporto rechazo la solucion. Motivo: ${comentario.trim()}`
            });
        }

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
            SELECT id, estado, usuario_asignado_id
            FROM incidencias
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [
                id,
                req.user.unidad_negocio_id
            ]
        );

        if (incidencias.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }


        if (
            incidencias[0].estado === 'pendiente_confirmacion' &&
            Number(incidencias[0].usuario_asignado_id) ===
                Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'La incidencia esta esperando confirmacion del area que reporto'
            });
        }

        await db.query(
            `
            INSERT INTO comentarios_incidencias (
                incidencia_id,
                usuario_id,
                comentario,
                es_interno
            )
            VALUES (?, ?, ?, 1)
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
    obtenerResponsables,
    obtenerIncidenciaPorId,
    crearIncidencia,
    asignarIncidencia,
    cambiarEstadoIncidencia,
    agregarComentario
};
