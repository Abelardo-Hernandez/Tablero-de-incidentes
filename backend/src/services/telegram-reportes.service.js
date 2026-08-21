const db = require('../config/db');
const { crearNotificacionIncidencia } = require('./notificaciones.service');
const { asegurarCatalogoTiposFalla } = require('./tipos-falla.service');
const { enviarMensaje, responderCallback } = require('./telegram-api.service');

const TECLADO_QUITAR = { reply_markup: { remove_keyboard: true } };

function teclado(opciones) {
    return {
        reply_markup: {
            keyboard: opciones.map((opcion) => [opcion]),
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
}

function accionesAtencion(incidenciaId) {
    return {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Agregar comentario', callback_data: `comentar:${incidenciaId}` },
                { text: 'Enviar solucion', callback_data: `solucion:${incidenciaId}` }
            ]]
        }
    };
}

async function guardarConversacion(usuario, paso, datos = {}) {
    await db.query(
        `INSERT INTO telegram_conversaciones
            (usuario_id, telegram_chat_id, paso, datos_json, fecha_ultimo_mensaje, fecha_expiracion)
         VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 2 HOUR))
         ON DUPLICATE KEY UPDATE telegram_chat_id = VALUES(telegram_chat_id),
            paso = VALUES(paso), datos_json = VALUES(datos_json),
            fecha_ultimo_mensaje = NOW(), fecha_expiracion = VALUES(fecha_expiracion)`,
        [usuario.id, usuario.telegram_chat_id, paso, JSON.stringify(datos)]
    );
}

async function cancelar(usuario, mensaje = 'Reporte cancelado. Puedes iniciar otro con /reporte.') {
    await db.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuario.id]);
    await enviarMensaje(usuario.telegram_chat_id, mensaje, TECLADO_QUITAR);
}

async function iniciarReporte(usuario) {
    await guardarConversacion(usuario, 'titulo', {});
    await enviarMensaje(
        usuario.telegram_chat_id,
        'Nuevo reporte\n\nEscribe un titulo breve para identificar la falla.\n\nPuedes escribir /cancelar en cualquier momento.',
        TECLADO_QUITAR
    );
}

function seleccionarNumero(texto, opciones) {
    const indice = Number(String(texto).trim()) - 1;
    return Number.isInteger(indice) && opciones[indice] ? opciones[indice] : null;
}

function listaNumerada(opciones) {
    return opciones.map((opcion, indice) => `${indice + 1}. ${opcion.nombre}`).join('\n');
}

async function crearIncidencia(usuario, datos, updateId) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const prioridad = datos.detuvo_linea ? 'critica' : datos.prioridad;
        const [resultado] = await connection.query(
            `INSERT INTO incidencias (
                titulo, unidad_negocio_id, descripcion, tipo, prioridad,
                detuvo_linea, estado, linea_id, turno_id, area_origen_id,
                area_responsable_id, usuario_creador_id, usuario_asignado_id,
                canal_origen, telegram_update_id
             ) VALUES (?, ?, ?, ?, ?, ?, 'nueva', ?, NULL, ?, ?, ?, NULL, 'telegram', ?)`,
            [
                datos.titulo, usuario.unidad_negocio_id, datos.descripcion,
                datos.tipo.clave, prioridad, datos.detuvo_linea,
                usuario.linea_id || null, usuario.area_id,
                datos.area.id, usuario.id, updateId
            ]
        );
        const incidenciaId = resultado.insertId;
        await connection.query(
            `INSERT INTO historial_incidencias
                (incidencia_id, usuario_id, accion, campo_modificado, valor_nuevo, comentario)
             VALUES (?, ?, 'creacion', 'estado', 'nueva', 'Incidencia creada desde Telegram')`,
            [incidenciaId, usuario.id]
        );
        await connection.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuario.id]);
        await connection.commit();
        return { incidenciaId, prioridad };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function notificarDepartamento(usuario, datos, incidenciaId, prioridad) {
    const folio = `INC-${String(incidenciaId).padStart(6, '0')}`;
    await crearNotificacionIncidencia({
        incidenciaId,
        areaId: datos.area.id,
        unidadNegocioId: usuario.unidad_negocio_id,
        tipo: 'nueva_incidencia',
        titulo: prioridad === 'critica' ? 'Nueva incidencia critica' : 'Nueva incidencia',
        mensaje: datos.titulo
    });

    const [destinatarios] = await db.query(
        `SELECT telegram_chat_id FROM usuarios
         WHERE activo = 1 AND telegram_habilitado = 1
           AND telegram_chat_id IS NOT NULL AND unidad_negocio_id = ?
           AND (area_id = ? OR rol IN ('administrador', 'super_admin'))
           AND id <> ?`,
        [usuario.unidad_negocio_id, datos.area.id, usuario.id]
    );
    const texto = `Nueva incidencia ${folio}\n${datos.titulo}\nPrioridad: ${prioridad}\nReporta: ${usuario.nombre}\nArea responsable: ${datos.area.nombre}`;
    await Promise.allSettled(
        destinatarios.map((destinatario) => enviarMensaje(
            destinatario.telegram_chat_id,
            texto,
            { reply_markup: { inline_keyboard: [[{ text: 'Tomar incidencia', callback_data: `tomar:${incidenciaId}` }]] } }
        ))
    );
}

