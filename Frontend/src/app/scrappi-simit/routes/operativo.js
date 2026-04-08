const express = require('express');
const router = express.Router();
const OperativoPdfGenerator = require('../pdf/operativoPdfGenerator');

router.post('/operativo-pdf', async (req, res) => {
    const data = req.body;

    if (!data || !data.tipoInfraccion) {
        return res.status(400).json({
            error: 'Datos incompletos',
            mensaje: 'Se requiere los datos del operativo'
        });
    }

    try {
        const pdfGenerator = new OperativoPdfGenerator();
        const pdfBuffer = await pdfGenerator.generate(data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=operativo_${data.id || Date.now()}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[API] Error al generar PDF:', error.message);
        res.status(500).json({
            error: 'Error al generar PDF',
            mensaje: error.message
        });
    }
});

module.exports = router;
