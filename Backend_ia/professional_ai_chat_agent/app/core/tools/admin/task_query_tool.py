"""
Tool de Consulta de Tareas para Administrador.
Permite consultar tareas con filtros dinámicos, búsquedas avanzadas
y obtener información completa de tareas.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy import text
from datetime import datetime, timedelta

from app.core.tools.admin.base.base_query_tool import BaseQueryTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class TaskQueryTool:
    """
    Tool profesional para consultar tareas del sistema.
    
    Funcionalidades:
    - Consulta de todas las tareas o filtradas
    - Filtros por: fecha, estado, prioridad, agente
    - Búsqueda por descripción o título
    - Tareas del día, pendientes, en proceso, completadas
    - Paginación y ordenamiento
    """
    
    ALLOWED_FILTERS = ['estado', 'prioridad', 'fecha', 'id_agente', 'titulo', 'descripcion']
    ALLOWED_SORTS = ['id', 'fecha', 'hora', 'prioridad', 'estado', 'titulo']
    
    def __init__(self, db):
        """
        Inicializa el tool de consulta de tareas.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
        """
        self.db = db
        self.base = BaseQueryTool(db)
        self.nlp = NLPParser()
    
    # ======================================================
    # MÉTODOS DE CONSULTA PRINCIPALES
    # ======================================================
    
    async def obtener_tareas(
        self,
        mensaje: str = "",
        estado: Optional[str] = None,
        prioridad: Optional[str] = None,
        fecha: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_agente: Optional[int] = None,
        nombre_agente: Optional[str] = None,
        incluir_agente: bool = False,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "fecha",
        order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Obtiene lista de tareas con filtros dinámicos.
        
        Args:
            mensaje: Mensaje original del usuario (para NLP)
            estado: Filtrar por estado (PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA)
            prioridad: Filtrar por prioridad (urgente, alta, media, baja)
            fecha: Filtrar por fecha específica (YYYY-MM-DD)
            fecha_inicio: Fecha inicial del rango
            fecha_fin: Fecha final del rango
            id_agente: Filtrar por ID de agente
            nombre_agente: Filtrar por nombre de agente
            incluir_agente: Incluir datos del agente
            page: Número de página
            page_size: Tamaño de página
            sort_by: Campo para ordenar
            order: Orden (asc/desc)
        
        Returns:
            Dict con tareas y metadatos
        """
        try:
            # Si hay mensaje, extraer parámetros via NLP
            if mensaje:
                params = self.nlp.extract_params(mensaje)
                estado = estado or params.get('estado')
                prioridad = prioridad or params.get('prioridad')
                
                # Extraer fecha del mensaje
                fecha_params = self.nlp.extract_fecha(mensaje)
                if fecha_params:
                    fecha_inicio = fecha_inicio or fecha_params.get('fecha_inicio')
                    fecha_fin = fecha_fin or fecha_params.get('fecha_fin')
                
                # Detectar estado de tarea
                if not estado and self.nlp.detect_estado(mensaje, "tarea"):
                    estado = self.nlp.detect_estado(mensaje, "tarea")
                
                # Detectar prioridad
                if not prioridad and self.nlp.detect_prioridad(mensaje):
                    prioridad = self.nlp.detect_prioridad(mensaje)
            
            # Validar y normalizar parámetros
            filters = self._build_filters(
                estado=estado,
                prioridad=prioridad,
                fecha=fecha,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                id_agente=id_agente,
                nombre_agente=nombre_agente
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
                sort_by = "fecha"
            if order.lower() not in ["asc", "desc"]:
                order = "desc"
            
            # Construir query
            query, count_query, params = self._build_query(
                filters=filters,
                incluir_agente=incluir_agente,
                sort_by=sort_by,
                order=order,
                page=page,
                page_size=page_size
            )
            
            # Ejecutar query
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success:
                logger.error(f"Error consultando tareas: {error}")
                return self.base.format_error(f"Error consultando tareas: {error}", "DB_ERROR")
            
            # Formatear datos
            data = self.base.format_rows(data)
            
            # Obtener conteo total
            total = len(data)
            if total > 0:
                count_success, total_count, _ = self.base.execute_scalar(count_query, params)
                if count_success:
                    total = total_count
            
            # Preparar respuesta
            return {
                "success": True,
                "total": total,
                "tareas": data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
                },
                "filtros_aplicados": filters,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error inesperado en obtener_tareas: {str(e)}")
            return self.base.format_error(f"Error inesperado: {str(e)}", "UNEXPECTED_ERROR")
    
    async def tareas_del_dia(self) -> Dict[str, Any]:
        """
        Obtiene las tareas del día actual.
        Alias para compatibilidad.
        """
        hoy = datetime.now().strftime('%Y-%m-%d')
        return await self.obtener_tareas(fecha=hoy)
    
    async def tareas_pendientes(self) -> Dict[str, Any]:
        """
        Obtiene las tareas pendientes.
        Alias para compatibilidad.
        """
        return await self.obtener_tareas(estado="pendiente")
    
    async def tareas_por_fecha(
        self,
        fecha: str,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene tareas para una fecha específica.
        
        Args:
            fecha: Fecha en formato YYYY-MM-DD
            incluir_agente: Incluir datos del agente
        
        Returns:
            Dict con tareas de la fecha
        """
        return await self.obtener_tareas(
            fecha=fecha,
            incluir_agente=incluir_agente
        )
    
    async def tareas_por_rango_fechas(
        self,
        fecha_inicio: str,
        fecha_fin: str,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene tareas en un rango de fechas.
        
        Args:
            fecha_inicio: Fecha inicial (YYYY-MM-DD)
            fecha_fin: Fecha final (YYYY-MM-DD)
            incluir_agente: Incluir datos del agente
        
        Returns:
            Dict con tareas del rango
        """
        return await self.obtener_tareas(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            incluir_agente=incluir_agente
        )
    
    async def tareas_por_agente(
        self,
        agente_id: int,
        incluir_agente: bool = False
    ) -> Dict[str, Any]:
        """
        Obtiene tareas de un agente específico.
        
        Args:
            agente_id: ID del agente
            incluir_agente: Incluir datos del agente
        
        Returns:
            Dict con tareas del agente
        """
        return await self.obtener_tareas(
            id_agente=agente_id,
            incluir_agente=incluir_agente
        )
    
    async def conteo_tareas(
        self,
        estado: Optional[str] = None,
        prioridad: Optional[str] = None,
        fecha: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retorna el conteo de tareas con filtros opcionales.
        
        Args:
            estado: Filtrar por estado
            prioridad: Filtrar por prioridad
            fecha: Filtrar por fecha
        
        Returns:
            Dict con conteos
        """
        try:
            filters = self._build_filters(
                estado=estado,
                prioridad=prioridad,
                fecha=fecha
            )
            
            # Query base
            base_where = ""
            if filters:
                conditions = []
                params = {}
                for field, value in filters.items():
                    if value:
                        conditions.append(f"t.{field} = :{field}")
                        params[field] = value
                if conditions:
                    base_where = " WHERE " + " AND ".join(conditions)
            
            # Conteo total
            count_query = f"SELECT COUNT(*) as total FROM tareas t{base_where}"
            
            success, total, error = self.base.execute_scalar(
                count_query,
                {k: v for k, v in filters.items() if v}
            )
            
            if not success:
                return self.base.format_error(error, "DB_ERROR")
            
            # Conteo por estado
            estados_query = """
                SELECT estado, COUNT(*) as total
                FROM tareas
                GROUP BY estado
            """
            
            result_estados = self.base.execute_query_with_count(estados_query)
            success = result_estados.get("success", False)
            estados_data = result_estados.get("data", [])
            
            # Conteo por prioridad
            prioridades_query = """
                SELECT prioridad, COUNT(*) as total
                FROM tareas
                GROUP BY prioridad
            """
            
            result_prioridades = self.base.execute_query_with_count(prioridades_query)
            prioridades_data = result_prioridades.get("data", [])
            
            return {
                "success": True,
                "total": total,
                "por_estado": estados_data if success else [],
                "por_prioridad": prioridades_data if success else [],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en conteo_tareas: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    async def proximas_tareas(
        self,
        dias: int = 7,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene las tareas de los próximos días.
        
        Args:
            dias: Número de días hacia adelante
            incluir_agente: Incluir datos del agente
        
        Returns:
            Dict con tareas próximas
        """
        hoy = datetime.now().strftime('%Y-%m-%d')
        fin = (datetime.now() + timedelta(days=dias)).strftime('%Y-%m-%d')
        
        return await self.obtener_tareas(
            fecha_inicio=hoy,
            fecha_fin=fin,
            incluir_agente=incluir_agente
        )
    
    # ======================================================
    # MÉTODOS AUXILIARES
    # ======================================================
    
    def _build_filters(
        self,
        estado: Optional[str] = None,
        prioridad: Optional[str] = None,
        fecha: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_agente: Optional[int] = None,
        nombre_agente: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Construye diccionario de filtros.
        """
        filters = {}
        
        if estado:
            filters['estado'] = estado.upper()
        if prioridad:
            filters['prioridad'] = prioridad.lower()
        if fecha:
            filters['fecha'] = fecha
        if id_agente:
            filters['id_agente'] = id_agente
        if nombre_agente:
            filters['nombre_agente'] = f"%{nombre_agente}%"
        
        # Manejar rango de fechas
        if fecha_inicio or fecha_fin:
            filters['fecha_inicio'] = fecha_inicio
            filters['fecha_fin'] = fecha_fin
        
        return filters
    
    def _build_query(
        self,
        filters: Dict[str, Any],
        incluir_agente: bool = False,
        sort_by: str = "fecha",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> tuple:
        """
        Construye la query SQL y sus parámetros.
        
        Returns:
            Tupla (query, count_query, params)
        """
        # Seleccionar campos
        select_fields = [
            "t.id",
            "t.titulo",
            "t.descripcion",
            "t.fecha",
            "t.hora",
            "t.prioridad",
            "t.estado"
        ]
        
        joins = []
        if incluir_agente or filters.get('nombre_agente'):
            joins.append("LEFT JOIN agentes a ON t.id_agente = a.id_usuario")
            select_fields.append("a.nombre as nombre_agente")
            select_fields.append("a.placa as placa_agente")
        
        # Query principal
        query = f"SELECT {', '.join(select_fields)} FROM tareas t"
        
        if joins:
            query += " " + " ".join(joins)
        
        # Count query
        count_query = "SELECT COUNT(*) as total FROM tareas t"
        if joins:
            count_query += " " + " ".join(joins)
        
        # Construir condiciones WHERE
        conditions = []
        params = {}
        
        for field, value in filters.items():
            if value is None or value == "":
                continue
                
            if field == 'fecha_inicio':
                conditions.append("t.fecha >= :fecha_inicio")
                params['fecha_inicio'] = value
            elif field == 'fecha_fin':
                conditions.append("t.fecha <= :fecha_fin")
                params['fecha_fin'] = value
            elif field == 'nombre_agente':
                conditions.append("a.nombre LIKE :nombre_agente")
                params['nombre_agente'] = value
            elif field in ['estado', 'prioridad', 'fecha']:
                conditions.append(f"t.{field} = :{field}")
                params[field] = value
            elif field == 'id_agente':
                conditions.append("t.id_agente = :id_agente")
                params['id_agente'] = value
        
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            query += where_clause
            count_query += where_clause
        
        # Agregar ordenamiento
        order_val = "DESC" if order.lower() == "desc" else "ASC"
        
        # Mapeo de campos de ordenamiento
        sort_mapping = {
            'id': 't.id',
            'fecha': 't.fecha',
            'hora': 't.hora',
            'prioridad': 't.prioridad',
            'estado': 't.estado',
            'titulo': 't.titulo'
        }
        sort_field = sort_mapping.get(sort_by, 't.fecha')
        
        query += f" ORDER BY {sort_field} {order_val}, t.prioridad DESC"
        
        # Agregar paginación
        offset = (page - 1) * page_size
        query += f" LIMIT :limit OFFSET :offset"
        params['limit'] = page_size
        params['offset'] = offset
        
        return query, count_query, params
    
    # ======================================================
    # MÉTODO DE COMPATIBILIDAD
    # ======================================================
    
    async def obtener_tareas_legacy(self) -> Dict[str, Any]:
        """
        Método de compatibilidad con API anterior.
        Mantiene la firma original: obtener_tareas()
        """
        # Obtener tareas del día y pendientes
        del_dia = await self.tareas_del_dia()
        pendientes = await self.tareas_pendientes()
        
        return {
            "tareas_del_dia": del_dia.get("tareas", []),
            "tareas_pendientes": pendientes.get("tareas", [])
        }
