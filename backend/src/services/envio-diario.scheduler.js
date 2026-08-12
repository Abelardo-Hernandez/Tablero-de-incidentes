const db = require('../config/db');

const {
    correoConfigurado
} = require('./correo.service');

const {
    enviarResumenDiario,
    fechaLocalISO,
    horaLocal
} = require('./reporte-diario.service');

let intervalo = null;
let ejecutando = false;

async function obtenerDestinatarios(configuracionId) {
    const [destinatarios] = await db.query(
        `
        SELECT DISTINCT u.correo
        FROM config_envio_diario_destinatarios d
        INNER JOIN usuarios u
            ON u.id = d.usuario_id
        WHERE d.config_id = ?
          AND u.activo = 1
          AND u.correo IS NOT NULL
          AND u.correo <> ''
        `,
        [configuracionId]
    );

    return destinatarios.map((item) => item.correo);
}

async function revisarEnviosPendientes() {
    if (ejecutando || !correoConfigurado()) {
        return;
    }

    ejecutando = true;

    try {
        const hoy = fechaLocalISO();
        const horaActual = horaLocal();
        const [configuraciones] = await db.query(
            `
            SELECT
                id,
                unidad_negocio_id,
                hora_envio,
                fecha_ultimo_envio
            FROM config_envio_diario
            WHERE activo = 1
              AND LEFT(hora_envio, 5) <= ?
              AND (
                  fecha_ultimo_envio IS NULL
                  OR fecha_ultimo_envio <> ?
              )
              AND EXISTS (
                  SELECT 1
                  FROM config_envio_diario_destinatarios d
                  INNER JOIN usuarios u
                      ON u.id = d.usuario_id
                  WHERE d.config_id = config_envio_diario.id
                    AND u.activo = 1
                    AND u.correo IS NOT NULL
                    AND u.correo <> ''
              )
            `,
            [
                horaActual,
                hoy
            ]
        );

        for (const configuracion of configuraciones) {
            const destinatarios = await obtenerDestinatarios(
                configuracion.id
            );

            const resultado = await enviarResumenDiario({
                unidadNegocioId: configuracion.unidad_negocio_id,
                destinatarios,
                fecha: hoy
            });

            if (resultado.enviado) {
                await db.query(
                    `
                    UPDATE config_envio_diario
                    SET fecha_ultimo_envio = ?,
                        fecha_actualizacion = CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [
                        hoy,
                        configuracion.id
                    ]
                );
            }
        }
    } catch (error) {
        console.error(
            'Error al revisar envio diario automatico:',
            error
        );
    } finally {
        ejecutando = false;
    }
}

function iniciarProgramadorEnvioDiario() {
    if (intervalo) {
        return;
    }

    revisarEnviosPendientes();

    intervalo = setInterval(
        revisarEnviosPendientes,
        60 * 1000
    );
}

module.exports = {
    iniciarProgramadorEnvioDiario,
    revisarEnviosPendientes
};