async function mostrarEstado(usuario) {
    const [incidencias] = await db.query(
        `SELECT id, titulo, estado, prioridad FROM incidencias
         WHERE usuario_creador_id = ? ORDER BY fecha_creacion DESC LIMIT 5`,
        [usuario.id]
    );
    const [asignadas] = await db.query(
        `SELECT id, titulo, estado, prioridad FROM incidencias
         WHERE usuario_asignado_id = ? AND estado = 'en_proceso'
         ORDER BY fecha_inicio_atencion DESC LIMIT 5`,
        [usuario.id]
    );
    if (!incidencias.length && !asignadas.length) {
        await enviarMensaje(usuario.telegram_chat_id, 'No tienes reportes registrados ni incidencias en atencion. Usa /reporte para crear una.');
        return;
    }
    if (incidencias.length) {
        const lineas = incidencias.map((item) =>
            `INC-${String(item.id).padStart(6, '0')} · ${item.estado}\n${item.titulo}`
        );
        await enviarMensaje(usuario.telegram_chat_id, `Tus reportes recientes:\n\n${lineas.join('\n\n')}`);
    }
    for (const item of asignadas) {
        await enviarMensaje(
            usuario.telegram_chat_id,
            `En atencion: INC-${String(item.id).padStart(6, '0')}\n${item.titulo}`,
            accionesAtencion(item.id)
        );
    }
}

