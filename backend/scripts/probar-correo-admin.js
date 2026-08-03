require('dotenv').config();

const db = require('../src/config/db');

const {
    enviarCorreo
} = require('../src/services/correo.service');

async function main() {
    const [admins] = await db.query(
        `
        SELECT nombre, correo
        FROM usuarios
        WHERE rol = 'administrador'
          AND activo = 1
          AND correo IS NOT NULL
          AND correo != ''
        ORDER BY id ASC
        LIMIT 1
        `
    );

    if (admins.length === 0) {
        console.log('SIN_ADMIN_CORREO');
        return;
    }

    const admin = admins[0];

    const resultado = await enviarCorreo({
        para: admin.correo,
        asunto: 'Prueba de correo - Centro de incidencias',
        texto: [
            `Hola ${admin.nombre},`,
            '',
            'Este es un correo de prueba del sistema de incidencias.',
            '',
            'Si recibes este mensaje, la configuración SMTP de Gmail funciona correctamente.'
        ].join('\n'),
        html: `
            <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.5;">
                <h2>Prueba de correo</h2>
                <p>Hola <strong>${admin.nombre}</strong>,</p>
                <p>Este es un correo de prueba del sistema de incidencias.</p>
                <p>Si recibes este mensaje, la configuración SMTP de Gmail funciona correctamente.</p>
            </div>
        `
    });

    if (!resultado.enviado) {
        console.log(`NO_ENVIADO:${resultado.razon}`);
        return;
    }

    console.log(`ENVIADO:${admin.correo}`);
}

main()
    .catch((error) => {
        console.error('ERROR_ENVIO:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
        process.exit(process.exitCode || 0);
    });
