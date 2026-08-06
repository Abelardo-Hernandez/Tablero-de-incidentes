const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const areasRoutes = require('./routes/areas.routes');
const lineasRoutes = require('./routes/lineas.routes');
const turnosRoutes = require('./routes/turnos.routes');
const incidenciasRoutes = require('./routes/incidencias.routes');
const tiposFallaRoutes = require('./routes/tipos-falla.routes');
const videosRoutes = require('./routes/videos.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'API del tablero de incidentes funcionando'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/lineas', lineasRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/tipos-falla', tiposFallaRoutes);
app.use('/api/videos', videosRoutes);


app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

module.exports = app;
