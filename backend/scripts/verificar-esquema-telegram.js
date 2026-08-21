const mysql = require('mysql2/promise');

require('dotenv').config();

async function verificar() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [columnas] = await connection.query(`
            SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND (
                (TABLE_NAME = 'usuarios' AND COLUMN_NAME IN (
                    'telefono_contacto', 'telegram_user_id', 'telegram_chat_id',
                    'telegram_habilitado', 'telegram_vinculado_at'
                ))
                OR (TABLE_NAME = 'incidencias' AND COLUMN_NAME IN (
                    'canal_origen', 'telegram_update_id'
                ))
              )
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `, [process.env.DB_NAME]);

        const [tablas] = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME IN (
                'telegram_conversaciones', 'telegram_eventos',
                'telegram_vinculaciones',
                'whatsapp_conversaciones', 'whatsapp_eventos'
              )
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME]);

        const [[datos]] = await connection.query(`
            SELECT
                COUNT(*) AS total_usuarios,
                SUM(telefono_contacto IS NOT NULL) AS telefonos_conservados,
                SUM(telegram_habilitado = 1) AS telegram_vinculados
            FROM usuarios
        `);

        console.log(JSON.stringify({ columnas, tablas, datos }, null, 2));
    } finally {
        await connection.end();
    }
}

verificar().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
