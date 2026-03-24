from app.core.tools.admin.base.nlp_parser import NLPParser


class AgentStatsTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def mis_estadisticas(self, agent_id: int):
        """
        Obtiene estadísticas completas del agente.
        """

        # Validaciones - USANDO ESTADOS EN MAYÚSCULAS
        validaciones_query = """
        SELECT
            COUNT(*) as total_validaciones,
            SUM(CASE WHEN estado = 'APROBADA' THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado = 'RECHAZADA' THEN 1 ELSE 0 END) as rechazados,
            SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes
        FROM validaciones
        WHERE id_agente = %s
        """

        # Tareas - USANDO ESTADOS EN MAYÚSCULAS
        tareas_query = """
        SELECT
            COUNT(*) as total_tareas,
            SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas,
            SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso
        FROM tareas
        WHERE id_agente = %s
        """

        # Reportes asignados - USANDO ESTADOS EN MAYÚSCULAS
        reportes_query = """
        SELECT
            COUNT(*) as total_asignados,
            SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
            SUM(CASE WHEN estado = 'FINALIZADO' THEN 1 ELSE 0 END) as resueltos
        FROM reporte
        WHERE id_agente = %s
        """

        validaciones = self.db.fetch_one(validaciones_query, (agent_id,))
        tareas = self.db.fetch_one(tareas_query, (agent_id,))
        reportes = self.db.fetch_one(reportes_query, (agent_id,))

        # Calcular tasas
        total_validaciones = validaciones.get("total_validaciones", 0) if validaciones else 0
        aprobados = validaciones.get("aprobados", 0) if validaciones else 0
        
        tasa_aprobacion = 0
        if total_validaciones > 0:
            tasa_aprobacion = round((aprobados / total_validaciones) * 100, 2)

        return {
            "validaciones": {
                "total": total_validaciones,
                "aprobados": validaciones.get("aprobados", 0) if validaciones else 0,
                "rechazados": validaciones.get("rechazados", 0) if validaciones else 0,
                "pendientes": validaciones.get("pendientes", 0) if validaciones else 0,
                "tasa_aprobacion": tasa_aprobacion
            },
            "tareas": {
                "total": tareas.get("total_tareas", 0) if tareas else 0,
                "completadas": tareas.get("completadas", 0) if tareas else 0,
                "pendientes": tareas.get("pendientes", 0) if tareas else 0,
                "en_proceso": tareas.get("en_proceso", 0) if tareas else 0
            },
            "reportes": {
                "total": reportes.get("total_asignados", 0) if reportes else 0,
                "pendientes": reportes.get("pendientes", 0) if reportes else 0,
                "en_proceso": reportes.get("en_proceso", 0) if reportes else 0,
                "resueltos": reportes.get("resueltos", 0) if reportes else 0
            }
        }

    async def estadisticas_por_periodo(
        self,
        agent_id: int,
        dias: int = 30
    ):
        """
        Obtiene estadísticas del agente en un período específico.
        """
        # USANDO ESTADOS EN MAYÚSCULAS
        query_validaciones = """
        SELECT
            DATE(fecha_validacion) as fecha,
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'APROBADA' THEN 1 ELSE 0 END) as aprobados
        FROM validaciones
        WHERE id_agente = %s
        AND fecha_validacion >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY DATE(fecha_validacion)
        ORDER BY fecha DESC
        """

        query_tareas = """
        SELECT
            DATE(fecha) as fecha,
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas
        FROM tareas
        WHERE id_agente = %s
        AND fecha >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY DATE(fecha)
        ORDER BY fecha DESC
        """

        validaciones = self.db.fetch_all(query_validaciones, (agent_id, dias))
        tareas = self.db.fetch_all(query_tareas, (agent_id, dias))

        return {
            "periodo_dias": dias,
            "validaciones_por_fecha": validaciones,
            "tareas_por_fecha": tareas
        }
