const fs = require('fs/promises');
const path = require('path');

const express = require('express');
const db = require('../config/db');

const {
    soloAdministrador,
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

const extensionesPermitidas = new Set([
    '.mp4',
    '.webm',
    '.ogg',
    '.mov'
]);

function unidadSolicitada(req) {
    const solicitada = Number(req.body?.unidad_negocio_id || req.query?.unidad_negocio_id);
    return req.user.rol === 'super_admin' && solicitada
        ? solicitada
        : Number(req.user.unidad_negocio_id);
}

async function obtenerRutaVideos(unidadNegocioId, rutaAlternativa = '') {
    if (rutaAlternativa) {
        return path.resolve(rutaAlternativa);
    }

    const [[configuracion]] = await db.query(
        `
        SELECT ruta_videos
        FROM configuracion_tv_unidad
        WHERE unidad_negocio_id = ?
        LIMIT 1
        `,
        [unidadNegocioId]
    );

    return configuracion?.ruta_videos
        ? path.resolve(configuracion.ruta_videos)
        : path.resolve(__dirname, '../../../frontend/public/videos');
}

async function sincronizarVideos(unidadNegocioId, rutaAlternativa = '') {
    if (!unidadNegocioId) {
        const [unidades] = await db.query('SELECT id FROM unidades_negocio WHERE activo = 1');
        for (const unidad of unidades) {
            await sincronizarVideos(unidad.id);
        }
        return null;
    }

    const videosPath = await obtenerRutaVideos(unidadNegocioId, rutaAlternativa);
    const archivos = await fs.readdir(videosPath, {
        withFileTypes: true
    });
    const nombres = archivos
        .filter((archivo) => archivo.isFile())
        .map((archivo) => archivo.name)
        .filter((nombre) =>
            extensionesPermitidas.has(path.extname(nombre).toLowerCase())
        )
        .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    const rutas = nombres.map((nombre) => path.join(videosPath, nombre));

    await db.query(
        `
        UPDATE videos
        SET activo = 0
        WHERE tipo = 'archivo' AND unidad_negocio_id = ?
        `,
        [unidadNegocioId]
    );

    for (let indice = 0; indice < nombres.length; indice += 1) {
        const [existentes] = await db.query(
        'SELECT id FROM videos WHERE unidad_negocio_id = ? AND tipo = ? AND ruta = ? LIMIT 1',
            [unidadNegocioId, 'archivo', rutas[indice]]
        );

        if (existentes.length > 0) {
            await db.query(
                `
                UPDATE videos
                SET titulo = ?, orden = ?, activo = 1
                WHERE id = ?
                `,
                [nombres[indice], indice + 1, existentes[0].id]
            );
        } else {
            await db.query(
                `
                INSERT INTO videos (unidad_negocio_id, titulo, tipo, ruta, orden, activo)
                VALUES (?, ?, 'archivo', ?, ?, 1)
                `,
                [unidadNegocioId, nombres[indice], rutas[indice], indice + 1]
            );
        }
    }

    return videosPath;
}

router.get('/archivo/:id', async (req, res) => {
    try {
        const [[video]] = await db.query(
            `
            SELECT ruta, unidad_negocio_id
            FROM videos
            WHERE id = ? AND activo = 1 AND tipo = 'archivo'
            LIMIT 1
            `,
            [req.params.id]
        );

        if (!video) {
            return res.status(404).end();
        }

        const raiz = await obtenerRutaVideos(video.unidad_negocio_id);
        const ruta = path.resolve(video.ruta);
        const rutaRelativa = path.relative(raiz, ruta);

        if (
            rutaRelativa.startsWith('..') ||
            path.isAbsolute(rutaRelativa)
        ) {
            return res.status(403).end();
        }

        return res.sendFile(ruta);
    } catch (error) {
        console.error('Error al servir video:', error);
        return res.status(500).end();
    }
});

router.use(verificarToken);

router.post('/validar-ruta', soloAdministrador, async (req, res) => {
    try {
        const unidadNegocioId = unidadSolicitada(req);
        const ruta = String(req.body.ruta || '').trim();
        const videosPath = await obtenerRutaVideos(unidadNegocioId, ruta);
        const estado = await fs.stat(videosPath).catch(() => null);

        if (!estado?.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: 'La carpeta indicada no existe en el servidor'
            });
        }

        await db.query(
            `
            INSERT INTO configuracion_tv_unidad (unidad_negocio_id, ruta_videos)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE ruta_videos = VALUES(ruta_videos),
                fecha_actualizacion = CURRENT_TIMESTAMP
            `,
            [unidadNegocioId, ruta ? videosPath : null]
        );

        await sincronizarVideos(unidadNegocioId, videosPath);
        const [[conteo]] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM videos
            WHERE activo = 1 AND tipo = 'archivo' AND unidad_negocio_id = ?
            `,
            [unidadNegocioId]
        );

        return res.json({
            success: true,
            data: {
                ruta: ruta ? videosPath : '',
                total: Number(conteo.total)
            },
            message: Number(conteo.total) > 0
                ? `${conteo.total} video(s) encontrado(s)`
                : 'La carpeta es válida, pero no contiene videos compatibles'
        });
    } catch (error) {
        console.error('Error al validar carpeta de videos:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible revisar la carpeta de videos'
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const unidadNegocioId = Number(req.user.unidad_negocio_id);
        const [videos] = await db.query(
            `
            SELECT id, titulo AS nombre, orden
            FROM videos
            WHERE activo = 1 AND tipo = 'archivo' AND unidad_negocio_id = ?
            ORDER BY orden ASC, titulo ASC
            `,
            [unidadNegocioId]
        );

        return res.json({
            success: true,
            data: videos.map((video) => ({
                ...video,
                src: `/videos/archivo/${video.id}`
            }))
        });
    } catch (error) {
        console.error('Error al obtener videos:', error);
        return res.status(500).json({
            success: false,
            message: 'No fue posible leer la carpeta de videos configurada'
        });
    }
});

module.exports = router;
module.exports.sincronizarVideos = sincronizarVideos;
