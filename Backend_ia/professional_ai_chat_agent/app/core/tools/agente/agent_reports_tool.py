from app.core.tools.admin.base.nlp_parser import NLPParser


class AgentReportsTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def reportes_pendientes(self, agent_id: int = None):

        # Construir query dinámicamente según parámetros
        # USANDO ESTADOS EN MAYÚSCULAS
        query = """
        SELECT
            id_reporte,
            tipo_infraccion,
            descripcion,
            direccion,
            fecha_incidente,
            hora_incidente,
            estado,
            prioridad,
            created_at
        FROM reporte
        WHERE estado = 'PENDIENTE'
        """
        
        params = []
        if agent_id:
            query += " AND id_agente = %s"
            params.append(agent_id)
        
        query += " ORDER BY prioridad DESC, created_at DESC"

        reportes = self.db.fetch_all(query, tuple(params) if params else None)

        return {
            "total_reportes_pendientes": len(reportes),
            "reportes": reportes
        }

    async def mis_reportes_asignados(self, agent_id: int):

        query = """
        SELECT
            id_reporte,
            tipo_infraccion,
            descripcion,
            direccion,
            fecha_incidente,
            hora_incidente,
            estado,
            prioridad,
            created_at
        FROM reporte
        WHERE id_agente = %s
        ORDER BY prioridad DESC, created_at DESC
        """

        reportes = self.db.fetch_all(query, (agent_id,))

        return {
            "total": len(reportes),
            "reportes": reportes
        }

    async def reportes_por_estado(self, agent_id: int, estado: str = None):

        # Normalizar estado usando NLP
        if estado:
            estado = self.nlp.normalize_text(estado)
            estado = self.nlp.detect_estado(estado, "reporte")
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

        query = """
        SELECT
            estado,
            COUNT(*) as total
        FROM reporte
        WHERE id_agente = %s
        """
        
        params = [agent_id]
        
        if estado:
            query += " AND estado = %s"
            params.append(estado)
        
        query += " GROUP BY estado"

        resultados = self.db.fetch_all(query, tuple(params))

        return {
            "estado_filtro": estado,
            "agrupados": resultados
        }
