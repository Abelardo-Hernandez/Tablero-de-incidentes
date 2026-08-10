const db = require('../config/db');

const TIPOS_FALLA_BASE = [
    {
        clave: 'falla_equipo',
        nombre: 'Falla de equipo'
    },
    {
        clave: 'falta_material',
        nombre: 'Falta de material'
    },
    {
        clave: 'calidad',
        nombre: 'Calidad'
    },
    {
        clave: 'seguridad',
        nombre: 'Seguridad'
    },
    {
        clave: 'proceso',
        nombre: 'Proceso'
    },
    {
        clave: 'otro',
        nombre: 'Otro'
    }
];

const unidadesAseguradas = new Set();

function normalizarClave(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

async function asegurarCatalogoTiposFalla(unidadNegocioId) {
    if (!unidadNegocioId) {
        throw new Error('unidad_negocio_id requerido');
    }

    if (unidadesAseguradas.has(Number(unidadNegocioId))) {
        return;
    }

    await db.query(
        `
        CREATE TABLE IF NOT EXISTS tipos_falla (
            id INT AUTO_INCREMENT PRIMARY KEY,
            unidad_negocio_id INT NOT NULL,
            clave VARCHAR(80) NOT NULL,
            nombre VARCHAR(120) NOT NULL,
            activo TINYINT NOT NULL DEFAULT 1,
            sistema TINYINT NOT NULL DEFAULT 0,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_tipos_falla_unidad_clave (
                unidad_negocio_id,
                clave
            ),
            UNIQUE KEY uq_tipos_falla_unidad_nombre (
                unidad_negocio_id,
                nombre
            )
        )
        `
    );

    await Promise.all(
        TIPOS_FALLA_BASE.map((tipo) =>
            db.query(
                `
                INSERT INTO tipos_falla (
                    unidad_negocio_id,
                    clave,
                    nombre,
                    activo,
                    sistema
                )
                VALUES (?, ?, ?, 1, 1)
                ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre)
                `,
                [
                    unidadNegocioId,
                    tipo.clave,
                    tipo.nombre
                ]
            )
        )
    );

    const [columnas] = await db.query(
        `
        SELECT DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'incidencias'
          AND COLUMN_NAME = 'tipo'
        LIMIT 1
        `
    );

    if (columnas[0]?.DATA_TYPE === 'enum') {
        await db.query(
            `
            ALTER TABLE incidencias
            MODIFY tipo VARCHAR(80) NOT NULL DEFAULT 'otro'
            `
        );
    }

    unidadesAseguradas.add(Number(unidadNegocioId));
}

async function obtenerTiposFallaCatalogo({
    unidadNegocioId,
    activo,
    buscar
} = {}) {
    if (unidadNegocioId) {
        await asegurarCatalogoTiposFalla(unidadNegocioId);
    }

    const condiciones = [
    ];
    const valores = [];

    if (unidadNegocioId) {
        condiciones.push('tf.unidad_negocio_id = ?');
        valores.push(unidadNegocioId);
    }

    if (activo !== undefined && activo !== '') {
        condiciones.push('tf.activo = ?');
        valores.push(
            activo === true ||
                activo === 'true' ||
                activo === '1'
                ? 1
                : 0
        );
    }

    if (buscar) {
        condiciones.push(
            '(tf.nombre LIKE ? OR tf.clave LIKE ? OR un.nombre LIKE ?)'
        );

        const termino = `%${buscar.trim()}%`;
        valores.push(termino, termino, termino);
    }

    const where = condiciones.length
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [tipos] = await db.query(
        `
        SELECT
            tf.id,
            tf.unidad_negocio_id,
            un.nombre AS unidad_negocio_nombre,
            tf.clave,
            tf.nombre,
            tf.activo,
            tf.sistema,
            tf.fecha_creacion
        FROM tipos_falla tf
        INNER JOIN unidades_negocio un
            ON un.id = tf.unidad_negocio_id
        ${where}
        ORDER BY tf.activo DESC, un.nombre ASC, tf.sistema DESC, tf.nombre ASC
        `,
        valores
    );

    return tipos.map((tipo) => ({
        ...tipo,
        activo: Boolean(tipo.activo),
        sistema: Boolean(tipo.sistema)
    }));
}

async function tipoFallaActivoExiste(clave, unidadNegocioId) {
    await asegurarCatalogoTiposFalla(unidadNegocioId);

    const [tipos] = await db.query(
        `
        SELECT id
        FROM tipos_falla
        WHERE clave = ?
          AND unidad_negocio_id = ?
          AND activo = 1
        LIMIT 1
        `,
        [
            clave,
            unidadNegocioId
        ]
    );

    return tipos.length > 0;
}

module.exports = {
    TIPOS_FALLA_BASE,
    asegurarCatalogoTiposFalla,
    normalizarClave,
    obtenerTiposFallaCatalogo,
    tipoFallaActivoExiste
};
