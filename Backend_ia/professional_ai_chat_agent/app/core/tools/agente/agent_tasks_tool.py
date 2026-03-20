from app.core.tools.admin.base.nlp_parser import NLPParser


class AgentTasksTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def mis_tareas(
        self,
        agent_id: int,
        estado: str = None,
        prioridad: str = None,
        fecha_inicio: str = None,
        fecha_fin: str = None
    ):
        """
        Obtiene las tareas del agente con filtros dinámicos.
        """
        # Normalizar parámetros usando NLP
        if estado:
            estado_normalizado = self.nlp.normalize_text(estado)
            estado = self.nlp.detect_estado(estado_normalizado, "tarea")
        
        if prioridad:
            prioridad_normalizada = self.nlp.normalize_text(prioridad)
            prioridad = self.nlp.detect_prioridad(prioridad_normalizada)

        # Construir query dinámicamente
        conditions = ["id_agente = %s"]
        params = [agent_id]

        if estado:
            conditions.append("estado = %s")
            params.append(estado.upper() if estado.upper() in ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'] else 'PENDIENTE')

        if prioridad:
            conditions.append("prioridad = %s")
            params.append(prioridad)

        if fecha_inicio:
            conditions.append("fecha >= %s")
            params.append(fecha_inicio)

        if fecha_fin:
            conditions.append("fecha <= %s")
            params.append(fecha_fin)

        where_clause = " AND ".join(conditions)

        query = f"""
        SELECT 
            id_tarea,
            descripcion,
            fecha,
            hora,
            prioridad,
            estado,
            created_at
        FROM tareas
        WHERE {where_clause}
        ORDER BY 
            CASE prioridad 
                WHEN 'urgente' THEN 1 
                WHEN 'alta' THEN 2 
                WHEN 'media' THEN 3 
                WHEN 'baja' THEN 4 
                ELSE 5 
            END,
            fecha ASC
        """

        tareas = self.db.fetch_all(query, tuple(params))

        return {
            "total": len(tareas),
            "filtros": {
                "estado": estado,
                "prioridad": prioridad,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin
            },
            "tareas": tareas
        }

    async def mis_tareas_pendientes(self, agent_id: int):

        query = """
        SELECT 
            id_tarea,
            descripcion,
            fecha,
            hora,
            prioridad,
            created_at
        FROM tareas
        WHERE id_agente = %s
        AND estado = 'PENDIENTE'
        ORDER BY 
            CASE prioridad 
                WHEN 'urgente' THEN 1 
                WHEN 'alta' THEN 2 
                WHEN 'media' THEN 3 
                WHEN 'baja' THEN 4 
                ELSE 5 
            END,
            fecha ASC
        """

        tareas = self.db.fetch_all(query, (agent_id,))

        return {
            "total_pendientes": len(tareas),
            "tareas": tareas
        }

    async def mis_tareas_en_proceso(self, agent_id: int):

        query = """
        SELECT 
            id_tarea,
            descripcion,
            fecha,
            hora,
            prioridad,
            updated_at
        FROM tareas
        WHERE id_agente = %s
        AND estado = 'EN_PROCESO'
        ORDER BY fecha ASC
        """

        tareas = self.db.fetch_all(query, (agent_id,))

        return {
            "total_en_proceso": len(tareas),
            "tareas": tareas
        }

    async def mis_tareas_completadas(self, agent_id: int):

        query = """
        SELECT 
            id_tarea,
            descripcion,
            fecha,
            fecha_fin,
            prioridad,
            updated_at
        FROM tareas
        WHERE id_agente = %s
        AND estado = 'COMPLETADA'
        ORDER BY fecha_fin DESC
        """

        tareas = self.db.fetch_all(query, (agent_id,))

        return {
            "total_completadas": len(tareas),
            "tareas": tareas
        }

    async def actualizar_estado_tarea(
        self,
        tarea_id: int,
        agent_id: int,
        nuevo_estado: str
    ) -> dict:
        """
        Actualiza el estado de una tarea.
        """
        # Normalizar estado
        estado_normalizado = self.nlp.normalize_text(nuevo_estado)
        estado = self.nlp.detect_estado(estado_normalizado, "tarea")

        if not estado:
            return {
                "success": False,
                "error": f"Estado '{nuevo_estado}' no válido"
            }

        # Verificar que la tarea pertenezca al agente
        check_query = "SELECT id_tarea FROM tareas WHERE id_tarea = %s AND id_agente = %s"
        tarea = self.db.fetch_one(check_query, (tarea_id, agent_id))

        if not tarea:
            return {
                "success": False,
                "error": "Tarea no encontrada o no pertenece al agente"
            }

        # Actualizar estado
        update_query = """
        UPDATE tareas 
        SET estado = %s, 
            updated_at = NOW()
        WHERE id_tarea = %s
        """
        
        self.db.execute(update_query, (estado.upper(), tarea_id))

        return {
            "success": True,
            "message": f"Tarea {tarea_id} actualizada a '{estado}'"
        }
