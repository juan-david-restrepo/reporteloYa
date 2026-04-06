const express = require('express');
const router = express.Router();
const SimitService = require('../services/simitService');
const SimitWorkerService = require('../services/simitWorkerService');
const PdfGenerator = require('../pdf/pdfGenerator');

let ultimosResultados = new Map();

function getSimitService() {
    if (process.env.SIMIT_WORKER_URL) {
        return new SimitWorkerService();
    }
    return new SimitService();
}

router.post('/consultar', async (req, res) => {
    const { tipo, tipoDoc, valor } = req.body;

    const docType = tipoDoc || tipo;

    if (!docType || !valor) {
        return res.status(400).json({
            error: 'Parámetros incompletos',
            mensaje: 'Se requiere: tipo/tipoDoc y valor'
        });
    }

    const validTypes = {
        'CC': 'CC',
        'cedula': 'CC',
        'documento': 'CC',
        'CE': 'CE',
        'extranjeria': 'CE',
        'PA': 'PA',
        'pasaporte': 'PA',
        'NIT': 'NIT',
        'nit': 'NIT',
        'TI': 'TI',
        'tarjeta': 'TI',
        'RC': 'RC',
        'registro': 'RC'
    };

    const documentType = validTypes[docType.toUpperCase()];

    if (!documentType) {
        return res.status(400).json({
            error: 'Tipo inválido',
            mensaje: 'Use: CC (cédula), CE (cédula extranjería), PA (pasaporte), NIT, TI o RC'
        });
    }

    if (!/^\d+$/.test(valor) && documentType !== 'NIT') {
        return res.status(400).json({
            error: 'Documento inválido',
            mensaje: 'Ingrese un número de documento válido (solo números)'
        });
    }

    const sessionId = Date.now().toString();

    try {
        const simitService = getSimitService();
        const resultado = await simitService.consultar(documentType, valor);

        ultimosResultados.set(sessionId, {
            ...resultado,
            timestamp: Date.now(),
            consulta: {
                tipo: documentType,
                valor: valor
            }
        });

        res.json({
            success: resultado.success,
            sessionId: sessionId,
            ...resultado
        });

    } catch (error) {
        console.error('[API] Error:', error.message);

        let mensajeError = 'Error al realizar la consulta';

        if (error.message.includes('conectar')) {
            mensajeError = 'No se pudo conectar con el servidor de SIMIT. Verifique su conexión a internet.';
        } else if (error.message.includes('timeout')) {
            mensajeError = 'La consulta tardó demasiado. Intente de nuevo en unos segundos.';
        } else if (error.message.includes('inválido')) {
            mensajeError = error.message;
        }

        res.status(500).json({
            error: 'Error en la consulta',
            mensaje: mensajeError,
            detalles: error.message,
            sessionId: sessionId,
            alternativas: [
                'Consulte directamente en https://www.fcm.org.co/simit/',
                'Use la app móvil SIMIT',
                'Acuda a la secretaría de tránsito de su ciudad'
            ]
        });
    }
});

router.post('/generar-pdf', async (req, res) => {
    const { sessionId, tipo, tipoDoc, valor } = req.body;

    const docType = tipoDoc || tipo;
    let resultado;

    if (sessionId && ultimosResultados.has(sessionId)) {
        resultado = ultimosResultados.get(sessionId);
    } else if (docType && valor) {
        const validTypes = { 'CC': 'CC', 'cedula': 'CC', 'CE': 'CE', 'PA': 'PA', 'NIT': 'NIT' };
        const documentType = validTypes[docType.toUpperCase()] || 'CC';

        try {
            const simitService = getSimitService();
            resultado = await simitService.consultar(documentType, valor);
        } catch (error) {
            res.status(500).json({
                error: 'Error al generar PDF',
                mensaje: error.message
            });
            return;
        }
    } else {
        res.status(400).json({
            error: 'Parámetros incompletos',
            mensaje: 'Se requiere sessionId o (tipo y valor)'
        });
        return;
    }

    try {
        const pdfGenerator = new PdfGenerator();
        const pdfBuffer = await pdfGenerator.generate(
            resultado,
            resultado.consulta?.tipo || tipo || 'CC',
            resultado.consulta?.valor || valor || 'N/A'
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=consulta_simit_${Date.now()}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[API] Error al generar PDF:', error.message);
        res.status(500).json({
            error: 'Error al generar PDF',
            mensaje: error.message
        });
    }
});

router.get('/estado', (req, res) => {
    res.json({
        status: 'ok',
        servicio: 'SIMIT Scraper API',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        descripcion: 'API gratuita de consulta de multas SIMIT',
        workerUrl: process.env.SIMIT_WORKER_URL ? 'Configurado' : 'No configurado',
        nota: process.env.SIMIT_WORKER_URL 
            ? 'Usando Cloudflare Worker para datos reales'
            : 'Usando API gratuita. Para datos más completos, despliega el Cloudflare Worker.'
    });
});

router.get('/info', (req, res) => {
    res.json({
        nombre: 'SIMIT Scraper',
        version: '3.0.0',
        descripcion: 'API para consultar multas de tránsito en Colombia',
        endpoints: {
            'POST /api/consultar': 'Consulta multas por número de documento',
            'POST /api/generar-pdf': 'Genera PDF con los resultados',
            'GET /api/estado': 'Verifica el estado del servicio'
        },
        parametros: {
            tipoDoc: 'CC, CE, PA, NIT, TI, RC',
            valor: 'Número de documento'
        },
        cloudflareWorker: {
            descripcion: 'Para obtener datos reales, despliega el Cloudflare Worker',
            ubicacion: './cloudflare-worker/',
            instruccion: 'Consulta el archivo README.md en cloudflare-worker/'
        },
        notaImportante: process.env.SIMIT_WORKER_URL 
            ? 'Usando Cloudflare Worker para datos reales'
            : 'Esta API puede usar datos incompletos. Despliega el Cloudflare Worker para datos completos.'
    });
});

setInterval(() => {
    const ahora = Date.now();
    const MAX_AGE = 30 * 60 * 1000;

    for (const [sessionId, data] of ultimosResultados) {
        if (ahora - (data.timestamp || 0) > MAX_AGE) {
            ultimosResultados.delete(sessionId);
        }
    }
}, 5 * 60 * 1000);

module.exports = router;
