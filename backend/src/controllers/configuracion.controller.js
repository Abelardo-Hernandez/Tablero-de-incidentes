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

const CONFIGURACION_GENERAL = {
    nombreSistema: ['nombre_sistema', 'texto'],
    empresa: ['nombre_empresa', 'texto'],
    zonaHoraria: ['zona_horaria', 'texto'],
    prioridadDefault: ['prioridad_default', 'texto'],
    tiempoPrimeraRespuesta: ['tiempo_primera_respuesta', 'numero'],
    tiempoResolucion: ['tiempo_resolucion', 'numero'],
    notificacionesPantalla: ['notificaciones_pantalla', 'booleano'],
    sonidoAlertas: ['sonido_alertas', 'booleano'],
    resumenDiario: ['resumen_diario', 'booleano']
};

const VALORES_CONFIGURACION_GENERAL = {
    nombreSistema: 'Centro de incidencias',
    empresa: 'Confecciones Punto Textil',
    zonaHoraria: 'America/Mexico_City',
    prioridadDefault: 'media',
    tiempoPrimeraRespuesta: 15,
    tiempoResolucion: 120,
    notificacionesPantalla: true,
    sonidoAlertas: false,
    resumenDiario: true
};

function unidadTvSolicitada(req) {
    const solicitada = Number(
        req.query?.unidad_negocio_id || req.body?.unidad_negocio_id
    );
    return esSuperAdmin(req) && solicitada
        ? solicitada
        : Number(req.user.unidad_negocio_id);
}

async function asegurarConfiguracionTv(unidadNegocioId, connection = db) {
    await connection.query(
        `INSERT INTO configuracion_tv_unidad (unidad_negocio_id)
         VALUES (?) ON DUPLICATE KEY UPDATE unidad_negocio_id = unidad_negocio_id`,
        [unidadNegocioId]
    );
    const [[configuracion]] = await connection.query(
        `SELECT unidad_negocio_id, mostrar_videos, ruta_videos,
                mostrar_cerradas, refresco_segundos
         FROM configuracion_tv_unidad WHERE unidad_negocio_id = ? LIMIT 1`,
        [unidadNegocioId]
    );
    return configuracion;
}

function convertirConfiguracionTv(configuracion) {
    return {
        unidadNegocioId: Number(configuracion.unidad_negocio_id),
        mostrarVideosTv: Boolean(configuracion.mostrar_videos),
        rutaVideos: configuracion.ruta_videos || '',
        mostrarCerradasTv: Boolean(configuracion.mostrar_cerradas),
        refrescoTv: Number(configuracion.refresco_segundos)
    };
}

async function asegurarConfiguracionGeneral() {
    await Promise.all(
        Object.entries(CONFIGURACION_GENERAL).map(
            ([campo, [clave, tipo]]) => db.query(
                `
                INSERT INTO configuracion (
                    clave, valor, tipo, categoria, editable
                )
                VALUES (?, ?, ?, 'sistema', 1)
                ON DUPLICATE KEY UPDATE clave = clave
                `,
                [clave, String(VALORES_CONFIGURACION_GENERAL[campo]), tipo]
            )
        )
    );
}

function convertirValorConfiguracion(valor, tipo) {
    if (tipo === 'numero') return Number(valor);
    if (tipo === 'booleano') return valor === 'true' || valor === '1';
    return valor;
}

async function obtenerConfiguracionGeneral(req, res) {
    try {
        await asegurarConfiguracionGeneral();
        const claves = Object.values(CONFIGURACION_GENERAL).map(
            ([clave]) => clave
        );
        const [filas] = await db.query(
            'SELECT clave, valor, tipo FROM configuracion WHERE clave IN (?)',
            [claves]
        );
        const porClave = new Map(filas.map((fila) => [fila.clave, fila]));
        const data = {};

        Object.entries(CONFIGURACION_GENERAL).forEach(
            ([campo, [clave, tipo]]) => {
                const fila = porClave.get(clave);
                if (fila) {
                    data[campo] = convertirValorConfiguracion(
                        fila.valor,
                        tipo
                    );
                }
            }
        );

        const configTv = await asegurarConfiguracionTv(
            Number(req.user.unidad_negocio_id)
        );
        Object.assign(data, convertirConfiguracionTv(configTv));

        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error al obtener configuracion general:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener la configuracion general'
        });
    }
}

async function guardarConfiguracionGeneral(req, res) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const [campo, [clave, tipo]] of Object.entries(CONFIGURACION_GENERAL)) {
            if (req.body[campo] === undefined) continue;

            const valor = String(req.body[campo]);
            await connection.query(
                `
                INSERT INTO configuracion (clave, valor, tipo, categoria, editable)
                VALUES (?, ?, ?, 'sistema', 1)
                ON DUPLICATE KEY UPDATE
                    valor = VALUES(valor),
                    tipo = VALUES(tipo),
                    fecha_actualizacion = CURRENT_TIMESTAMP
                `,
                [clave, valor, tipo]
            );
        }

        await connection.commit();
        return res.json({
            success: true,
            message: 'Configuracion general guardada'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al guardar configuracion general:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible guardar la configuracion general'
        });
    } finally {
        connection.release();
    }
}

async function obtenerConfiguracionTv(req, res) {
    try {
        const unidadNegocioId = unidadTvSolicitada(req);
        const configuracion = await asegurarConfiguracionTv(unidadNegocioId);
        return res.json({ success: true, data: convertirConfiguracionTv(configuracion) });
    } catch (error) {
        console.error('Error al obtener configuracion TV:', error);
        return res.status(500).json({ success: false, message: 'No fue posible obtener la configuracion TV' });
    }
}

async function guardarConfiguracionTv(req, res) {
    try {
        const unidadNegocioId = unidadTvSolicitada(req);
        const refresco = Number(req.body.refrescoTv);
        if (!Number.isFinite(refresco) || refresco < 5 || refresco > 3600) {
            return res.status(400).json({ success: false, message: 'El refresco de TV debe estar entre 5 y 3600 segundos' });
        }
        const [unidades] = await db.query(
            'SELECT id FROM unidades_negocio WHERE id = ? AND activo = 1 LIMIT 1',
            [unidadNegocioId]
        );
        if (!unidades[0]) {
            return res.status(404).json({ success: false, message: 'Unidad de negocio no encontrada' });
        }
        await asegurarConfiguracionTv(unidadNegocioId);
        await db.query(
            `UPDATE configuracion_tv_unidad SET mostrar_videos = ?,
             mostrar_cerradas = ?, refresco_segundos = ? WHERE unidad_negocio_id = ?`,
            [Boolean(req.body.mostrarVideosTv), Boolean(req.body.mostrarCerradasTv), refresco, unidadNegocioId]
        );
        const configuracion = await asegurarConfiguracionTv(unidadNegocioId);
        return res.json({ success: true, message: 'Configuracion TV guardada', data: convertirConfiguracionTv(configuracion) });
    } catch (error) {
        console.error('Error al guardar configuracion TV:', error);
        return res.status(500).json({ success: false, message: 'No fue posible guardar la configuracion TV' });
    }
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
    asegurarConfiguracionGeneral,
    enviarResumenDiarioPrueba,
    guardarConfigEnvioDiario,
    guardarConfiguracionGeneral,
    guardarConfiguracionTv,
    obtenerConfigEnvioDiario,
    obtenerConfiguracionGeneral,
    obtenerConfiguracionTv,
    asegurarConfiguracionTv
};