async function procesarReporte(usuario, texto, updateId) {
    const comando = texto.trim().toLowerCase().split(/\s+/)[0];
    if (comando === '/cancelar') return cancelar(usuario);
    if (comando === '/reporte') return iniciarReporte(usuario);
    if (comando === '/estado') return mostrarEstado(usuario);
    if (comando === '/ayuda') {
        await enviarMensaje(usuario.telegram_chat_id, 'Comandos disponibles:\n/reporte - crear una incidencia\n/estado - consultar tus ultimos reportes\n/cancelar - cancelar el reporte en curso');
        return;
    }

    const [conversaciones] = await db.query(
        `SELECT paso, datos_json FROM telegram_conversaciones
         WHERE usuario_id = ? AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW()) LIMIT 1`,
        [usuario.id]
    );
    if (!conversaciones[0]) {
        await db.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuario.id]);
        await enviarMensaje(usuario.telegram_chat_id, 'Escribe /reporte para crear una incidencia o /estado para consultar tus reportes.');
        return;
    }

    const { paso } = conversaciones[0];
    const datos = typeof conversaciones[0].datos_json === 'string'
        ? JSON.parse(conversaciones[0].datos_json) : (conversaciones[0].datos_json || {});
    const valor = texto.trim();

    if (paso === 'comentario_incidente') {
        if (valor.length < 2) {
            await enviarMensaje(usuario.telegram_chat_id, 'Escribe el comentario que deseas agregar.');
            return;
        }
        const [resultado] = await db.query(
            `INSERT INTO comentarios_incidencias (incidencia_id, usuario_id, comentario, es_interno)
             SELECT id, ?, ?, 1 FROM incidencias
             WHERE id = ? AND usuario_asignado_id = ? AND estado = 'en_proceso'`,
            [usuario.id, valor, datos.incidencia_id, usuario.id]
        );
        if (!resultado.affectedRows) return cancelar(usuario, 'La incidencia ya no permite comentarios desde esta accion.');
        await db.query(
            `INSERT INTO historial_incidencias (incidencia_id, usuario_id, accion, comentario)
             VALUES (?, ?, 'comentario', ?)`,
            [datos.incidencia_id, usuario.id, valor]
        );
        await db.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuario.id]);
        await enviarMensaje(
            usuario.telegram_chat_id,
            `Comentario agregado a INC-${String(datos.incidencia_id).padStart(6, '0')}.`,
            accionesAtencion(datos.incidencia_id)
        );
        return;
    }

    if (paso === 'solucion_incidente') {
        if (valor.length < 5) {
            await enviarMensaje(usuario.telegram_chat_id, 'Describe con mayor detalle la solucion aplicada.');
            return;
        }
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [incidencias] = await connection.query(
                `SELECT id, titulo, area_origen_id, usuario_creador_id, unidad_negocio_id
                 FROM incidencias WHERE id = ? AND usuario_asignado_id = ?
                   AND estado = 'en_proceso' FOR UPDATE`,
                [datos.incidencia_id, usuario.id]
            );
            if (!incidencias[0]) {
                await connection.rollback();
                return cancelar(usuario, 'La incidencia ya no permite enviar una solucion desde esta accion.');
            }
            await connection.query(
                `UPDATE incidencias SET estado = 'pendiente_confirmacion',
                 solucion_aplicada = ?, fecha_resolucion = NOW() WHERE id = ?`,
                [valor, datos.incidencia_id]
            );
            await connection.query(
                `INSERT INTO historial_incidencias
                    (incidencia_id, usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo, comentario)
                 VALUES (?, ?, 'resolucion', 'estado', 'en_proceso', 'pendiente_confirmacion', ?)`,
                [datos.incidencia_id, usuario.id, valor]
            );
            await connection.query('DELETE FROM telegram_conversaciones WHERE usuario_id = ?', [usuario.id]);
            await connection.commit();

            const incidencia = incidencias[0];
            await crearNotificacionIncidencia({
                incidenciaId: datos.incidencia_id,
                areaId: incidencia.area_origen_id,
                unidadNegocioId: incidencia.unidad_negocio_id,
                tipo: 'cambio_estado',
                titulo: 'Solucion pendiente de confirmacion',
                mensaje: `${incidencia.titulo}: ${valor}`
            });
            const [reportantes] = await db.query(
                `SELECT telegram_chat_id FROM usuarios WHERE id = ?
                 AND telegram_habilitado = 1 AND telegram_chat_id IS NOT NULL`,
                [incidencia.usuario_creador_id]
            );
            if (reportantes[0]) {
                await enviarMensaje(
                    reportantes[0].telegram_chat_id,
                    `Solucion enviada para INC-${String(datos.incidencia_id).padStart(6, '0')}\n\n${valor}\n\nLa incidencia queda pendiente de confirmacion.`
                );
            }
            await enviarMensaje(
                usuario.telegram_chat_id,
                `Solucion registrada. INC-${String(datos.incidencia_id).padStart(6, '0')} queda pendiente de confirmacion.`,
                TECLADO_QUITAR
            );
            return;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    if (paso === 'titulo') {
        if (valor.length < 4 || valor.length > 200) {
            await enviarMensaje(usuario.telegram_chat_id, 'El titulo debe tener entre 4 y 200 caracteres. Intenta nuevamente.');
            return;
        }
        datos.titulo = valor;
        await guardarConversacion(usuario, 'descripcion', datos);
        await enviarMensaje(usuario.telegram_chat_id, 'Describe que ocurrio y cualquier detalle util para atender la falla.');
        return;
    }

    if (paso === 'descripcion') {
        if (valor.length < 5) {
            await enviarMensaje(usuario.telegram_chat_id, 'Agrega un poco mas de detalle a la descripcion.');
            return;
        }
        const [areas] = await db.query(
            `SELECT id, nombre FROM areas WHERE unidad_negocio_id = ? AND activo = 1 ORDER BY nombre`,
            [usuario.unidad_negocio_id]
        );
        datos.descripcion = valor;
        datos.opciones = areas;
        await guardarConversacion(usuario, 'area', datos);
        await enviarMensaje(usuario.telegram_chat_id, `¿Que area debe atender? Responde con el numero:\n\n${listaNumerada(areas)}`);
        return;
    }

    if (paso === 'area') {
        const area = seleccionarNumero(valor, datos.opciones || []);
        if (!area) {
            await enviarMensaje(usuario.telegram_chat_id, 'Seleccion no valida. Responde solamente con uno de los numeros de la lista.');
            return;
        }
        await asegurarCatalogoTiposFalla(usuario.unidad_negocio_id);
        const [tipos] = await db.query(
            `SELECT clave, nombre FROM tipos_falla
             WHERE unidad_negocio_id = ? AND activo = 1 ORDER BY sistema DESC, nombre`,
            [usuario.unidad_negocio_id]
        );
        datos.area = area;
        datos.opciones = tipos;
        await guardarConversacion(usuario, 'tipo', datos);
        await enviarMensaje(usuario.telegram_chat_id, `Selecciona el tipo de falla:\n\n${listaNumerada(tipos)}`);
        return;
    }

    if (paso === 'tipo') {
        const tipo = seleccionarNumero(valor, datos.opciones || []);
        if (!tipo) {
            await enviarMensaje(usuario.telegram_chat_id, 'Seleccion no valida. Responde con el numero del tipo de falla.');
            return;
        }
        datos.tipo = tipo;
        delete datos.opciones;
        await guardarConversacion(usuario, 'detuvo_linea', datos);
        await enviarMensaje(usuario.telegram_chat_id, '¿La falla detuvo la linea?', teclado(['Si', 'No']));
        return;
    }

    if (paso === 'detuvo_linea') {
        const respuesta = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (!['si', 'no'].includes(respuesta)) {
            await enviarMensaje(usuario.telegram_chat_id, 'Selecciona Si o No.', teclado(['Si', 'No']));
            return;
        }
        datos.detuvo_linea = respuesta === 'si';
        if (datos.detuvo_linea) {
            datos.prioridad = 'critica';
            await guardarConversacion(usuario, 'confirmar', datos);
            await enviarMensaje(usuario.telegram_chat_id, resumen(datos), teclado(['Confirmar reporte', 'Cancelar']));
        } else {
            await guardarConversacion(usuario, 'prioridad', datos);
            await enviarMensaje(usuario.telegram_chat_id, 'Selecciona la prioridad:', teclado(['Baja', 'Media', 'Alta']));
        }
        return;
    }

    if (paso === 'prioridad') {
        const prioridad = valor.toLowerCase();
        if (!['baja', 'media', 'alta'].includes(prioridad)) {
            await enviarMensaje(usuario.telegram_chat_id, 'Selecciona Baja, Media o Alta.', teclado(['Baja', 'Media', 'Alta']));
            return;
        }
        datos.prioridad = prioridad;
        await guardarConversacion(usuario, 'confirmar', datos);
        await enviarMensaje(usuario.telegram_chat_id, resumen(datos), teclado(['Confirmar reporte', 'Cancelar']));
        return;
    }

    if (paso === 'confirmar') {
        if (valor.toLowerCase() === 'cancelar') return cancelar(usuario);
        if (valor.toLowerCase() !== 'confirmar reporte') {
            await enviarMensaje(usuario.telegram_chat_id, 'Selecciona Confirmar reporte o Cancelar.', teclado(['Confirmar reporte', 'Cancelar']));
            return;
        }
        const { incidenciaId, prioridad } = await crearIncidencia(usuario, datos, updateId);
        const folio = `INC-${String(incidenciaId).padStart(6, '0')}`;
        await enviarMensaje(usuario.telegram_chat_id, `Reporte creado correctamente\n\nFolio: ${folio}\nEstado: Nueva\n\nTe notificaremos por esta conversacion cuando exista un avance.`, TECLADO_QUITAR);
        notificarDepartamento(usuario, datos, incidenciaId, prioridad).catch((error) =>
            console.warn('No fue posible notificar el reporte de Telegram:', error.message)
        );
    }
}

