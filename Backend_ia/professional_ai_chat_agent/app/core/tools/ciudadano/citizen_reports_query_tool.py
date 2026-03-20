from sqlalchemy import text
from app.utils.logger import logger
from app.core.tools.admin.base.nlp_parser import NLPParser


class CitizenReportsQueryTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def mis_reportes(
        self,
        user_id: int,
        estado: str = None,
        tipo: str = None,
        limite: int = 20
    ):
        """
        Obtiene los reportes del ciudadano con filtros opcionales.
        """
        try:
            # Normalizar filtros usando NLP
            if estado:
                estado_normalizado = self.nlp.normalize_text(estado)
                estado = self.nlp.detect_estado(estado_normalizado, "reporte")
                # MAPEAR A ESTADOS DEL BACKEND JAVA (MAYÚSCULAS)
                estado_mapping = {
                    "pendiente": "PENDIENTE",
                    "en_proceso": "EN_PROCESO",
                    "resuelto": "FINALIZADO",
                    "finalizado": "FINALIZADO",
                    "aprobado": "APROBADO",
                    "rechazado": "RECHAZADO"
                }
                estado = estado_mapping.get(estado, estado.upper() if estado else None)

            if tipo:
                tipo_normalizado = self.nlp.normalize_text(tipo)
                # Usar mapeo de sinónimos de infracciones
                for tipo_val, sinonimos in NLPParser.INFRACCION_SINONIMOS.items():
                    if tipo_normalizado in sinonimos:
                        tipo = tipo_val
                        break

            # Construir query dinámicamente
            conditions = ["id_usuario = :user_id"]
            params = {"user_id": user_id}

            if estado:
                conditions.append("estado = :estado")
                params["estado"] = estado

            if tipo:
                conditions.append("tipo_infraccion = :tipo")
                params["tipo"] = tipo

            where_clause = " AND ".join(conditions)

            # USANDO ESTADOS EN MAYÚSCULAS para ORDER BY
            # Solo campos relevantes para ciudadano
            query = text(f"""
                SELECT
                    tipo_infraccion,
                    descripcion,
                    direccion,
                    estado,
                    fecha_incidente,
                    hora_incidente
                FROM reporte
                WHERE {where_clause}
                ORDER BY 
                    CASE estado 
                        WHEN 'PENDIENTE' THEN 1 
                        WHEN 'EN_PROCESO' THEN 2 
                        WHEN 'FINALIZADO' THEN 3 
                        ELSE 4 
                    END,
                    created_at DESC
                LIMIT :limite
            """)
            
            params["limite"] = limite

            result = self.db.execute(query, params)
            rows = result.mappings().all()

            return {
                "total": len(rows),
                "filtros": {
                    "estado": estado,
                    "tipo": tipo
                },
                "reportes": [dict(row) for row in rows]
            }

        except Exception as e:
            logger.exception(f"Error consultando reportes: {str(e)}")
            return {
                "total": 0,
                "error": str(e),
                "reportes": []
            }

    async def obtener_detalle_reporte(self, reporte_id: int, user_id: int):
        """
        Obtiene el detalle de un reporte específico.
        """
        try:
            query = text("""
                SELECT
                    id_reporte,
                    tipo_infraccion,
                    descripcion,
                    direccion,
                    estado,
                    prioridad,
                    fecha_incidente,
                    hora_incidente,
                    placa,
                    created_at,
                    updated_at
                FROM reporte
                WHERE id_reporte = :reporte_id AND id_usuario = :user_id
            """)

            result = self.db.execute(query, {
                "reporte_id": reporte_id,
                "user_id": user_id
            })
            
            row = result.mappings().first()

            if not row:
                return {
                    "success": False,
                    "error": "Reporte no encontrado"
                }

            return {
                "success": True,
                "reporte": dict(row)
            }

        except Exception as e:
            logger.exception(f"Error obteniendo detalle: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
