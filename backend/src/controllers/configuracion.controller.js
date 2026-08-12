const db = require('../config/db');

const {
    enviarResumenDiario,
    fechaLocalISO
} = require('../services/reporte-diario.service');

function unidadActual(req) {
    return req.user.unidad_negocio_id;
}

function horaValida(hora) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora || ''));
}

function esSuperAdmin(req) {
    return req.user?.rol === 'super_admin';
}

async function asegurarConfiguracion(unidadNegocioId) {
    await db.query(
        `
        INSERT INTO config_envio_diario (
            unidad_negocio_id,
            activo,
            hora_envio
        )
        VALUES (?, 0, '17:00:00')
        ON DUPLICATE KEY UPDATE
            unidad_negocio_id = unidad_negocio_id
        `,
        [unidadNegocioId]
    );

    const [[configuracion]] = await db.query(
        `
        SELECT
            id,
            unidad_negocio_id,
            activo,
            LEFT(hora_envio, 5) AS hora_envio,
            fecha_ultimo_envio
        FROM config_envio_diario
        WHERE unidad_negocio_id = ?
        LIMIT 1
        `,
        [unidadNegocioId]
    );

    return configuracion;
}

async function obtenerConfigEnvioDiario(req, res) {
    try {
        const unidadNegocioId = unidadActual(req);
        const configuracion = await asegurarConfiguracion(
            unidadNegocioId
        );
        const [destinatarios] = await db.query(
            `
            SELECT usuario_id
            FROM config_envio_diario_destinatarios
            WHERE config_id = ?
            `,
            [configuracion.id]
        );

        return res.json({
            success: true,
            data: {
                activo: Boolean(configuracion.activo),
                hora_envio: configuracion.hora_envio,
                fecha_ultimo_envio:
                    configuracion.fecha_ultimo_envio || null,
                destinatarios: destinatarios.map((item) =>
                    Number(item.usuario_id)
                )
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener configuracion de envio diario:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener la configuracion de envio diario'
        });
    }
}

async function guardarConfigEnvioDiario(req, res) {
    const connection = await db.getConnection();

    try {
        const unidadNegocioId = unidadActual(req);
        const {
            activo = false,
            hora_envio = '17:00',
            destinatarios = []
        } = req.body;

        if (!horaValida(hora_envio)) {
            return res.status(400).json({
                success: false,
                message: 'La hora de envio no es valida'
            });
        }

        await connection.beginTransaction();

        const configuracion = await asegurarConfiguracion(
            unidadNegocioId
        );
        const idsDestinatarios = [
            ...new Set(
                destinatarios
                    .map((id) => Number(id))
                    .filter(Boolean)
            )
        ];

        if (idsDestinatarios.length > 0) {
            const condicionesUsuarios = [
                'activo = 1',
                "correo IS NOT NULL",
                "correo <> ''",
                'id IN (?)'
            ];
            const valoresUsuarios = [idsDestinatarios];

            if (!esSuperAdmin(req)) {
                condicionesUsuarios.unshift(
                    'unidad_negocio_id = ?'
                );
                valoresUsuarios.unshift(unidadNegocioId);
            }

            const [usuariosValidos] = await connection.query(
                `
                SELECT id
                FROM usuarios
                WHERE ${condicionesUsuarios.join(' AND ')}
                `,
                valoresUsuarios
            );
            const validos = new Set(
                usuariosValidos.map((usuario) => Number(usuario.id))
            );

            if (
                idsDestinatarios.some((id) => !validos.has(id))
            ) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: esSuperAdmin(req)
                        ? 'Selecciona destinatarios activos con correo'
                        : 'Selecciona destinatarios activos con correo de tu unidad'
                });
            }
        }

        await connection.query(
            `
            UPDATE config_envio_diario
            SET activo = ?,
                hora_envio = ?,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                Boolean(activo),
                `${hora_envio}:00`,
                configuracion.id
            ]
        );

        await connection.query(
            `
            DELETE FROM config_envio_diario_destinatarios
            WHERE config_id = ?
            `,
            [configuracion.id]
        );

        if (idsDestinatarios.length > 0) {
            await connection.query(
                `
                INSERT INTO config_envio_diario_destinatarios (
                    config_id,
                    usuario_id
                )
                VALUES ?
                `,
                [
                    idsDestinatarios.map((id) => [
                        configuracion.id,
                        id
                    ])
                ]
            );
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'Configuracion de envio diario guardada'
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            'Error al guardar configuracion de envio diario:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'No fue posible guardar la configuracion de envio diario'
        });
    } finally {
        connection.release();
    }
}

async function enviarResumenDiarioPrueba(req, res) {
    try {
        const unidadNegocioId = unidadActual(req);
        const configuracion = await asegurarConfiguracion(
            unidadNegocioId
        );
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
            [configuracion.id]
        );

        const correos = destinatarios.map((item) => item.correo);

        if (correos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selecciona al menos un destinatario con correo'
            });
        }

        const resultado = await enviarResumenDiario({
            unidadNegocioId,
            destinatarios: correos,
            fecha: fechaLocalISO()
        });

        return res.json({
            success: true,
            data: resultado,
            message: resultado.enviado
                ? 'Resumen diario enviado'
                : 'No fue posible enviar el resumen diario'
        });
    } catch (error) {
        console.error(
            'Error al enviar resumen diario de prueba:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'No fue posible enviar el resumen diario'
        });
    }
}

module.exports = {
    enviarResumenDiarioPrueba,
    guardarConfigEnvioDiario,
    obtenerConfigEnvioDiario
};
