const fs = require('fs');
const path = require('path');

require('dotenv').config();

const db = require('../src/config/db');

const TABLAS_REQUERIDAS = [
    'adjuntos_incidencias', 'areas', 'comentarios_incidencias',
    'config_envio_diario', 'config_envio_diario_destinatarios',
    'configuracion', 'configuracion_tv_unidad', 'historial_incidencias',
    'incidencias', 'lineas', 'notificaciones', 'push_suscripciones',
    'telegram_conversaciones', 'telegram_eventos', 'telegram_vinculaciones',
    'tipos_falla', 'turnos', 'unidades_negocio', 'usuarios', 'videos'
];

async function verificar() {
    const errores = [];
    const avisos = [];
    const requeridasEnv = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

    for (const variable of requeridasEnv) {
        if (!String(process.env[variable] || '').trim()) {
            errores.push(`Falta ${variable} en backend/.env`);
        }
    }
    if (!fs.existsSync(path.resolve(__dirname, '../../frontend/dist/index.html'))) {
        avisos.push('El frontend aun no esta compilado: ejecuta npm run build en frontend.');
    }

    const [tablas] = await db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ?`,
        [process.env.DB_NAME]
    );
    const existentes = new Set(tablas.map((fila) => fila.TABLE_NAME));
    for (const tabla of TABLAS_REQUERIDAS) {
        if (!existentes.has(tabla)) errores.push(`Falta la tabla ${tabla}`);
    }

    const [[usuarios]] = await db.query(
        `SELECT COUNT(*) total,
                SUM(rol = 'super_admin' AND activo = 1) super_admin_activos
         FROM usuarios`
    );
    if (!Number(usuarios.super_admin_activos)) {
        avisos.push('No existe un superadministrador activo; ejecuta npm run crear-admin.');
    }

    console.log(`Base: ${process.env.DB_NAME}`);
    console.log(`Tablas requeridas: ${TABLAS_REQUERIDAS.length - errores.filter((e) => e.startsWith('Falta la tabla')).length}/${TABLAS_REQUERIDAS.length}`);
    console.log(`Usuarios: ${usuarios.total}`);
    avisos.forEach((aviso) => console.warn(`AVISO: ${aviso}`));
    errores.forEach((error) => console.error(`ERROR: ${error}`));

    if (errores.length) process.exitCode = 1;
    else console.log('Instalacion verificada correctamente.');
}

verificar()
    .catch((error) => {
        console.error(`ERROR: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => db.end());
