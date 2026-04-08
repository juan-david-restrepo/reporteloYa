const pdf = require('html-pdf-node');

class OperativoPdfGenerator {
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

    generate(data) {
        return new Promise(async (resolve, reject) => {
            try {
                const html = this.generateHTML(data);
                
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

    generateHTML(data) {
        const fechaActual = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        console.log('[PDF] Datos recibidos:', JSON.stringify(data, null, 2));

        const {
            tipoInfraccion = 'N/A',
            direccion = 'N/A',
            fechaIncidente = null,
            horaIncidente = 'N/A',
            fechaAceptado = null,
            fechaFinalizado = null,
            resumenOperativo = 'Sin resumen',
            foto = '',
            estado = 'N/A',
            nombreAgente = 'N/A',
            placaAgente = 'N/A',
            nombreCompanero = '',
            placaCompanero = '',
            acompanado = false
        } = data;

        let duracion = 'N/A';
        if (fechaAceptado && fechaFinalizado) {
            const diff = new Date(fechaFinalizado).getTime() - new Date(fechaAceptado).getTime();
            const horas = Math.floor(diff / 3600000);
            const minutos = Math.floor((diff % 3600000) / 60000);
            duracion = horas > 0 ? `${horas}h ${minutos}min` : `${minutos} minutos`;
        }

        const formatDate = (date) => {
            if (!date) return 'N/A';
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return 'N/A';
                return d.toLocaleString('es-CO', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            } catch {
                return 'N/A';
            }
        };

        const fechaAceptadoDisplay = formatDate(fechaAceptado);
        const fechaFinalizadoDisplay = formatDate(fechaFinalizado);

        let fechaIncidenteDisplay = 'N/A';
        if (fechaIncidente) {
            try {
                const d = new Date(fechaIncidente);
                if (!isNaN(d.getTime())) {
                    fechaIncidenteDisplay = d.toLocaleDateString('es-CO');
                }
            } catch {
                fechaIncidenteDisplay = 'N/A';
            }
        }

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
        .estado-atendido { background: #d4edda; color: #155724; }
        .estado-rechazado { background: #f8d7da; color: #721c24; }
        
        .section-title {
            font-size: 13px;
            color: #1e3a5f;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #1e3a5f;
        }
        
        .data-card {
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .data-header {
            background: #f8f9fa;
            padding: 10px 12px;
            font-weight: bold;
            color: #1e3a5f;
            border-bottom: 1px solid #eee;
        }
        .data-body { padding: 12px; }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        .data-item {
            background: #f8f9fa;
            padding: 6px 8px;
            border-radius: 4px;
        }
        .data-item.full { grid-column: 1 / -1; }
        .data-label { font-size: 8px; text-transform: uppercase; color: #888; margin-bottom: 1px; }
        .data-value { font-size: 10px; color: #333; }
        
        .foto-seccion {
            margin-top: 15px;
            text-align: center;
        }
        .foto-seccion img {
            max-width: 300px;
            max-height: 300px;
            border-radius: 6px;
            border: 1px solid #ddd;
        }
        
        .resumen-box {
            background: #e7f3ff;
            border-left: 4px solid #1e3a5f;
            padding: 12px;
            margin-top: 15px;
            border-radius: 0 6px 6px 0;
        }
        .resumen-box h4 {
            color: #1e3a5f;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .resumen-box p {
            font-size: 10px;
            line-height: 1.6;
            color: #333;
        }
        
        .agente-card {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%);
            color: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .agente-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .agente-item { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; }
        .agente-label { font-size: 9px; opacity: 0.9; margin-bottom: 3px; }
        .agente-value { font-size: 14px; font-weight: bold; }
        
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #888;
            font-size: 8px;
        }
        
        @media print {
            .data-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CERTIFICADO DE OPERATIVO</h1>
        <p>ReporteloYa - Sistema de Gestión de Reportes</p>
    </div>
    
    <div class="info-section">
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Fecha de Generación</span>
                <span class="info-value">${fechaActual}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Estado</span>
                <span class="info-value">
                    <span class="estado-badge ${estado === 'finalizado' ? 'estado-atendido' : 'estado-rechazado'}">
                        ${estado === 'finalizado' ? 'ATENDIDO' : 'RECHAZADO'}
                    </span>
                </span>
            </div>
        </div>
    </div>
    
    <div class="agente-card">
        <div class="agente-grid">
            <div class="agente-item">
                <div class="agente-label">Agente</div>
                <div class="agente-value">${nombreAgente}</div>
            </div>
            <div class="agente-item">
                <div class="agente-label">Placa</div>
                <div class="agente-value">${placaAgente}</div>
            </div>
            ${acompanado ? `
            <div class="agente-item">
                <div class="agente-label">Compañero</div>
                <div class="agente-value">${nombreCompanero || 'N/A'}</div>
            </div>
            <div class="agente-item">
                <div class="agente-label">Placa Compañero</div>
                <div class="agente-value">${placaCompanero || 'N/A'}</div>
            </div>
            ` : ''}
        </div>
    </div>
    
    <div class="data-card">
        <div class="data-header">Información del Reporte</div>
        <div class="data-body">
            <div class="data-grid">
                <div class="data-item full">
                    <span class="data-label">Tipo de Infracción</span>
                    <span class="data-value">${tipoInfraccion}</span>
                </div>
                <div class="data-item full">
                    <span class="data-label">Dirección</span>
                    <span class="data-value">${direccion}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Fecha del Incidente</span>
                    <span class="data-value">${fechaIncidenteDisplay}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Hora del Incidente</span>
                    <span class="data-value">${horaIncidente || 'N/A'}</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="data-card">
        <div class="data-header">Gestión del Operativo</div>
        <div class="data-body">
            <div class="data-grid">
                <div class="data-item">
                    <span class="data-label">Hora de Aceptación</span>
                    <span class="data-value">${fechaAceptadoDisplay}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Hora de Finalización</span>
                    <span class="data-value">${fechaFinalizadoDisplay}</span>
                </div>
                <div class="data-item full">
                    <span class="data-label">Duración Total</span>
                    <span class="data-value">${duracion}</span>
                </div>
            </div>
        </div>
    </div>
    
    ${foto ? `
    <div class="foto-seccion">
        <div class="section-title">Evidencia Fotográfica</div>
        <img src="${foto}" alt="Evidencia del reporte" />
    </div>
    ` : ''}
    
    <div class="resumen-box">
        <h4>Resumen del Operativo</h4>
        <p>${resumenOperativo}</p>
    </div>
    
    <div class="footer">
        <p>Documento generado automáticamente por ReporteloYa</p>
        <p>Para cualquier aclaración, contacte al administrador del sistema</p>
    </div>
</body>
</html>`;
    }
}

module.exports = OperativoPdfGenerator;
