"""
Tool de Consulta de Agentes para Administrador.
Permite consultar agentes con filtros dinámicos, búsquedas avanzadas
y obtener estadísticas relacionadas.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy import text
from datetime import datetime

from app.core.tools.admin.base.base_query_tool import BaseQueryTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class AgentQueryTool:
    """
    Tool profesional para consultar agentes del sistema.
    
    Funcionalidades:
    - Consulta de todos los agentes o filtrados
    - Búsqueda por estado, placa, teléfono, nombre
    - JOINs con reportes y tareas
    - Conteo de reportes por agente
    - Paginación y ordenamiento
    """
    
    # Campos permitidos para filtrado
    ALLOWED_FILTERS = ['estado', 'placa', 'telefono', 'nombre', 'documento']
    ALLOWED_SORTS = ['placa', 'nombre', 'estado', 'telefono', 'documento']
    
    def __init__(self, db):
        """
        Inicializa el tool de consulta de agentes.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
        """
        self.db = db
        self.base = BaseQueryTool(db)
        self.nlp = NLPParser()
    
    # ======================================================
    # MÉTODOS DE CONSULTA PRINCIPALES
    # ======================================================
    
    async def obtener_agentes(
        self,
        mensaje: str = "",
        estado: Optional[str] = None,
        placa: Optional[str] = None,
        telefono: Optional[str] = None,
        nombre: Optional[str] = None,
        documento: Optional[str] = None,
        incluir_reportes: bool = False,
        incluir_tareas: bool = False,
        incluir_estadisticas: bool = False,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "nombre",
        order: str = "asc"
    ) -> Dict[str, Any]:
        """
        Obtiene lista de agentes con filtros dinámicos.
        
        Args:
            mensaje: Mensaje original del usuario (para NLP)
            estado: Filtrar por estado
            placa: Filtrar por placa
            telefono: Filtrar por teléfono
            nombre: Filtrar por nombre (búsqueda)
            documento: Filtrar por documento
            incluir_reportes: Incluir reportes del agente
            incluir_tareas: Incluir tareas del agente
            incluir_estadisticas: Incluir estadísticas del agente
            page: Número de página
            page_size: Tamaño de página
            sort_by: Campo para ordenar
            order: Orden (asc/desc)
        
        Returns:
            Dict con agentes y metadatos
        """
        try:
            # Si hay mensaje, extraer parámetros via NLP
            if mensaje:
                params = self.nlp.extract_params(mensaje)
                estado = estado or params.get('estado')
                placa = placa or params.get('placa')
                telefono = telefono or params.get('telefono')
                
                # Detectar estado de agente
                if not estado and self.nlp.detect_estado(mensaje, "agente"):
                    estado = self.nlp.detect_estado(mensaje, "agente")
            
            # Validar y normalizar parámetros
            filters = self._build_filters(
                estado=estado,
                placa=placa,
                telefono=telefono,
                nombre=nombre,
                documento=documento
            )
            
            # Validar paginación
            if page < 1:
                page = 1
            if page_size < 1:
                page_size = 20
            if page_size > 100:
                page_size = 100
            
            # Validar ordenamiento
            if sort_by not in self.ALLOWED_SORTS:
                sort_by = "nombre"
            if order.lower() not in ["asc", "desc"]:
                order = "asc"
            
            # Construir query
            query, count_query, params = self._build_query(
                filters=filters,
                incluir_reportes=incluir_reportes,
                incluir_tareas=incluir_tareas,
                sort_by=sort_by,
                order=order,
                page=page,
                page_size=page_size
            )
            
            # Ejecutar query principal
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success:
                logger.error(f"Error consultando agentes: {error}")
                return self.base.format_error(
                    f"Error consultando agentes: {error}",
                    "DB_ERROR"
                )
            
            # Aplicar paginación en memoria si es necesario
            data = self.base.format_rows(data)
            
            # Obtener conteo total
            total = len(data)
            if total > 0:
                # Query de conteo
                count_success, total_count, _ = self.base.execute_scalar(
                    count_query, params
                )
                if count_success:
                    total = total_count
            
            # Preparar respuesta
            response = {
                "success": True,
                "total": total,
                "agentes": data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
                },
                "filtros_aplicados": filters,
                "timestamp": datetime.now().isoformat()
            }
            
            # Incluir estadísticas si se solicita
            if incluir_estadisticas and data:
                agentes_ids = [a.get('id_agente') or a.get('id') for a in data if a.get('id_agente') or a.get('id')]
                if agentes_ids:
                    estadisticas = await self._obtener_estadisticas_agentes(agentes_ids)
                    response["estadisticas"] = estadisticas
            
            # Incluir reportes si se solicita
            if incluir_reportes and data:
                agentes_ids = [a.get('id_agente') or a.get('id') for a in data if a.get('id_agente') or a.get('id')]
                if agentes_ids:
                    reportes = await self._obtener_reportes_agentes(agentes_ids)
                    response["reportes"] = reportes
            
            # Incluir tareas si se solicita
            if incluir_tareas and data:
                agentes_ids = [a.get('id_agente') or a.get('id') for a in data if a.get('id_agente') or a.get('id')]
                if agentes_ids:
                    tareas = await self._obtener_tareas_agentes(agentes_ids)
                    response["tareas"] = tareas
            
            return response
            
        except Exception as e:
            logger.exception(f"Error inesperado en obtener_agentes: {str(e)}")
            return self.base.format_error(
                f"Error inesperado: {str(e)}",
                "UNEXPECTED_ERROR"
            )
    
    async def obtener_agente_por_id(
        self,
        agente_id: int,
        incluir_reportes: bool = False,
        incluir_tareas: bool = False
    ) -> Dict[str, Any]:
        """
        Obtiene un agente específico por ID.
        
        Args:
            agente_id: ID del agente (id_usuario de la tabla agentes)
            incluir_reportes: Incluir reportes del agente
            incluir_tareas: Incluir tareas del agente
        
        Returns:
            Dict con datos del agente
        """
        try:
            query = text("""
                SELECT 
                    a.placa,
                    a.nombre,
                    a.telefono,
                    a.estado,
                    u.nombre_completo,
                    u.correo as email
                FROM agentes a
                INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
                WHERE a.id_usuario = :agente_id
            """)
            
            result = self.base.execute_query_with_count(query, {"agente_id": agente_id})
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success or not data:
                return self.base.format_empty("agente")
            
            agente = self.base.format_rows(data)[0]
            
            response = {
                "success": True,
                "total": 1,
                "agente": agente,
                "timestamp": datetime.now().isoformat()
            }
            
            if incluir_reportes:
                reportes = await self._obtener_reportes_agentes([agente_id])
                response["reportes"] = reportes
            
            if incluir_tareas:
                tareas = await self._obtener_tareas_agentes([agente_id])
                response["tareas"] = tareas
            
            return response
            
        except Exception as e:
            logger.exception(f"Error obteniendo agente por ID: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    async def obtener_agentes_activos(self) -> Dict[str, Any]:
        """
        Obtiene solo agentes disponibles (estado = DISPONIBLE).
        Alias para compatibilidad.
        """
        return await self.obtener_agentes(estado="disponible")
    
    async def conteo_agentes(
        self,
        estado: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retorna el conteo de agentes, opcionalmente por estado.
        
        Args:
            estado: Filtrar por estado específico
        
        Returns:
            Dict con conteos
        """
        try:
            if estado:
                query = text("""
                    SELECT COUNT(*) as total
                    FROM agentes
                    WHERE LOWER(estado) = LOWER(:estado)
                """)
                params = {"estado": estado}
            else:
                query = text("SELECT COUNT(*) as total FROM agentes")
                params = {}
            
            success, total, error = self.base.execute_scalar(query, params)
            
            if not success:
                return self.base.format_error(error, "DB_ERROR")
            
            # Obtener conteo por estado
            estados_query = text("""
                SELECT estado, COUNT(*) as total
                FROM agentes
                GROUP BY estado
            """)
            
            result = self.base.execute_query_with_count(estados_query)
            success = result.get("success", False)
            estados_data = result.get("data", [])
            
            return {
                "success": True,
                "total": total,
                "por_estado": estados_data if success else [],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en conteo_agentes: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    # ======================================================
    # MÉTODOS AUXILIARES DE CONSULTA
    # ======================================================
    
    def _build_filters(
        self,
        estado: Optional[str] = None,
        placa: Optional[str] = None,
        telefono: Optional[str] = None,
        nombre: Optional[str] = None,
        documento: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Construye diccionario de filtros a partir de parámetros.
        """
        filters = {}
        
        if estado:
            filters['estado'] = estado.lower()
        if placa:
            filters['placa'] = placa.upper()
        if telefono:
            filters['telefono'] = telefono
        if nombre:
            filters['nombre'] = f"%{nombre}%"
        if documento:
            filters['documento'] = documento
        
        return filters
    
    def _build_query(
        self,
        filters: Dict[str, Any],
        incluir_reportes: bool = False,
        incluir_tareas: bool = False,
        sort_by: str = "nombre",
        order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> tuple:
        """
        Construye la query SQL y sus parámetros.
        
        Returns:
            Tupla (query, count_query, params)
        """
        # Base query - Campos esenciales, sin id_agente, sin documento
        query = """
            SELECT 
                a.placa,
                a.nombre,
                a.telefono,
                a.estado,
                u.nombre_completo,
                u.correo as email
            FROM agentes a
            INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
        """
        
        # Count query - Filtrar solo agentes por role
        count_query = """
            SELECT COUNT(*) as total 
            FROM agentes a
            INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
        """
        
        # Construir condiciones WHERE
        conditions = []
        params = {}
        
        for field, value in filters.items():
            if field == 'nombre':
                conditions.append("a.nombre LIKE :nombre")
                params['nombre'] = value
            elif field == 'placa':
                conditions.append("a.placa LIKE :placa")
                params['placa'] = f"%{value}%"
            else:
                conditions.append(f"LOWER(a.{field}) = LOWER(:{field})")
                params[field] = value
        
        # Agregar WHERE si hay condiciones
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            query += where_clause
            count_query += where_clause.replace("a.", "")
        
        # Agregar ordenamiento
        order_val = "DESC" if order.lower() == "desc" else "ASC"
        sort_field = sort_by if sort_by != 'nombre' else 'a.nombre'
        query += f" ORDER BY {sort_field} {order_val}"
        
        # Agregar paginación
        offset = (page - 1) * page_size
        query += f" LIMIT :limit OFFSET :offset"
        params['limit'] = page_size
        params['offset'] = offset
        
        return query, count_query, params
    
    async def _obtener_estadisticas_agentes(
        self,
        agentes_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """
        Obtiene estadísticas de reportes y tareas por agente.
        """
        try:
            if not agentes_ids:
                return []
            
            # USANDO ESTADOS EN MAYÚSCULAS - Corregido para usar id_usuario
            query = text("""
                SELECT 
                    a.id_usuario as id_agente,
                    a.nombre,
                    COUNT(DISTINCT r.id_reporte) as total_reportes,
                    COUNT(DISTINCT CASE WHEN r.estado = 'PENDIENTE' THEN r.id_reporte END) as reportes_pendientes,
                    COUNT(DISTINCT CASE WHEN r.estado = 'EN_PROCESO' THEN r.id_reporte END) as reportes_en_proceso,
                    COUNT(DISTINCT CASE WHEN r.estado = 'FINALIZADO' THEN r.id_reporte END) as reportes_resueltos,
                    COUNT(DISTINCT t.id) as total_tareas,
                    COUNT(DISTINCT CASE WHEN t.estado = 'PENDIENTE' THEN t.id END) as tareas_pendientes,
                    COUNT(DISTINCT CASE WHEN t.estado = 'COMPLETADA' THEN t.id END) as tareas_completadas
                FROM agentes a
                LEFT JOIN reporte r ON a.id_usuario = r.id_agente
                LEFT JOIN tareas t ON a.id_usuario = t.id_agente
                WHERE a.id_usuario IN :agentes_ids
                GROUP BY a.id_usuario, a.nombre
            """)
            
            # SQLAlchemy no soporta IN con lista directamente, transformar
            placeholders = ','.join([f':id_{i}' for i in range(len(agentes_ids))])
            query_text = query.string.replace(':agentes_ids', placeholders)
            
            params = {f'id_{i}': id for i, id in enumerate(agentes_ids)}
            
            result = self.base.execute_query_with_count(query_text, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return self.base.format_rows(data)
            return []
            
        except Exception as e:
            logger.exception(f"Error obteniendo estadísticas: {str(e)}")
            return []
    
    async def _obtener_reportes_agentes(
        self,
        agentes_ids: List[int]
    ) -> Dict[int, List[Dict[str, Any]]]:
        """
        Obtiene reportes agrupados por agente.
        """
        try:
            if not agentes_ids:
                return {}
            
            query = text("""
                SELECT 
                    r.id_reporte,
                    r.tipo_infraccion as tipo,
                    r.descripcion,
                    r.direccion,
                    r.estado,
                    r.placa,
                    r.fecha_incidente,
                    r.created_at,
                    a.id_usuario as id_agente,
                    a.nombre as nombre_agente
                FROM reporte r
                INNER JOIN agentes a ON r.id_agente = a.id_usuario
                WHERE r.id_agente IN :agentes_ids
                ORDER BY r.created_at DESC
                LIMIT 10
            """)
            
            placeholders = ','.join([f':id_{i}' for i in range(len(agentes_ids))])
            query_text = query.string.replace(':agentes_ids', placeholders)
            
            params = {f'id_{i}': id for i, id in enumerate(agentes_ids)}
            
            result = self.base.execute_query_with_count(query_text, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                formatted = self.base.format_rows(data)
                # Agrupar por agente
                grouped = {}
                for row in formatted:
                    agente_id = row.get('id_agente')
                    if agente_id not in grouped:
                        grouped[agente_id] = []
                    grouped[agente_id].append(row)
                return grouped
            return {}
            
        except Exception as e:
            logger.exception(f"Error obteniendo reportes: {str(e)}")
            return {}
    
    async def _obtener_tareas_agentes(
        self,
        agentes_ids: List[int]
    ) -> Dict[int, List[Dict[str, Any]]]:
        """
        Obtiene tareas agrupadas por agente.
        """
        try:
            if not agentes_ids:
                return {}
            
            query = text("""
                SELECT 
                    t.id,
                    t.titulo,
                    t.descripcion,
                    t.fecha,
                    t.hora,
                    t.prioridad,
                    t.estado,
                    a.id_usuario as id_agente,
                    a.nombre as nombre_agente
                FROM tareas t
                INNER JOIN agentes a ON t.id_agente = a.id_usuario
                WHERE t.id_agente IN :agentes_ids
                ORDER BY t.fecha DESC, t.prioridad DESC
                LIMIT 10
            """)
            
            placeholders = ','.join([f':id_{i}' for i in range(len(agentes_ids))])
            query_text = query.string.replace(':agentes_ids', placeholders)
            
            params = {f'id_{i}': id for i, id in enumerate(agentes_ids)}
            
            result = self.base.execute_query_with_count(query_text, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                formatted = self.base.format_rows(data)
                # Agrupar por agente
                grouped = {}
                for row in formatted:
                    agente_id = row.get('id_agente')
                    if agente_id not in grouped:
                        grouped[agente_id] = []
                    grouped[agente_id].append(row)
                return grouped
            return {}
            
        except Exception as e:
            logger.exception(f"Error obteniendo tareas: {str(e)}")
            return {}
    
    # ======================================================
    # MÉTODO DE COMPATIBILIDAD (mantiene API anterior)
    # ======================================================
    
    async def obtener_agentes_legacy(self, estado: Optional[str] = None) -> Dict[str, Any]:
        """
        Método de compatibilidad con la API anterior.
        Mantiene la firma original: obtener_agentes(estado=None)
        """
        return await self.obtener_agentes(estado=estado)
