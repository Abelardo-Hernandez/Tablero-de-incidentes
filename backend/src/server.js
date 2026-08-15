require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const {
    iniciarProgramadorEnvioDiario
} = require('./services/envio-diario.scheduler');
const {
    iniciarProgramadorConfirmacionSolucion
} = require('./services/confirmacion-solucion.scheduler');
const {
    asegurarTablaPush
} = require('./services/push.service');
const {
    asegurarConfiguracionGeneral
} = require('./controllers/configuracion.controller');
const {
    sincronizarVideos
} = require('./routes/videos.routes');

const PORT = process.env.PORT || 3010;

async function iniciarServidor() {
    try {
        const connection = await db.getConnection();

        console.log('✅ Conexión a MySQL exitosa');

        connection.release();

        await asegurarTablaPush();
        await asegurarConfiguracionGeneral();

        try {
            await sincronizarVideos();
        } catch (errorVideos) {
            console.warn(
                'No fue posible sincronizar la carpeta de videos al iniciar:',
                errorVideos.message
            );
        }

        app.listen(PORT, () => {
            iniciarProgramadorEnvioDiario();
            iniciarProgramadorConfirmacionSolucion();

            console.log('======================================');
            console.log(' Tablero de Incidentes');
            console.log(` Servidor ejecutándose en puerto ${PORT}`);
            console.log(` http://localhost:${PORT}/api`);
            console.log('======================================');
        });
    } catch (error) {
        console.error('❌ No fue posible conectar con MySQL');
        console.error(error.message);

        process.exit(1);
    }
}

iniciarServidor();
