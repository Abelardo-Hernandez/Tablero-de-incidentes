const webPush = require('web-push');

const db = require('../config/db');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT =
    process.env.VAPID_SUBJECT || 'mailto:admin@localhost';

let tablaPushAsegurada = false;

async function asegurarTablaPush() {
    if (tablaPushAsegurada) return;

    await db.query(
        `
        CREATE TABLE IF NOT EXISTS push_suscripciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            unidad_negocio_id INT NOT NULL,
            area_id INT NULL,
            endpoint VARCHAR(500) NOT NULL,
            p256dh VARCHAR(255) NOT NULL,
            auth VARCHAR(255) NOT NULL,
            user_agent VARCHAR(500) NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_push_endpoint (endpoint),
            KEY idx_push_usuario (usuario_id),
            KEY idx_push_unidad_area (unidad_negocio_id, area_id, activo),
            CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id)
                REFERENCES usuarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_push_unidad FOREIGN KEY (unidad_negocio_id)
                REFERENCES unidades_negocio(id),
            CONSTRAINT fk_push_area FOREIGN KEY (area_id)
                REFERENCES areas(id) ON DELETE SET NULL
        )
        `
    );

    tablaPushAsegurada = true;
}

function pushConfigurado() {
    return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

function configurarPush() {
    if (!pushConfigurado()) {
        return;
    }

    webPush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

function obtenerClavePublica() {
    return VAPID_PUBLIC_KEY;
}

async function guardarSuscripcion({
    usuario,
    suscripcion,
    userAgent
}) {
    await asegurarTablaPush();
    if (
        !suscripcion?.endpoint ||
        !suscripcion?.keys?.p256dh ||
        !suscripcion?.keys?.auth
    ) {
        const error = new Error('Suscripcion push invalida');
        error.statusCode = 400;
        throw error;
    }

    await db.query(
        `
        INSERT INTO push_suscripciones (
            usuario_id,
            unidad_negocio_id,
            area_id,
            endpoint,
            p256dh,
            auth,
            user_agent,
            activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            usuario_id = VALUES(usuario_id),
            unidad_negocio_id = VALUES(unidad_negocio_id),
            area_id = VALUES(area_id),
            p256dh = VALUES(p256dh),
            auth = VALUES(auth),
            user_agent = VALUES(user_agent),
            activo = 1,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `,
        [
            usuario.id,
            usuario.unidad_negocio_id,
            usuario.area_id || null,
            suscripcion.endpoint,
            suscripcion.keys.p256dh,
            suscripcion.keys.auth,
            userAgent || null
        ]
    );
}

async function eliminarSuscripcion({
    usuarioId,
    endpoint
}) {
    await asegurarTablaPush();
    if (!endpoint) {
        return;
    }

    await db.query(
        `
        UPDATE push_suscripciones
        SET activo = 0,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE usuario_id = ?
          AND endpoint = ?
        `,
        [
            usuarioId,
            endpoint
        ]
    );
}

async function desactivarSuscripcion(endpoint) {
    await asegurarTablaPush();
    await db.query(
        `
        UPDATE push_suscripciones
        SET activo = 0,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE endpoint = ?
        `,
        [endpoint]
    );
}

async function notificarNuevaIncidencia({
    incidenciaId,
    titulo,
    prioridad,
    areaResponsableId,
    unidadNegocioId,
    lineaId = null
}) {
    if (!pushConfigurado()) {
        return;
    }

    await asegurarTablaPush();

    configurarPush();

    const [suscripciones] = await db.query(
        `
        SELECT
            ps.endpoint,
            ps.p256dh,
            ps.auth
        FROM push_suscripciones ps
        INNER JOIN usuarios u
            ON u.id = ps.usuario_id
        WHERE ps.activo = 1
          AND u.activo = 1
          AND ps.unidad_negocio_id = ?
          AND (
              u.rol IN ('administrador', 'super_admin')
              OR ps.area_id = ?
          )
        `,
        [
            unidadNegocioId,
            areaResponsableId
        ]
    );

    if (suscripciones.length === 0) {
        return;
    }

    let lineaNombre = '';

    if (lineaId) {
        const [lineas] = await db.query(
            `
            SELECT nombre
            FROM lineas
            WHERE id = ?
              AND unidad_negocio_id = ?
            LIMIT 1
            `,
            [lineaId, unidadNegocioId]
        );

        lineaNombre = lineas[0]?.nombre || '';
    }

    const folio = `INC-${String(incidenciaId).padStart(6, '0')}`;
    const payload = JSON.stringify({
        title: `${folio} - Nueva incidencia`,
        body: lineaNombre
            ? `Línea: ${lineaNombre} · ${titulo}`
            : titulo,
        url: '/incidencias',
        prioridad
    });

    await Promise.allSettled(
        suscripciones.map(async (suscripcion) => {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: suscripcion.endpoint,
                        keys: {
                            p256dh: suscripcion.p256dh,
                            auth: suscripcion.auth
                        }
                    },
                    payload
                );
            } catch (error) {
                if (
                    error.statusCode === 404 ||
                    error.statusCode === 410
                ) {
                    await desactivarSuscripcion(
                        suscripcion.endpoint
                    );
                } else {
                    console.warn(
                        'No fue posible enviar push:',
                        error.message
                    );
                }
            }
        })
    );
}

module.exports = {
    asegurarTablaPush,
    eliminarSuscripcion,
    guardarSuscripcion,
    notificarNuevaIncidencia,
    obtenerClavePublica,
    pushConfigurado
};
