const fs = require('fs/promises');
const path = require('path');

const express = require('express');

const {
    verificarToken
} = require('../middleware/auth');

const router = express.Router();

const extensionesPermitidas = new Set([
    '.mp4',
    '.webm',
    '.ogg',
    '.mov'
]);

router.use(verificarToken);

router.get('/', async (req, res) => {
    try {
        const videosPath = path.resolve(
            __dirname,
            '../../../frontend/public/videos'
        );

        const archivos = await fs.readdir(videosPath, {
            withFileTypes: true
        });

        const videos = archivos
            .filter((archivo) => archivo.isFile())
            .map((archivo) => archivo.name)
            .filter((nombre) =>
                extensionesPermitidas.has(
                    path.extname(nombre).toLowerCase()
                )
            )
            .sort((a, b) =>
                a.localeCompare(
                    b,
                    'es',
                    {
                        numeric: true
                    }
                )
            )
            .map((nombre) => ({
                nombre,
                src: `/videos/${nombre}`
            }));

        return res.json({
            success: true,
            data: videos
        });
    } catch (error) {
        console.error('Error al obtener videos:', error);

        return res.status(500).json({
            success: false,
            message: 'No fue posible obtener los videos'
        });
    }
});

module.exports = router;
