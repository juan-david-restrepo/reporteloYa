const axios = require('axios');

const SIMIT_FREE_API = 'https://ancient-wildflower-be44.cristianalexander56.workers.dev';

class SimitService {
    constructor() {
        this.validDocumentTypes = ['CC', 'CE', 'PA', 'NIT', 'TI', 'RC'];
    }

    async consultar(documentType, documentNumber) {
        if (!this.validDocumentTypes.includes(documentType.toUpperCase())) {
            throw new Error(`Tipo de documento inválido. Use: ${this.validDocumentTypes.join(', ')}`);
        }

        if (!documentNumber || documentNumber.length < 5) {
            throw new Error('Número de documento inválido (mínimo 5 caracteres)');
        }

        try {
            const response = await axios.get(SIMIT_FREE_API, {
                params: {
                    documentType: documentType.toUpperCase(),
                    documentNumber: String(documentNumber)
                },
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            if (!response.data) {
                throw new Error('No se recibió respuesta del servidor');
            }

            return this.formatearResultado(response.data);

        } catch (error) {
            if (error.response) {
                console.error('[SimitService] Error HTTP:', error.response.status);
                throw new Error(`Error del servidor: ${error.response.status}`);
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error('No se pudo conectar con el servidor de SIMIT');
            } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new Error('La consulta tardó demasiado. Intente de nuevo');
            } else {
                console.error('[SimitService] Error:', error.message);
                throw error;
            }
        }
    }

    formatearResultado(data) {
        if (data.error) {
            return {
                success: false,
                error: true,
                mensaje: data.error || 'Error en la consulta',
                source: 'api_gratuita',
                alternativas: [
                    'Consultar directamente en https://consulta.simit.org.co/Simit/',
                    'Usar la app móvil SIMIT',
                    'Acudir a la secretaría de tránsito de su ciudad'
                ],
                multas: []
            };
        }

        let multas = [];
        let info = {};

        if (data.data) {
            multas = data.data.multas || data.data.comparendos || data.multas || [];
            info = data.data;
        } else if (data.multas) {
            multas = data.multas;
            info = data;
        } else if (Array.isArray(data)) {
            multas = data;
        }

        const tieneDatos = Array.isArray(multas) ? multas.length > 0 : false;

        const multasFormateadas = Array.isArray(multas) ? multas.map((m, index) => ({
            numero: index + 1,
            comparendo: m.comparendo || m.numeroComparendo || m.numero || m.id || 'N/A',
            infraccion: m.infraccion || m.codigoInfraccion || m.tipoInfraccion || '',
            resolucion: m.resolucion || m.numeroResolucion || m.resolucion_sancion || '',
            secretaria: m.secretaria || m.autoridad || m.orgullo || m.organismo || '',
            estado: m.estado || m.estado_sancion || 'Pendiente',
            valorMulta: this.parseMoney(m.valorMulta || m.valor || m.valor_original || m.valor_sancion || 0),
            interesMora: this.parseMoney(m.interesMora || m.interes || 0),
            valorAdicional: this.parseMoney(m.valorAdicional || m.adicional || 0),
            fechaComparendo: m.fechaComparendo || m.fecha || m.fecha_comparendo || '',
            fechaResolucion: m.fechaResolucion || m.fecha_resolucion || '',
            fechaInfraccion: m.fechaInfraccion || m.fecha_infraccion || '',
            nombreInfractor: m.nombreInfractor || m.nombre || m.infractor || info.nombre_infractor || info.nombre || '',
            valorTotal: this.parseMoney(m.valorTotal || m.total || m.total_pagar || m.total_pago || 0),
            placa: m.placa || m.matricula || '',
            ciudad: m.ciudad || m.municipio || '',
            departamento: m.departamento || ''
        })) : [];

        const totalValor = multasFormateadas.reduce((sum, m) => sum + m.valorTotal, 0);

        return {
            success: true,
            tieneDeudas: multasFormateadas.length > 0,
            mensaje: multasFormateadas.length > 0
                ? `Se encontraron ${multasFormateadas.length} comparendo(s) o multa(s)`
                : 'No se encontraron multas ni comparendos para este documento',
            source: 'api_gratuita',
            sourceNote: 'Datos obtenidos de la API gratuita. Algunos datos pueden estar incompletos o desactualizados.',
            multas: multasFormateadas,
            totales: {
                totalMultas: multasFormateadas.length,
                valorTotal: totalValor,
                valorMultas: multasFormateadas.reduce((sum, m) => sum + m.valorMulta, 0),
                interesesTotales: multasFormateadas.reduce((sum, m) => sum + m.interesMora, 0),
                valoresAdicionales: multasFormateadas.reduce((sum, m) => sum + m.valorAdicional, 0)
            },
            infoExtra: {
                nombre: info.nombre_infractor || info.nombre || '',
                tipoDocumento: info.tipo_documento || info.documentType || '',
                numeroDocumento: info.numero_documento || info.documentNumber || '',
                tienePazSalvo: info.tiene_paz_salvo || info.hasPazYSalvo || false,
                acuerdosPago: info.acuerdosPago || info.acuerdos_de_pago || 0
            },
            alternativas: multasFormateadas.length === 0 ? [
                'Si considera que debería tener multas, consulte directamente en https://consulta.simit.org.co/Simit/',
                'Verifique que el número de documento esté correcto',
                'Si las multas son recientes, pueden tardar en aparecer en el sistema'
            ] : []
        };
    }

    parseMoney(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }
}

module.exports = SimitService;
