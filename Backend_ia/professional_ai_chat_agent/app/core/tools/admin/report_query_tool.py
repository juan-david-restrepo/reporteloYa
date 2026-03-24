"""
Tool de Consulta de Reportes para Administrador.
Permite consultar reportes con filtros dinámicos, búsquedas avanzadas,
relaciones con agentes y usuarios, y exportación de datos.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy import text
from datetime import datetime, timedelta

from app.core.tools.admin.base.base_query_tool import BaseQueryTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class ReportQueryTool:
    """
    Tool profesional para consultar reportes del sistema.
    
    Funcionalidades:
    - Consulta de todos los reportes o filtrados
    - Filtros por: estado, tipo_infraccion, fecha, placa, dirección
    - JOINs con agente y usuario
    - Búsqueda por texto en descripción
    - Paginación y ordenamiento
    - Exportación para PDF
    """
    
    ALLOWED_FILTERS = [
        'estado', 'tipo_infraccion', 'placa', 'direccion',
        'fecha_incidente', 'prioridad', 'id_agente', 'id_usuario'
    ]
    ALLOWED_SORTS = [
        'id_reporte', 'fecha_incidente', 'created_at', 
        'estado', 'prioridad', 'tipo_infraccion'
    ]
    
    def __init__(self, db):
        """
        Inicializa el tool de consulta de reportes.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
        """
        self.db = db
        self.base = BaseQueryTool(db)
        self.nlp = NLPParser()
    
    # ======================================================
    # MÉTODOS DE CONSULTA PRINCIPALES
    # ======================================================
    
    async def obtener_reportes(
        self,
        mensaje: str = "",
        estado: Optional[str] = None,
        tipo_infraccion: Optional[str] = None,
        placa: Optional[str] = None,
        direccion: Optional[str] = None,
        prioridad: Optional[str] = None,
        fecha: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_agente: Optional[int] = None,
        nombre_agente: Optional[str] = None,
        id_usuario: Optional[int] = None,
        buscar: Optional[str] = None,
        incluir_agente: bool = True,
        incluir_usuario: bool = False,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Obtiene lista de reportes con filtros dinámicos.
        
        Args:
            mensaje: Mensaje original del usuario (para NLP)
            estado: Filtrar por estado
            tipo_infraccion: Filtrar por tipo de infracción
            placa: Filtrar por placa
            direccion: Filtrar por dirección (búsqueda)
            prioridad: Filtrar por prioridad
            fecha: Filtrar por fecha específica
            fecha_inicio: Fecha inicial del rango
            fecha_fin: Fecha final del rango
            id_agente: Filtrar por ID de agente
            nombre_agente: Filtrar por nombre de agente
            id_usuario: Filtrar por ID de usuario
            buscar: Búsqueda general en descripción
            incluir_agente: Incluir datos del agente
            incluir_usuario: Incluir datos del usuario
            page: Número de página
            page_size: Tamaño de página
            sort_by: Campo para ordenar
            order: Orden (asc/desc)
        
        Returns:
            Dict con reportes y metadatos
        """
        try:
            # Si hay mensaje, extraer parámetros via NLP
            if mensaje:
                params = self.nlp.extract_params(mensaje)
                estado = estado or params.get('estado')
                prioridad = prioridad or params.get('prioridad')
                placa = placa or params.get('placa')
                tipo_infraccion = tipo_infraccion or params.get('tipo_infraccion')
                
                # Extraer fecha del mensaje
                fecha_params = self.nlp.extract_fecha(mensaje)
                if fecha_params:
                    fecha_inicio = fecha_inicio or fecha_params.get('fecha_inicio')
                    fecha_fin = fecha_fin or fecha_params.get('fecha_fin')
                
                # Detectar estado de reporte
                if not estado and self.nlp.detect_estado(mensaje, "reporte"):
                    estado = self.nlp.detect_estado(mensaje, "reporte")
                
                # Detectar prioridad
                if not prioridad and self.nlp.detect_prioridad(mensaje):
                    prioridad = self.nlp.detect_prioridad(mensaje)
                
                # Extraer placa
                if not placa:
                    placa = self.nlp.extract_placa(mensaje)
                
                # Buscar términos de búsqueda
                if not buscar:
                    buscar = params.get('busqueda')
            
            # Validar y normalizar parámetros
            filters = self._build_filters(
                estado=estado,
                tipo_infraccion=tipo_infraccion,
                placa=placa,
                direccion=direccion,
                prioridad=prioridad,
                fecha=fecha,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                id_agente=id_agente,
                nombre_agente=nombre_agente,
                id_usuario=id_usuario,
                buscar=buscar
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
                sort_by = "created_at"
            if order.lower() not in ["asc", "desc"]:
                order = "desc"
            
            # Construir query
            query, count_query, params = self._build_query(
                filters=filters,
                incluir_agente=incluir_agente,
                incluir_usuario=incluir_usuario,
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
                logger.error(f"Error consultando reportes: {error}")
                return self.base.format_error(f"Error consultando reportes: {error}", "DB_ERROR")
            
            # Formatear datos
            data = self.base.format_rows(data)
            
            # Obtener conteo total
            total = len(data)
            if total > 0:
                count_success, total_count, _ = self.base.execute_scalar(count_query, params)
                if count_success:
                    total = total_count
            
            # Preparar respuesta
            response = {
                "success": True,
                "total": total,
                "reportes": data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
                },
                "filtros_aplicados": {k: v for k, v in filters.items() if v},
                "timestamp": datetime.now().isoformat()
            }
            
            # Agregar metadatos de la consulta
            if filters.get('fecha_inicio') or filters.get('fecha_fin'):
                response["metadata"] = {
                    "rango_fechas": {
                        "inicio": filters.get('fecha_inicio'),
                        "fin": filters.get('fecha_fin')
                    }
                }
            
            return response
            
        except Exception as e:
            logger.exception(f"Error inesperado en obtener_reportes: {str(e)}")
            return self.base.format_error(f"Error inesperado: {str(e)}", "UNEXPECTED_ERROR")
    
    async def reportes_del_dia(self) -> Dict[str, Any]:
        """
        Obtiene los reportes del día actual.
        """
        hoy = datetime.now().strftime('%Y-%m-%d')
        return await self.obtener_reportes(fecha=hoy)
    
    async def reportes_por_estado(
        self,
        estado: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Obtiene reportes filtrados por estado.
        
        Args:
            estado: Estado a filtrar
            page: Página
            page_size: Tamaño de página
        """
        return await self.obtener_reportes(
            estado=estado,
            page=page,
            page_size=page_size
        )
    
    async def reportes_por_fecha(
        self,
        fecha: str,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene reportes para una fecha específica.
        
        Args:
            fecha: Fecha en formato YYYY-MM-DD
            incluir_agente: Incluir datos del agente
        """
        return await self.obtener_reportes(
            fecha=fecha,
            incluir_agente=incluir_agente
        )
    
    async def reportes_por_rango_fechas(
        self,
        fecha_inicio: str,
        fecha_fin: str,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene reportes en un rango de fechas.
        
        Args:
            fecha_inicio: Fecha inicial
            fecha_fin: Fecha final
            incluir_agente: Incluir datos del agente
        """
        return await self.obtener_reportes(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            incluir_agente=incluir_agente
        )
    
    async def reportes_por_placa(
        self,
        placa: str,
        incluir_agente: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene reportes asociados a una placa específica.
        
        Args:
            placa: Placa del vehículo
            incluir_agente: Incluir datos del agente
        """
        return await self.obtener_reportes(
            placa=placa,
            incluir_agente=incluir_agente
        )
    
    async def reportes_por_agente(
        self,
        agente_id: int,
        incluir_agente: bool = False
    ) -> Dict[str, Any]:
        """
        Obtiene reportes de un agente específico.
        
        Args:
            agente_id: ID del agente
            incluir_agente: Incluir datos del agente
        """
        return await self.obtener_reportes(
            id_agente=agente_id,
            incluir_agente=incluir_agente
        )
    
    async def buscar_reportes(
        self,
        termino: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Busca reportes por término en descripción o dirección.
        
        Args:
            termino: Término de búsqueda
            page: Página
            page_size: Tamaño de página
        """
        return await self.obtener_reportes(
            buscar=termino,
            page=page,
            page_size=page_size
        )
    
    async def reporte_por_id(
        self,
        reporte_id: int,
        incluir_agente: bool = True,
        incluir_usuario: bool = True,
        incluir_evidencias: bool = False
    ) -> Dict[str, Any]:
        """
        Obtiene un reporte específico por ID.
        
        Args:
            reporte_id: ID del reporte
            incluir_agente: Incluir datos del agente
            incluir_usuario: Incluir datos del usuario
            incluir_evidencias: Incluir evidencias
        """
        try:
            query = self._build_detalle_query(
                incluir_agente=incluir_agente,
                incluir_usuario=incluir_usuario,
                incluir_evidencias=incluir_evidencias
            )
            
            query += " WHERE r.id_reporte = :reporte_id"
            
            result = self.base.execute_query_with_count(query, {"reporte_id": reporte_id})
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success or not data:
                return self.base.format_empty("reporte")
            
            reporte = self.base.format_rows(data)[0]
            
            return {
                "success": True,
                "total": 1,
                "reporte": reporte,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error obteniendo reporte por ID: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    # ======================================================
    # CONSULTAS DE ESTADÍSTICAS RÁPIDAS
    # ======================================================
    
    async def conteo_por_estado(self) -> Dict[str, Any]:
        """
        Retorna conteo de reportes por estado.
        """
        try:
            query = text("""
                SELECT 
                    estado,
                    COUNT(*) as total
                FROM reporte
                GROUP BY estado
                ORDER BY total DESC
            """)
            
            result = self.base.execute_query_with_count(query)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success:
                return self.base.format_error(error, "DB_ERROR")
            
            return {
                "success": True,
                "por_estado": data,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en conteo_por_estado: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    async def conteo_por_tipo(self) -> Dict[str, Any]:
        """
        Retorna conteo de reportes por tipo de infracción.
        """
        try:
            query = text("""
                SELECT 
                    tipo_infraccion,
                    COUNT(*) as total
                FROM reporte
                WHERE tipo_infraccion IS NOT NULL
                GROUP BY tipo_infraccion
                ORDER BY total DESC
            """)
            
            result = self.base.execute_query_with_count(query)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success:
                return self.base.format_error(error, "DB_ERROR")
            
            return {
                "success": True,
                "por_tipo": data,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en conteo_por_tipo: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    async def reportes_recientes(
        self,
        dias: int = 7,
        limite: int = 10
    ) -> Dict[str, Any]:
        """
        Obtiene los reportes más recientes.
        
        Args:
            dias: Días hacia atrás
            limite: Número de reportes
        """
        try:
            query = text("""
                SELECT 
                    r.id_reporte,
                    r.tipo_infraccion,
                    r.descripcion,
                    r.direccion,
                    r.estado,
                    r.placa,
                    r.fecha_incidente,
                    r.created_at,
                    a.nombre as nombre_agente,
                    a.placa as placa_agente
                FROM reporte r
                LEFT JOIN agentes a ON r.id_agente = a.id_usuario
                WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL :dias DAY)
                ORDER BY r.created_at DESC
                LIMIT :limite
            """)
            
            result = self.base.execute_query_with_count(query, {"dias": dias, "limite": limite})
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if not success:
                return self.base.format_error(error, "DB_ERROR")
            
            data = self.base.format_rows(data)
            
            return {
                "success": True,
                "total": len(data),
                "reportes": data,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en reportes_recientes: {str(e)}")
            return self.base.format_error(str(e), "DB_ERROR")
    
    # ======================================================
    # MÉTODOS AUXILIARES
    # ======================================================
    
    def _build_filters(
        self,
        estado: Optional[str] = None,
        tipo_infraccion: Optional[str] = None,
        placa: Optional[str] = None,
        direccion: Optional[str] = None,
        prioridad: Optional[str] = None,
        fecha: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_agente: Optional[int] = None,
        nombre_agente: Optional[str] = None,
        id_usuario: Optional[int] = None,
        buscar: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Construye diccionario de filtros.
        """
        filters = {}
        
        if estado:
            filters['estado'] = estado.lower()
        if tipo_infraccion:
            filters['tipo_infraccion'] = tipo_infraccion.lower()
        if placa:
            filters['placa'] = placa.upper()
        if direccion:
            filters['direccion'] = f"%{direccion}%"
        if prioridad:
            filters['prioridad'] = prioridad.lower()
        if fecha:
            filters['fecha_incidente'] = fecha
        if fecha_inicio:
            filters['fecha_inicio'] = fecha_inicio
        if fecha_fin:
            filters['fecha_fin'] = fecha_fin
        if id_agente:
            filters['id_agente'] = id_agente
        if nombre_agente:
            filters['nombre_agente'] = f"%{nombre_agente}%"
        if id_usuario:
            filters['id_usuario'] = id_usuario
        if buscar:
            filters['buscar'] = buscar
        
        return filters
    
    def _build_query(
        self,
        filters: Dict[str, Any],
        incluir_agente: bool = False,
        incluir_usuario: bool = False,
        sort_by: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> tuple:
        """
        Construye la query SQL y sus parámetros.
        """
        # Seleccionar campos
        select_fields = [
            "r.id_reporte",
            "r.tipo_infraccion",
            "r.descripcion",
            "r.direccion",
            "r.estado",
            "r.placa",
            "r.latitud",
            "r.longitud",
            "r.fecha_incidente",
            "r.hora_incidente",
            "r.prioridad",
            "r.created_at",
            "r.updated_at"
        ]
        
        joins = []
        
        if incluir_agente or filters.get('nombre_agente'):
            joins.append("LEFT JOIN agentes a ON r.id_agente = a.id_usuario")
            select_fields.append("a.id as id_agente")
            select_fields.append("a.nombre as nombre_agente")
            select_fields.append("a.placa as placa_agente")
            select_fields.append("a.telefono as telefono_agente")
        
        if incluir_usuario:
            joins.append("LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario")
            select_fields.append("u.id as id_usuario")
            select_fields.append("u.email as email_usuario")
        
        # Query principal
        query = f"SELECT {', '.join(select_fields)} FROM reporte r"
        
        if joins:
            query += " " + " ".join(joins)
        
        # Count query
        count_query = "SELECT COUNT(*) as total FROM reporte r"
        if joins:
            count_query += " " + " ".join(joins)
        
        # Construir condiciones WHERE
        conditions = []
        params = {}
        
        for field, value in filters.items():
            if value is None or value == "":
                continue
            
            if field == 'fecha_inicio':
                conditions.append("DATE(r.created_at) >= :fecha_inicio")
                params['fecha_inicio'] = value
            elif field == 'fecha_fin':
                conditions.append("DATE(r.created_at) <= :fecha_fin")
                params['fecha_fin'] = value
            elif field == 'buscar':
                conditions.append("(r.descripcion LIKE :buscar OR r.direccion LIKE :buscar OR r.placa LIKE :buscar)")
                params['buscar'] = f"%{value}%"
            elif field == 'nombre_agente':
                conditions.append("a.nombre LIKE :nombre_agente")
                params['nombre_agente'] = value
            elif field == 'direccion':
                conditions.append("r.direccion LIKE :direccion")
                params['direccion'] = value
            elif field in ['estado', 'tipo_infraccion', 'placa', 'prioridad', 'fecha_incidente']:
                conditions.append(f"r.{field} = :{field}")
                params[field] = value
            elif field in ['id_agente', 'id_usuario']:
                conditions.append(f"r.{field} = :{field}")
                params[field] = value
        
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            query += where_clause
            count_query += where_clause
        
        # Agregar ordenamiento
        order_val = "DESC" if order.lower() == "desc" else "ASC"
        sort_mapping = {
            'id_reporte': 'r.id_reporte',
            'fecha_incidente': 'r.fecha_incidente',
            'created_at': 'r.created_at',
            'estado': 'r.estado',
            'prioridad': 'r.prioridad',
            'tipo_infraccion': 'r.tipo_infraccion'
        }
        sort_field = sort_mapping.get(sort_by, 'r.created_at')
        
        query += f" ORDER BY {sort_field} {order_val}"
        
        # Agregar paginación
        offset = (page - 1) * page_size
        query += f" LIMIT :limit OFFSET :offset"
        params['limit'] = page_size
        params['offset'] = offset
        
        return query, count_query, params
    
    def _build_detalle_query(
        self,
        incluir_agente: bool = False,
        incluir_usuario: bool = False,
        incluir_evidencias: bool = False
    ) -> str:
        """
        Construye query para detalle de un reporte.
        """
        select_fields = [
            "r.id_reporte",
            "r.tipo_infraccion",
            "r.descripcion",
            "r.direccion",
            "r.estado",
            "r.placa",
            "r.latitud",
            "r.longitud",
            "r.fecha_incidente",
            "r.hora_incidente",
            "r.prioridad",
            "r.created_at",
            "r.updated_at"
        ]
        
        joins = []
        
        if incluir_agente:
            joins.append("LEFT JOIN agentes a ON r.id_agente = a.id_usuario")
            select_fields.extend([
                "a.id as id_agente",
                "a.nombre as nombre_agente",
                "a.placa as placa_agente",
                "a.telefono as telefono_agente"
            ])
        
        if incluir_usuario:
            joins.append("LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario")
            select_fields.extend([
                "u.id as id_usuario",
                "u.email as email_usuario"
            ])
        
        if incluir_evidencias:
            joins.append("LEFT JOIN evidencia e ON r.id_reporte = e.id_reporte")
            select_fields.append("e.url as evidencia_url")
            select_fields.append("e.tipo as evidencia_tipo")
        
        query = f"SELECT {', '.join(select_fields)} FROM reporte r"
        
        if joins:
            query += " " + " ".join(joins)
        
        return query
    
    # ======================================================
    # MÉTODOS DE COMPATIBILIDAD
    # ======================================================
    
    def reportes_del_dia_sync(self) -> list:
        """
        Método de compatibilidad sincrónico.
        """
        try:
            query = text("""
                SELECT 
                    id_reporte,
                    tipo_infraccion,
                    direccion,
                    estado,
                    fecha_incidente,
                    hora_incidente,
                    placa
                FROM reporte
                WHERE DATE(created_at) = CURDATE()
                ORDER BY created_at DESC
            """)
            result = self.db.execute(query)
            rows = result.fetchall()
            return self._format_data(rows)
        except Exception as e:
            logger.exception(f"Error en reportes_del_dia: {str(e)}")
            return []
    
    def reportes_por_estado_sync(self, estado: str) -> list:
        """
        Método de compatibilidad sincrónico.
        """
        try:
            query = text("""
                SELECT 
                    id_reporte,
                    tipo_infraccion,
                    descripcion,
                    direccion,
                    placa,
                    fecha_incidente,
                    estado
                FROM reporte
                WHERE estado = :estado
                ORDER BY created_at DESC
                LIMIT 50
            """)
            result = self.db.execute(query, {"estado": estado})
            rows = result.fetchall()
            return self._format_data(rows)
        except Exception as e:
            logger.exception(f"Error en reportes_por_estado: {str(e)}")
            return []
    
    def _format_data(self, rows):
        """Formatea filas para compatibilidad."""
        formatted = []
        for row in rows:
            r = dict(row._mapping)
            if 'fecha_incidente' in r and r['fecha_incidente']:
                r['fecha_incidente'] = r['fecha_incidente'].strftime("%Y-%m-%d")
            if 'hora_incidente' in r and r['hora_incidente']:
                if hasattr(r['hora_incidente'], 'seconds'):
                    total_seconds = r['hora_incidente'].seconds
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    r['hora_incidente'] = f"{hours:02d}:{minutes:02d}:00"
                else:
                    r['hora_incidente'] = str(r['hora_incidente'])
            formatted.append(r)
        return formatted
