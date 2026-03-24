from sqlalchemy import text
from app.utils.logger import logger
from app.core.tools.admin.base.nlp_parser import NLPParser


class CitizenStatsTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def estadisticas_mis_reportes(self, user_id: int):
        """
        Obtiene estadísticas de los reportes del ciudadano.
        """
        try:
            # Query por estado - USANDO ESTADOS EN MAYÚSCULAS (como el backend Java)
            estado_query = text("""
                SELECT 
                    estado, 
                    COUNT(*) as total
                FROM reporte
                WHERE id_usuario = :user_id
                GROUP BY estado
            """)

            result = self.db.execute(estado_query, {"user_id": user_id})
            estados = result.mappings().all()

            # Query por tipo
            tipo_query = text("""
                SELECT 
                    tipo_infraccion, 
                    COUNT(*) as total
                FROM reporte
                WHERE id_usuario = :user_id
                GROUP BY tipo_infraccion
                ORDER BY total DESC
                LIMIT 5
            """)

            result = self.db.execute(tipo_query, {"user_id": user_id})
            tipos = result.mappings().all()

            # Total
            total_query = text("""
                SELECT COUNT(*) as total
                FROM reporte
                WHERE id_usuario = :user_id
            """)

            total_result = self.db.execute(total_query, {"user_id": user_id})
            total = total_result.mappings().first()["total"]

            # Resueltos recently - USANDO FINALIZADO (como el backend Java)
            resueltos_query = text("""
                SELECT COUNT(*) as total
                FROM reporte
                WHERE id_usuario = :user_id
                AND estado = 'FINALIZADO'
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            """)

            result = self.db.execute(resueltos_query, {"user_id": user_id})
            resueltos_30_dias = result.mappings().first()["total"]

            return {
                "total_reportes": total,
                "resueltos_ultimos_30_dias": resueltos_30_dias,
                "por_estado": [dict(e) for e in estados],
                "tipos_mas_comunes": [dict(t) for t in tipos]
            }

        except Exception as e:
            logger.exception(f"Error stats ciudadano: {str(e)}")
            return {
                "total_reportes": 0,
                "error": str(e)
            }

    async def obtener_tiempo_promedio_resolucion(self, user_id: int):
        """
        Calcula el tiempo promedio de resolución de los reportes del ciudadano.
        """
        try:
            # USANDO ESTADOS EN MAYÚSCULAS
            query = text("""
                SELECT 
                    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as promedio_horas,
                    MIN(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as min_horas,
                    MAX(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as max_horas,
                    COUNT(*) as total_resueltos
                FROM reporte
                WHERE id_usuario = :user_id
                AND estado = 'FINALIZADO'
                AND updated_at IS NOT NULL
            """)

            result = self.db.execute(query, {"user_id": user_id})
            row = result.mappings().first()

            if not row or row["total_resueltos"] == 0:
                return {
                    "total_resueltos": 0,
                    "promedio_horas": 0
                }

            return {
                "total_resueltos": row["total_resueltos"],
                "promedio_horas": round(row["promedio_horas"], 2) if row["promedio_horas"] else 0,
                "min_horas": row["min_horas"],
                "max_horas": row["max_horas"]
            }

        except Exception as e:
            logger.exception(f"Error calculando tiempo promedio: {str(e)}")
            return {"error": str(e)}
