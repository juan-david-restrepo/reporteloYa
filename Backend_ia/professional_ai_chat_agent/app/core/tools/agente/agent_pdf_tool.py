from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from datetime import datetime
import os


class AgentPDFTool:

    def __init__(self, db, llm_service):
        self.db = db
        self.llm = llm_service
        self.styles = getSampleStyleSheet()

    async def generar_reporte_agente_pdf(
        self,
        agent_id: int,
        periodo: str = "mes"
    ):
        """
        Genera un PDF con el reporte de actividad del agente.
        """

        # Determinar fecha según período
        if periodo == "semana":
            fecha_condition = "INTERVAL 7 DAY"
        elif periodo == "dia":
            fecha_condition = "INTERVAL 1 DAY"
        else:
            fecha_condition = "INTERVAL 30 DAY"

        # Query de validaciones - USANDO ESTADOS EN MAYÚSCULAS
        validaciones_query = f"""
        SELECT
            COUNT(*) as total_validaciones,
            SUM(CASE WHEN estado = 'APROBADA' THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado = 'RECHAZADA' THEN 1 ELSE 0 END) como rechazados
        FROM validaciones
        WHERE id_agente = %s
        AND fecha_validacion >= DATE_SUB(NOW(), {fecha_condition})
        """

        # Query de tareas
        tareas_query = f"""
        SELECT 
            descripcion, 
            estado, 
            fecha,
            prioridad
        FROM tareas
        WHERE id_agente = %s
        AND fecha >= DATE_SUB(NOW(), {fecha_condition})
        ORDER BY fecha DESC
        LIMIT 20
        """

        # Query de reportes
        reportes_query = f"""
        SELECT 
            tipo_infraccion,
            estado,
            created_at
        FROM reporte
        WHERE id_agente = %s
        AND created_at >= DATE_SUB(NOW(), {fecha_condition})
        ORDER BY created_at DESC
        LIMIT 20
        """

        validaciones = self.db.fetch_one(validaciones_query, (agent_id,))
        tareas = self.db.fetch_all(tareas_query, (agent_id,))
        reportes = self.db.fetch_all(reportes_query, (agent_id,))

        # Crear directorio si no existe
        output_dir = "app/storage/reports"
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output = f"{output_dir}/agente_{agent_id}_{timestamp}.pdf"

        doc = SimpleDocTemplate(output, pagesize=A4)
        elements = []

        # Título
        elements.append(
            Paragraph(f"Reporte de Actividad del Agente - {periodo.upper()}", self.styles["Title"])
        )
        elements.append(Spacer(1, 20))

        # Resumen de validaciones
        total_val = validaciones.get("total_validaciones", 0) if validaciones else 0
        aprobados = validaciones.get("aprobados", 0) if validaciones else 0
        rechazados = validaciones.get("rechazados", 0) if validaciones else 0
        
        tasa_aprobacion = 0
        if total_val > 0:
            tasa_aprobacion = round((aprobados / total_val) * 100, 2)

        summary_text = f"""
        <b>Resumen de Validaciones:</b><br/>
        Total: {total_val}<br/>
        Aprobadas: {aprobados}<br/>
        Rechazadas: {rechazados}<br/>
        Tasa de aprobacion: {tasa_aprobacion}%
        """
        elements.append(Paragraph(summary_text, self.styles["BodyText"]))
        elements.append(Spacer(1, 20))

        # Tabla de tareas
        if tareas:
            elements.append(Paragraph("<b>Ultimas Tareas</b>", self.styles["Heading2"]))
            
            headers = ["Descripcion", "Estado", "Fecha", "Prioridad"]
            data = [headers]
            
            for row in tareas:
                data.append([
                    str(row.get("descripcion", ""))[:30],
                    str(row.get("estado", "")),
                    str(row.get("fecha", "")),
                    str(row.get("prioridad", ""))
                ])
            
            table = Table(data)
            table.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 20))

        # Tabla de reportes
        if reportes:
            elements.append(Paragraph("<b>Reportes Atendidos</b>", self.styles["Heading2"]))
            
            headers = ["Tipo", "Estado", "Fecha"]
            data = [headers]
            
            for row in reportes:
                data.append([
                    str(row.get("tipo_infraccion", ""))[:25],
                    str(row.get("estado", "")),
                    str(row.get("created_at", ""))[:10]
                ])
            
            table = Table(data)
            table.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]))
            elements.append(table)

        doc.build(elements)

        return {
            "status": "success",
            "file": output,
            "periodo": periodo,
            "resumen": {
                "validaciones": total_val,
                "tareas": len(tareas),
                "reportes": len(reportes)
            }
        }
