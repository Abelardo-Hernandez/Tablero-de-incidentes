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

let tablaAsegurada = false;

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

async function asegurarCatalogoTiposFalla() {
    if (tablaAsegurada) {
        return;
    }

    await db.query(
        `
        CREATE TABLE IF NOT EXISTS tipos_falla (
            id INT AUTO_INCREMENT PRIMARY KEY,
            clave VARCHAR(80) NOT NULL UNIQUE,
            nombre VARCHAR(120) NOT NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            sistema TINYINT(1) NOT NULL DEFAULT 0,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `
    );

    await Promise.all(
        TIPOS_FALLA_BASE.map((tipo) =>
            db.query(
                `
                INSERT INTO tipos_falla (
                    clave,
                    nombre,
                    activo,
                    sistema
                )
                VALUES (?, ?, 1, 1)
                ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre)
                `,
                [
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

    tablaAsegurada = true;
}

async function obtenerTiposFallaCatalogo({
    activo,
    buscar
} = {}) {
    await asegurarCatalogoTiposFalla();

    const condiciones = [];
    const valores = [];

    if (activo !== undefined && activo !== '') {
        condiciones.push('activo = ?');
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
            '(nombre LIKE ? OR clave LIKE ?)'
        );

        const termino = `%${buscar.trim()}%`;
        valores.push(termino, termino);
    }

    const where = condiciones.length
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [tipos] = await db.query(
        `
        SELECT
            id,
            clave,
            nombre,
            activo,
            sistema,
            fecha_creacion
        FROM tipos_falla
        ${where}
        ORDER BY activo DESC, sistema DESC, nombre ASC
        `,
        valores
    );

    return tipos.map((tipo) => ({
        ...tipo,
        activo: Boolean(tipo.activo),
        sistema: Boolean(tipo.sistema)
    }));
}

async function tipoFallaActivoExiste(clave) {
    await asegurarCatalogoTiposFalla();

    const [tipos] = await db.query(
        `
        SELECT id
        FROM tipos_falla
        WHERE clave = ?
          AND activo = 1
        LIMIT 1
        `,
        [clave]
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
