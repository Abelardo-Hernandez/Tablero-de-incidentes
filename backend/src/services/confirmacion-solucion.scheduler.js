const db = require('../config/db');

const {
    crearNotificacionIncidencia
} = require('./notificaciones.service');

const PLAZO_CONFIRMACION_MINUTOS = 60;

let intervalo = null;
let ejecutando = false;

async function resolverConfirmacionesVencidas() {
    if (ejecutando) return;

    ejecutando = true;

    try {
        const [pendientes] = await db.query(
            `
            SELECT
                id,
                titulo,
                area_origen_id,
                unidad_negocio_id
            FROM incidencias
            WHERE estado = 'pendiente_confirmacion'
              AND fecha_resolucion IS NOT NULL
              AND fecha_resolucion <= DATE_SUB(
                  NOW(),
                  INTERVAL ? MINUTE
              )
            ORDER BY fecha_resolucion ASC
            `,
            [PLAZO_CONFIRMACION_MINUTOS]
        );

        for (const incidencia of pendientes) {
            const [resultado] = await db.query(
                `
                UPDATE incidencias
                SET estado = 'cerrada',
                    fecha_cierre = NOW(),
                    observacion_cierre = COALESCE(
                        observacion_cierre,
                        'Solucion confirmada automaticamente por vencimiento del plazo de 1 hora'
                    )
                WHERE id = ?
                  AND estado = 'pendiente_confirmacion'
                  AND fecha_resolucion <= DATE_SUB(
                      NOW(),
                      INTERVAL ? MINUTE
                  )
                `,
                [
                    incidencia.id,
                    PLAZO_CONFIRMACION_MINUTOS
                ]
            );

            if (resultado.affectedRows === 0) continue;

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
                VALUES (?, NULL, 'cierre', 'estado', ?, ?, ?)
                `,
                [
                    incidencia.id,
                    'pendiente_confirmacion',
                    'cerrada',
                    'Solucion confirmada automaticamente por vencimiento del plazo de 1 hora.'
                ]
            );

            await crearNotificacionIncidencia({
                incidenciaId: incidencia.id,
                areaId: incidencia.area_origen_id,
                unidadNegocioId: incidencia.unidad_negocio_id,
                tipo: 'incidencia_cerrada',
                titulo: 'Solucion confirmada automaticamente',
                mensaje: `${incidencia.titulo}: el plazo de confirmacion de 1 hora vencio sin respuesta y la incidencia quedo cerrada.`
            });
        }
    } catch (error) {
        console.error(
            'Error al revisar confirmaciones de solucion:',
            error
        );
    } finally {
        ejecutando = false;
    }
}

function iniciarProgramadorConfirmacionSolucion() {
    if (intervalo) return;

    resolverConfirmacionesVencidas();
    intervalo = setInterval(
        resolverConfirmacionesVencidas,
        60 * 1000
    );
}

module.exports = {
    iniciarProgramadorConfirmacionSolucion,
    resolverConfirmacionesVencidas
};