function resumen(datos) {
    return `Confirma los datos del reporte:\n\nTitulo: ${datos.titulo}\nArea que atiende: ${datos.area.nombre}\nTipo: ${datos.tipo.nombre}\nDetuvo la linea: ${datos.detuvo_linea ? 'Si' : 'No'}\nPrioridad: ${datos.detuvo_linea ? 'Critica' : datos.prioridad}\n\nDescripcion:\n${datos.descripcion}`;
}

async function procesarAccionCallback(usuario, callback) {
    const [accion, idTexto] = String(callback.data || '').split(':');
    const incidenciaId = Number(idTexto);
    if (!Number.isInteger(incidenciaId)) return responderCallback(callback.id, 'Accion no valida');

    if (accion === 'tomar') {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [incidencias] = await connection.query(
                `SELECT id, titulo, estado, usuario_asignado_id, area_responsable_id,
                        area_origen_id, usuario_creador_id, unidad_negocio_id
                 FROM incidencias WHERE id = ? FOR UPDATE`,
                [incidenciaId]
            );
            const incidencia = incidencias[0];
            if (!incidencia || Number(incidencia.unidad_negocio_id) !== Number(usuario.unidad_negocio_id)) {
                await connection.rollback();
                return responderCallback(callback.id, 'Incidencia no disponible');
            }
            if (Number(incidencia.area_responsable_id) !== Number(usuario.area_id) && !['administrador', 'super_admin'].includes(usuario.rol)) {
                await connection.rollback();
                return responderCallback(callback.id, 'No pertenece a tu area');
            }
            if (incidencia.usuario_asignado_id && Number(incidencia.usuario_asignado_id) !== Number(usuario.id)) {
                await connection.rollback();
                return responderCallback(callback.id, 'Otro colaborador ya la tomo');
            }
            if (!['nueva', 'asignada', 'en_proceso'].includes(incidencia.estado)) {
                await connection.rollback();
                return responderCallback(callback.id, 'La incidencia ya no puede tomarse');
            }
            if (!incidencia.usuario_asignado_id) {
                await connection.query(
                    `UPDATE incidencias SET usuario_asignado_id = ?, estado = 'en_proceso',
                     fecha_asignacion = COALESCE(fecha_asignacion, NOW()),
                     fecha_inicio_atencion = COALESCE(fecha_inicio_atencion, NOW()) WHERE id = ?`,
                    [usuario.id, incidenciaId]
                );
                await connection.query(
                    `INSERT INTO historial_incidencias
                        (incidencia_id, usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo, comentario)
                     VALUES (?, ?, 'asignacion_usuario', 'estado', ?, 'en_proceso', ?)`,
                    [incidenciaId, usuario.id, incidencia.estado, `${usuario.nombre} tomo la incidencia desde Telegram`]
                );
            }
            await connection.commit();
            await responderCallback(callback.id, 'Incidencia asignada');
            await enviarMensaje(
                usuario.telegram_chat_id,
                `Tomaste INC-${String(incidenciaId).padStart(6, '0')}\n${incidencia.titulo}\n\nPuedes registrar avances o enviar la solucion.`,
                accionesAtencion(incidenciaId)
            );

            const [avisos] = await db.query(
                `SELECT telegram_chat_id FROM usuarios WHERE activo = 1 AND telegram_habilitado = 1
                 AND telegram_chat_id IS NOT NULL AND unidad_negocio_id = ?
                 AND (area_id = ? OR id = ?) AND id <> ?`,
                [incidencia.unidad_negocio_id, incidencia.area_responsable_id, incidencia.usuario_creador_id, usuario.id]
            );
            await Promise.allSettled(avisos.map((destino) => enviarMensaje(
                destino.telegram_chat_id,
                `INC-${String(incidenciaId).padStart(6, '0')} fue tomada por ${usuario.nombre}.`
            )));
            return;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    if (['comentar', 'solucion'].includes(accion)) {
        const [incidencias] = await db.query(
            `SELECT id FROM incidencias WHERE id = ? AND usuario_asignado_id = ?
             AND estado = 'en_proceso' LIMIT 1`,
            [incidenciaId, usuario.id]
        );
        if (!incidencias[0]) return responderCallback(callback.id, 'Esta accion ya no esta disponible');
        await guardarConversacion(
            usuario,
            accion === 'comentar' ? 'comentario_incidente' : 'solucion_incidente',
            { incidencia_id: incidenciaId }
        );
        await responderCallback(callback.id);
        await enviarMensaje(
            usuario.telegram_chat_id,
            accion === 'comentar'
                ? `Escribe el comentario para INC-${String(incidenciaId).padStart(6, '0')}.`
                : `Describe la solucion aplicada en INC-${String(incidenciaId).padStart(6, '0')}.`,
            TECLADO_QUITAR
        );
    }
}

module.exports = { procesarAccionCallback, procesarReporte };
