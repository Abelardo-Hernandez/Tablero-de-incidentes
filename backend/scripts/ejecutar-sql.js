const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config();

async function ejecutar() {
    const archivoSolicitado = process.argv[2];

    if (!archivoSolicitado) {
        throw new Error('Indica el archivo SQL que deseas ejecutar.');
    }

    const carpetaSql = path.resolve(__dirname, '../sql');
    const archivoSql = path.resolve(process.cwd(), archivoSolicitado);
    const rutaRelativa = path.relative(carpetaSql, archivoSql);

    if (
        rutaRelativa.startsWith('..') ||
        path.isAbsolute(rutaRelativa) ||
        path.extname(archivoSql).toLowerCase() !== '.sql'
    ) {
        throw new Error('Solo se permiten archivos de la carpeta backend/sql.');
    }

    const sql = await fs.readFile(archivoSql, 'utf8');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        await connection.query(sql);
        console.log(`SQL ejecutado: ${path.basename(archivoSql)}`);
    } finally {
        await connection.end();
    }
}

ejecutar().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
