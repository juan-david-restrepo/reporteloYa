/**
 * SIMIT Cloudflare Worker Service
 */

const axios = require('axios');

class SimitWorkerService {
    constructor() {
        this.workerUrl = process.env.SIMIT_WORKER_URL || null;
        this.validDocumentTypes = ['CC', 'CE', 'PA', 'NIT', 'TI', 'RC'];
    }

    async consultar(documentType, documentNumber) {
        if (!this.validDocumentTypes.includes(documentType.toUpperCase())) {
            throw new Error(`Tipo de documento inválido. Use: ${this.validDocumentTypes.join(', ')}`);
        }

        if (!documentNumber || documentNumber.length < 5) {
            throw new Error('Número de documento inválido (mínimo 5 caracteres)');
        }

        if (!this.workerUrl) {
            return this.consultarFallback(documentType, documentNumber);
        }

        try {
            const response = await axios.get(this.workerUrl, {
                params: {
                    documentType: documentType.toUpperCase(),
                    documentNumber: String(documentNumber)
                },
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            if (response.data) {
                return this.formatearResultado(response.data);
            }

            throw new Error('No se recibió respuesta del Worker');

        } catch (error) {
            console.error('[SimitWorkerService] Error:', error.message);
            return this.consultarFallback(documentType, documentNumber);
        }
    }

    async consultarFallback(documentType, documentNumber) {
        const SimitService = require('./simitService');
        const service = new SimitService();
        return await service.consultar(documentType, documentNumber);
    }

    formatearResultado(data) {
        if (data.error && !data.success) {
            return {
                success: false,
                error: true,
                mensaje: data.mensaje || data.error || 'Error en la consulta',
                source: 'cloudflare_worker',
                alternativas: [
                    'Consulte directamente en https://www.fcm.org.co/simit/',
                    'Use la app móvil SIMIT',
                    'Acuda a la secretaría de tránsito de su ciudad'
                ],
                multas: []
            };
        }

        const multas = data.multas || [];
        const info = data.infoExtra || {};

        const multasFormateadas = Array.isArray(multas) ? multas.map((m, index) => ({
            numero: index + 1,
            comparendo: m.comparendo || m.numeroComparendo || m.numero || 'N/A',
            infraccion: m.infraccion || m.codigoInfraccion || m.tipoInfraccion || '',
            resolucion: m.resolucion || m.numeroResolucion || '',
            secretaria: m.secretaria || m.autoridad || '',
            estado: m.estado || m.estadoComparendo || 'Pendiente',
            valorMulta: this.parseMoney(m.valorMulta || m.valor || m.valorInfraccion || 0),
            interesMora: this.parseMoney(m.interesMora || m.interes || 0),
            valorAdicional: this.parseMoney(m.valorAdicional || m.adicional || 0),
            fechaComparendo: m.fechaComparendo || m.fecha || '',
            fechaResolucion: m.fechaResolucion || '',
            nombreInfractor: m.nombreInfractor || m.nombre || info.nombre || '',
            valorTotal: this.parseMoney(m.valorTotal || m.total || m.valorPagar || 0),
            placa: m.placa || '',
            ciudad: m.ciudad || m.municipio || '',
            departamento: m.departamento || ''
        })) : [];

        const totalValor = multasFormateadas.reduce((sum, m) => sum + m.valorTotal, 0);

        return {
            success: true,
            tieneDeudas: multasFormateadas.length > 0,
            mensaje: multasFormateadas.length > 0
                ? `Se encontraron ${multasFormateadas.length} comparendo(s)`
                : data.mensaje || 'No se encontraron multas ni comparendos para este documento',
            source: data.source || 'cloudflare_worker',
            sourceNote: 'Datos obtenidos a través del Cloudflare Worker (scraping de SIMIT)',
            multas: multasFormateadas,
            totales: {
                totalMultas: multasFormateadas.length,
                valorTotal: totalValor,
                valorMultas: multasFormateadas.reduce((sum, m) => sum + m.valorMulta, 0),
                interesesTotales: multasFormateadas.reduce((sum, m) => sum + m.interesMora, 0)
            },
            infoExtra: {
                nombre: info.nombre || '',
                tipoDocumento: info.tipoDocumento || documentType || '',
                numeroDocumento: info.numeroDocumento || documentNumber || '',
                cursos: info.cursos || [],
                acuerdosPago: info.acuerdosPago || []
            },
            nota: data.nota || '',
            urlAlternativa: data.urlAlternativa || ''
        };
    }

    parseMoney(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }
}

module.exports = SimitWorkerService;
