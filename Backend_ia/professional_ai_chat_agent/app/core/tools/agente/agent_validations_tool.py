from app.core.tools.admin.base.nlp_parser import NLPParser


class AgentValidationsTool:

    def __init__(self, db):
        self.db = db
        self.nlp = NLPParser()

    async def mis_validaciones(
        self,
        agent_id: int,
        estado: str = None,
        limite: int = 50
    ):
        """
        Obtiene las validaciones del agente con filtros opcionales.
        """
        # Normalizar estado - USANDO ESTADOS EN MAYÚSCULAS
        if estado:
            estado_normalizado = self.nlp.normalize_text(estado)
            # Mapeo manual para validaciones
            if "aprob" in estado_normalizado:
                estado = "APROBADA"
            elif "rechaz" in estado_normalizado:
                estado = "RECHAZADA"
            elif "pendiente" in estado_normalizado:
                estado = "PENDIENTE"

        query = """
        SELECT
            v.id_validacion,
            v.id_reporte,
            r.tipo_infraccion,
            r.direccion,
            v.estado,
            v.comentarios,
            v.fecha_validacion,
            v.created_at
        FROM validaciones v
        INNER JOIN reporte r ON r.id_reporte = v.id_reporte
        WHERE v.id_agente = %s
        """
        
        params = [agent_id]
        
        if estado:
            query += " AND v.estado = %s"
            params.append(estado)
        
        query += " ORDER BY v.fecha_validacion DESC LIMIT %s"
        params.append(limite)

        validaciones = self.db.fetch_all(query, tuple(params))

        return {
            "total_validaciones": len(validaciones),
            "filtro_estado": estado,
            "validaciones": validaciones
        }

    async def crear_validacion(
        self,
        agent_id: int,
        id_reporte: int,
        estado: str,
        comentarios: str = ""
    ) -> dict:
        """
        Crea una nueva validación para un reporte.
        """
        # Normalizar estado - USANDO ESTADOS EN MAYÚSCULAS
        estado_normalizado = self.nlp.normalize_text(estado)
        
        if "aprob" in estado_normalizado:
            estado_final = "APROBADA"
        elif "rechaz" in estado_normalizado:
            estado_final = "RECHAZADA"
        else:
            return {
                "success": False,
                "error": "Estado debe ser 'APROBADA' o 'RECHAZADA'"
            }

        # Verificar que el reporte exista y no esté ya validado - USANDO ESTADOS EN MAYÚSCULAS
        check_query = """
        SELECT id_reporte, estado FROM reporte 
        WHERE id_reporte = %s AND id_agente = %s
        """
        reporte = self.db.fetch_one(check_query, (id_reporte, agent_id))

        if not reporte:
            return {
                "success": False,
                "error": "Reporte no encontrado o no asignado a este agente"
            }

        if reporte.get("estado") in ["FINALIZADO", "finalizado", "resuelto"]:
            return {
                "success": False,
                "error": "El reporte ya está resuelto"
            }

        # Insertar validación - USANDO ESTADOS EN MAYÚSCULAS
        insert_query = """
        INSERT INTO validaciones 
        (id_reporte, id_agente, estado, comentarios, fecha_validacion, created_at)
        VALUES (%s, %s, %s, %s, NOW(), NOW())
        """
        
        self.db.execute(insert_query, (id_reporte, agent_id, estado_final, comentarios))

        # Actualizar estado del reporte - USANDO ESTADOS EN MAYÚSCULAS
        update_query = """
        UPDATE reporte 
        SET estado = %s, updated_at = NOW()
        WHERE id_reporte = %s
        """
        
        nuevo_estado_reporte = "APROBADO" if estado_final == "APROBADA" else "RECHAZADO"
        self.db.execute(update_query, (nuevo_estado_reporte, id_reporte))

        return {
            "success": True,
            "message": f"Validacion '{estado_final}' creada para reporte {id_reporte}"
        }
