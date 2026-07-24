require('dotenv').config();

const bcrypt = require('bcrypt');

const db = require('../src/config/db');

async function crearAdministrador() {
    try {
        const nombre = 'Administrador';
        const usuario = 'admin';
        const passwordPlano = '1a2b3c*';

        const [existentes] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE usuario = ?
            LIMIT 1
            `,
            [usuario]
        );

        if (existentes.length > 0) {
            console.log('El usuario administrador ya existe');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(passwordPlano, 12);

        await db.query(
            `
            INSERT INTO usuarios (
                nombre,
                usuario,
                password,
                rol,
                area_id,
                linea_id,
                es_lider,
                activo
            )
            VALUES (?, ?, ?, 'administrador', NULL, NULL, TRUE, TRUE)
            `,
            [
                nombre,
                usuario,
                passwordHash
            ]
        );

        console.log('======================================');
        console.log('Administrador creado correctamente');
        console.log(`Usuario: ${usuario}`);
        console.log(`Contraseña temporal: ${passwordPlano}`);
        console.log('======================================');

        process.exit(0);
    } catch (error) {
        console.error('No fue posible crear el administrador:');
        console.error(error.message);

        process.exit(1);
    }
}

crearAdministrador();