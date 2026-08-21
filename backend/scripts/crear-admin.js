require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../src/config/db');

async function crearAdministrador() {
    try {
        const nombre = String(process.env.ADMIN_NOMBRE || 'Super Administrador').trim();
        const usuario = String(process.env.ADMIN_USUARIO || 'admin').trim();
        const passwordConfigurado = String(process.env.ADMIN_PASSWORD || '').trim();
        const passwordPlano = passwordConfigurado || crypto.randomBytes(12).toString('base64url');

        const [existentes] = await db.query(
            'SELECT id FROM usuarios WHERE usuario = ? LIMIT 1',
            [usuario]
        );
        if (existentes.length > 0) {
            console.log(`El usuario ${usuario} ya existe; no se realizaron cambios.`);
            return;
        }

        await db.query(
            `INSERT INTO unidades_negocio (nombre, descripcion, activo)
             VALUES ('Administracion del sistema', 'Unidad tecnica inicial', 1)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), activo = 1`
        );
        const [[unidad]] = await db.query(
            `SELECT id FROM unidades_negocio
             WHERE nombre = 'Administracion del sistema' LIMIT 1`
        );
        const passwordHash = await bcrypt.hash(passwordPlano, 12);

        await db.query(
            `INSERT INTO usuarios (
                unidad_negocio_id, nombre, usuario, password, rol,
                area_id, linea_id, es_lider, activo
             ) VALUES (?, ?, ?, ?, 'super_admin', NULL, NULL, 1, 1)`,
            [unidad.id, nombre, usuario, passwordHash]
        );

        console.log('======================================');
        console.log('Superadministrador creado correctamente');
        console.log(`Usuario: ${usuario}`);
        console.log(`Contrasena inicial: ${passwordPlano}`);
        console.log('Guarda esta contrasena y cambiala despues del primer acceso.');
        console.log('======================================');
    } catch (error) {
        console.error('No fue posible crear el superadministrador:');
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

crearAdministrador();
