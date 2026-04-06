const pdf = require('html-pdf-node');

class PdfGenerator {
    constructor() {
        this.defaultOptions = {
            format: 'A4',
            margin: {
                top: '15mm',
                right: '12mm',
                bottom: '15mm',
                left: '12mm'
            },
            printBackground: true
        };
    }

    generate(data, tipo = 'documento', valor = 'N/A') {
        return new Promise(async (resolve, reject) => {
            try {
                const html = this.generateHTML(data, tipo, valor);
                
                const file = { content: html };
                const options = this.defaultOptions;

                pdf.generatePdf(file, options).then(buffer => {
                    resolve(buffer);
                }).catch(error => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    generateHTML(data, tipo, valor) {
        const fechaActual = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const multas = data.multas || [];
        const totales = data.totales || {};

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.5;
        }
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%);
            color: white;
            padding: 20px;
            text-align: center;
            margin: -15mm -12mm 15px -12mm;
        }
        .header h1 { font-size: 18px; margin-bottom: 3px; }
        .header p { font-size: 10px; opacity: 0.9; }
        .info-section {
            background: #f5f5f5;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 8px; text-transform: uppercase; color: #666; margin-bottom: 2px; }
        .info-value { font-weight: bold; color: #1e3a5f; font-size: 12px; }
        .estado-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
        }
        .estado-con-deudas { background: #fee; color: #c00; }
        .estado-sin-deudas { background: #efe; color: #060; }
        .totales-card {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%);
            color: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .totales-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            text-align: center;
        }
        .total-item { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; }
        .total-label { font-size: 9px; opacity: 0.9; margin-bottom: 3px; }
        .total-value { font-size: 16px; font-weight: bold; }
        .section-title {
            font-size: 13px;
            color: #1e3a5f;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #1e3a5f;
        }
        .multa-card {
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        .multa-header {
            background: #f8f9fa;
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
        }
        .multa-codigo { font-weight: bold; color: #1e3a5f; font-size: 11px; }
        .multa-fecha { color: #666; font-size: 9px; }
        .multa-body { padding: 12px; }
        .multa-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        .multa-item {
            background: #f8f9fa;
            padding: 6px 8px;
            border-radius: 4px;
        }
        .multa-item.full { grid-column: 1 / -1; }
        .multa-item-label { font-size: 8px; text-transform: uppercase; color: #888; margin-bottom: 1px; }
        .multa-item-value { font-size: 10px; color: #333; }
        .multa-valor {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            border-radius: 4px;
        }
        .multa-valor-label { font-size: 9px; opacity: 0.9; }
        .multa-valor-amount { font-size: 14px; font-weight: bold; }
        .no-multas {
            text-align: center;
            padding: 40px;
            background: #d4edda;
            border-radius: 8px;
            color: #155724;
        }
        .no-multas-icon { font-size: 48px; margin-bottom: 10px; }
        .no-multas h3 { font-size: 16px; margin-bottom: 5px; }
        .no-multas p { font-size: 11px; }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #888;
            font-size: 8px;
        }
        .disclaimer {
            margin-top: 15px;
            padding: 10px;
            background: #fff3cd;
            border-radius: 6px;
            font-size: 8px;
            color: #856404;
        }
        @media print {
            .multa-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CERTIFICADO DE CONSULTA SIMIT</h1>
        <p>Sistema Integrado de Multas e Infracciones de Tránsito - Colombia</p>
    </div>
    
    <div class="info-section">
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Tipo de Consulta</span>
                <span class="info-value">Por Documento</span>
            </div>
            <div class="info-item">
                <span class="info-label">Número de Documento</span>
                <span class="info-value">${valor}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Fecha de Consulta</span>
                <span class="info-value">${fechaActual}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Estado</span>
                <span class="info-value">
                    <span class="estado-badge ${data.tieneDeudas ? 'estado-con-deudas' : 'estado-sin-deudas'}">
                        ${data.tieneDeudas ? 'TIENE DEUDAS PENDIENTES' : 'SIN DEUDAS'}
                    </span>
                </span>
            </div>
        </div>
    </div>
    
    ${multas.length > 0 ? `
    <div class="totales-card">
        <div class="totales-grid">
            <div class="total-item">
                <div class="total-label">Total Comparendos</div>
                <div class="total-value">${totales.totalMultas || 0}</div>
            </div>
            <div class="total-item">
                <div class="total-label">Valor Total</div>
                <div class="total-value">${this.formatCurrency(totales.valorTotal || 0)}</div>
            </div>
            <div class="total-item">
                <div class="total-label">Solo Multas</div>
                <div class="total-value">${this.formatCurrency(totales.valorMultas || 0)}</div>
            </div>
        </div>
    </div>
    
    <div class="section-title">Detalle de Comparendos y Resoluciones</div>
    
    ${multas.map((multa, index) => this.generateMultaCard(multa, index + 1)).join('')}
    ` : ''}
    
    ${multas.length === 0 ? `
    <div class="no-multas">
        <div class="no-multas-icon">✓</div>
        <h3>¡Sin Multas!</h3>
        <p>No se encontraron multas ni comparendos pendientes.</p>
    </div>
    ` : ''}
    
    <div class="footer">
        <p>Este documento es un reporte generado automáticamente a partir de datos del SIMIT.</p>
        <p>Para verificación oficial, visite <strong>www.fcm.org.co/simit</strong></p>
        <p>API proporcionada por Apitude.co</p>
    </div>
    
    <div class="disclaimer">
        <strong>Aviso:</strong> Este documento es informativo y no constituye un paz y salvo oficial.
        Los datos pueden variar. Para efectos legales, visite directamente el sistema SIMIT.
    </div>
</body>
</html>`;
    }

    generateMultaCard(multa, numero) {
        return `
        <div class="multa-card">
            <div class="multa-header">
                <span class="multa-codigo">#${numero} - ${multa.comparendo || 'N/A'}</span>
                <span class="multa-fecha">${multa.fechaComparendo || 'Sin fecha'}</span>
            </div>
            <div class="multa-body">
                <div class="multa-grid">
                    <div class="multa-item">
                        <span class="multa-item-label">Resolución</span>
                        <span class="multa-item-value">${multa.resolucion || 'N/A'}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Estado</span>
                        <span class="multa-item-value">${multa.estado || 'N/A'}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Secretaría</span>
                        <span class="multa-item-value">${multa.secretaria || 'N/A'}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Fecha Resolución</span>
                        <span class="multa-item-value">${multa.fechaResolucion || 'N/A'}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Infractor</span>
                        <span class="multa-item-value">${multa.nombreInfractor || 'N/A'}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Valor Infracción</span>
                        <span class="multa-item-value">${this.formatCurrency(multa.infraccion)}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Intereses Mora</span>
                        <span class="multa-item-value">${this.formatCurrency(multa.interesMora)}</span>
                    </div>
                    <div class="multa-item">
                        <span class="multa-item-label">Valor Adicional</span>
                        <span class="multa-item-value">${this.formatCurrency(multa.valorAdicional)}</span>
                    </div>
                </div>
                <div class="multa-valor">
                    <span class="multa-valor-label">TOTAL A PAGAR</span>
                    <span class="multa-valor-amount">${this.formatCurrency(multa.valorTotal)}</span>
                </div>
            </div>
        </div>
        `;
    }

    formatCurrency(valor) {
        if (!valor || valor === 0) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    }
}

module.exports = PdfGenerator;
