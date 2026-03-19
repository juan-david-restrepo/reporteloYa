from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors

from datetime import datetime
import os


class PDFGeneratorTool:

    def __init__(self, llm_service):
        self.llm = llm_service
        self.styles = getSampleStyleSheet()
        self.logo_path = "Frontend/public/assets/images/logoNuevo.png"

    async def generate_pdf(
        self,
        title: str,
        user_text: str,
        table_data: list | None = None,
        logo_path: str | None = None,
        output_path: str | None = None
    ):
        """
        Genera un PDF con:
        - Logo empresa
        - Título
        - Texto mejorado por IA
        - Tabla opcional
        """

        try:

            # 1️⃣ nombre automático del archivo
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"app/storage/reports/reporte_{timestamp}.pdf"

            # 2️⃣ mejorar texto con IA
            improved_text = await self.llm.improve_text(user_text)

            # 3️⃣ documento
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4
            )

            elements = []

            # 4️⃣ logo - usar el path proporcionado o el de la instancia
            logo_to_use = logo_path if logo_path else self.logo_path
            if logo_to_use and os.path.exists(logo_to_use):
                logo = Image(logo_to_use, width=4 * cm, height=4 * cm)
                elements.append(logo)
                elements.append(Spacer(1, 20))

            # 5️⃣ título
            elements.append(Paragraph(f"<b>{title}</b>", self.styles['Title']))
            elements.append(Spacer(1, 20))

            # 6️⃣ texto
            elements.append(Paragraph(improved_text, self.styles['BodyText']))
            elements.append(Spacer(1, 20))

            # 7️⃣ tabla opcional
            if table_data and len(table_data) > 0:

                headers = list(table_data[0].keys())
                data = [headers]

                for row in table_data:
                    data.append(list(row.values()))

                table = Table(data)

                table.setStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER")
                ])

                elements.append(table)

            # 8️⃣ construir pdf
            doc.build(elements)

            return {
                "status": "success",
                "file": output_path
            }

        except Exception as e:

            return {
                "status": "error",
                "message": str(e)
            }