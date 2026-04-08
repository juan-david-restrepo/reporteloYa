require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const consultaRoutes = require('./routes/consulta');
const operativoRoutes = require('./routes/operativo');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', consultaRoutes);
app.use('/api', operativoRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚗  SIMIT Scraper - Servidor Integrado                 ║
║                                                           ║
║   Servidor corriendo en: http://localhost:${PORT}         ║
║                                                           ║
║   Para consultar desde Angular: http://localhost:4200    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
