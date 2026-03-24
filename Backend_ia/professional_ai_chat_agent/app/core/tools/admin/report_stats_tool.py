"""
Tool de Estadísticas de Reportes para Administrador.
Permite obtener estadísticas completas y detalladas de reportes
con filtros dinámicos, groupings y exportación de datos.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy import text
from datetime import datetime, timedelta

from app.core.tools.admin.base.base_query_tool import BaseQueryTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class ReportStatsTool:
    """
    Tool profesional para obtener estadísticas de reportes.
    
    Funcionalidades:
    - Estadísticas generales
    - Estadísticas por estado, tipo, prioridad
    - Estadísticas por fecha (días, semanas, meses)
    - Zonas con más reportes
    - Placas más reportadas
    - Tendencias y comparaciones
    - Filtros dinámicos
    """
    
    def __init__(self, db):
        """
        Inicializa el tool de estadísticas.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
        """
        self.db = db
        self.base = BaseQueryTool(db)
        self.nlp = NLPParser()
    
    # ======================================================
    # MÉTODOS PRINCIPALES DE ESTADÍSTICAS
    # ======================================================
    
    async def estadisticas_reportes(
        self,
        mensaje: str = "",
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_infraccion: Optional[str] = None,
        prioridad: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene estadísticas completas de reportes.
        
        Args:
            mensaje: Mensaje original para NLP
            fecha_inicio: Fecha inicial del rango
            fecha_fin: Fecha final del rango
            estado: Filtrar por estado
            tipo_infraccion: Filtrar por tipo
            prioridad: Filtrar por prioridad
        
        Returns:
            Dict con todas las estadísticas
        """
        try:
            # Extraer parámetros via NLP
            if mensaje:
                params = self.nlp.extract_params(mensaje)
                fecha_params = self.nlp.extract_fecha(mensaje)
                if fecha_params:
                    fecha_inicio = fecha_inicio or fecha_params.get('fecha_inicio')
                    fecha_fin = fecha_fin or fecha_params.get('fecha_fin')
                
                if not estado:
                    estado = self.nlp.detect_estado(mensaje, "reporte")
                if not prioridad:
                    prioridad = self.nlp.detect_prioridad(mensaje)
            
            # Construir filtros
            filters = self._build_filters(
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                estado=estado,
                tipo_infraccion=tipo_infraccion,
                prioridad=prioridad
            )
            
            # Obtener todas las estadísticas en paralelo
            resumen = await self.resumen_general(filters)
            por_estado = await self.estadisticas_por_estado(filters)
            por_tipo = await self.estadisticas_por_tipo(filters)
            por_prioridad = await self.estadisticas_por_prioridad(filters)
            zonas = await self.zonas_con_mas_reportes(filters)
            placas = await self.placas_mas_reportadas(filters)
            
            # Obtener estadísticas por fecha
            dias = 7
            if filters.get('fecha_inicio') and filters.get('fecha_fin'):
                f_inicio = datetime.strptime(filters['fecha_inicio'], '%Y-%m-%d')
                f_fin = datetime.strptime(filters['fecha_fin'], '%Y-%m-%d')
                dias = (f_fin - f_inicio).days
            
            por_fecha = await self.estadisticas_por_dia(dias, filters)
            
            # Calcular métricas adicionales
            metricas = self._calcular_metricas(
                resumen, por_estado, por_tipo, por_fecha
            )
            
            return {
                "success": True,
                "resumen": resumen,
                "por_estado": por_estado,
                "por_tipo": por_tipo,
                "por_prioridad": por_prioridad,
                "por_fecha": por_fecha,
                "zonas_mas_reportadas": zonas,
                "placas_mas_reportadas": placas,
                "metricas": metricas,
                "filtros_aplicados": {k: v for k, v in filters.items() if v},
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error en estadisticas_reportes: {str(e)}")
            return self.base.format_error(f"Error inesperado: {str(e)}", "UNEXPECTED_ERROR")
    
    async def resumen_general(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Obtiene resumen general de reportes.
        """
        try:
            filters = filters or {}
            
            # Total de reportes
            where_clause, params = self._build_where_clause(filters)
            
            total_query = f"SELECT COUNT(*) as total FROM reporte r{where_clause}"
            success, total, error = self.base.execute_scalar(total_query, params)
            
            if not success:
                total = 0
            
            # Reportes de hoy
            hoy_query = f"""
                SELECT COUNT(*) as total 
                FROM reporte r 
                WHERE DATE(r.created_at) = CURDATE()
                {where_clause.replace('WHERE', 'AND') if where_clause else ''}
            """
            success_hoy, total_hoy, _ = self.base.execute_scalar(
                hoy_query, params
            )
            
            if not success_hoy:
                total_hoy = 0
            
            # Reportes de la semana
            semana_query = f"""
                SELECT COUNT(*) as total 
                FROM reporte r 
                WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                {where_clause.replace('WHERE', 'AND') if where_clause else ''}
            """
            success_semana, total_semana, _ = self.base.execute_scalar(
                semana_query, params
            )
            
            if not success_semana:
                total_semana = 0
            
            # Reportes del mes
            mes_query = f"""
                SELECT COUNT(*) as total 
                FROM reporte r 
                WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                {where_clause.replace('WHERE', 'AND') if where_clause else ''}
            """
            success_mes, total_mes, _ = self.base.execute_scalar(
                mes_query, params
            )
            
            if not success_mes:
                total_mes = 0
            
            return {
                "total": total,
                "hoy": total_hoy,
                "esta_semana": total_semana,
                "este_mes": total_mes
            }
            
        except Exception as e:
            logger.exception(f"Error en resumen_general: {str(e)}")
            return {"total": 0, "hoy": 0, "esta_semana": 0, "este_mes": 0}
    
    async def estadisticas_por_estado(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene estadísticas por estado.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    r.estado,
                    COUNT(*) as total,
                    ROUND(COUNT(*) * 100.0 / (
                        SELECT COUNT(*) FROM reporte r2
                        {where_clause.replace('WHERE', 'WHERE') if where_clause else ''}
                    ), 2) as porcentaje
                FROM reporte r
                {where_clause}
                GROUP BY r.estado
                ORDER BY total DESC
            """
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return data
            return []
            
        except Exception as e:
            logger.exception(f"Error en estadisticas_por_estado: {str(e)}")
            return []
    
    async def estadisticas_por_tipo(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene estadísticas por tipo de infracción.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    r.tipo_infraccion as tipo,
                    COUNT(*) as total,
                    ROUND(COUNT(*) * 100.0 / (
                        SELECT COUNT(*) FROM reporte r2
                        {where_clause.replace('WHERE', 'WHERE') if where_clause else ''}
                    ), 2) as porcentaje
                FROM reporte r
                {where_clause}
                GROUP BY r.tipo_infraccion
                ORDER BY total DESC
                LIMIT 20
            """
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return data
            return []
            
        except Exception as e:
            logger.exception(f"Error en estadisticas_por_tipo: {str(e)}")
            return []
    
    async def estadisticas_por_prioridad(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene estadísticas por prioridad.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    r.prioridad,
                    COUNT(*) as total,
                    ROUND(COUNT(*) * 100.0 / (
                        SELECT COUNT(*) FROM reporte r2
                        {where_clause.replace('WHERE', 'WHERE') if where_clause else ''}
                    ), 2) as porcentaje
                FROM reporte r
                {where_clause}
                GROUP BY r.prioridad
                ORDER BY 
                    CASE r.prioridad
                        WHEN 'urgente' THEN 1
                        WHEN 'alta' THEN 2
                        WHEN 'media' THEN 3
                        WHEN 'baja' THEN 4
                        ELSE 5
                    END
            """
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return data
            return []
            
        except Exception as e:
            logger.exception(f"Error en estadisticas_por_prioridad: {str(e)}")
            return []
    
    async def estadisticas_por_dia(
        self,
        dias: int = 7,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene estadísticas por día.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            # Agregar condición de fecha si no existe
            if 'fecha_inicio' not in filters and 'fecha_fin' not in filters:
                fecha_condition = "r.created_at >= DATE_SUB(CURDATE(), INTERVAL :dias DAY)"
                if where_clause:
                    where_clause += " AND " + fecha_condition
                else:
                    where_clause = " WHERE " + fecha_condition
                params['dias'] = dias
            
            query = f"""
                SELECT 
                    DATE(r.created_at) as fecha,
                    COUNT(*) as total,
                    COUNT(CASE WHEN r.estado = 'PENDIENTE' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN r.estado = 'EN_PROCESO' THEN 1 END) as en_proceso,
                    COUNT(CASE WHEN r.estado = 'FINALIZADO' THEN 1 END) as resueltos
                FROM reporte r
                {where_clause}
                GROUP BY DATE(r.created_at)
                ORDER BY fecha DESC
            """
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return self.base.format_rows(data)
            return []
            
        except Exception as e:
            logger.exception(f"Error en estadisticas_por_dia: {str(e)}")
            return []
    
    async def zonas_con_mas_reportes(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limite: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Obtiene las zonas con más reportes.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    r.direccion as zona,
                    COUNT(*) as total,
                    COUNT(CASE WHEN r.estado = 'PENDIENTE' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN r.estado = 'FINALIZADO' THEN 1 END) as resueltos
                FROM reporte r
                {where_clause}
                GROUP BY r.direccion
                ORDER BY total DESC
                LIMIT :limite
            """
            
            params['limite'] = limite
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return data
            return []
            
        except Exception as e:
            logger.exception(f"Error en zonas_con_mas_reportes: {str(e)}")
            return []
    
    async def placas_mas_reportadas(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limite: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Obtiene las placas más reportadas.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    r.placa,
                    COUNT(*) as total,
                    COUNT(DISTINCT r.direccion) as ubicaciones_diferentes,
                    r.tipo_infraccion as tipo_mas_comun
                FROM reporte r
                {where_clause}
                    AND r.placa IS NOT NULL
                    AND r.placa != ''
                GROUP BY r.placa, r.tipo_infraccion
                ORDER BY total DESC
                LIMIT :limite
            """
            
            params['limite'] = limite
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success:
                return data
            return []
            
        except Exception as e:
            logger.exception(f"Error en placas_mas_reportadas: {str(e)}")
            return []
    
    async def comparacion_periodos(
        self,
        periodo_actual_dias: int = 30,
        periodo_anterior_dias: int = 30
    ) -> Dict[str, Any]:
        """
        Compara el periodo actual con el anterior.
        """
        try:
            # Periodo actual
            actual_query = text("""
                SELECT COUNT(*) as total FROM reporte 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :dias DAY)
            """)
            success_actual, total_actual, _ = self.base.execute_scalar(
                actual_query, {"dias": periodo_actual_dias}
            )
            
            # Periodo anterior
            anterior_query = text("""
                SELECT COUNT(*) as total FROM reporte 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :dias_total DAY)
                AND created_at < DATE_SUB(CURDATE(), INTERVAL :dias_anterior DAY)
            """)
            success_anterior, total_anterior, _ = self.base.execute_scalar(
                anterior_query, {
                    "dias_total": periodo_anterior_dias + periodo_actual_dias,
                    "dias_anterior": periodo_actual_dias
                }
            )
            
            # Calcular cambio
            cambio = 0
            if total_anterior > 0:
                cambio = round(((total_actual - total_anterior) / total_anterior) * 100, 2)
            
            return {
                "periodo_actual": {
                    "dias": periodo_actual_dias,
                    "total": total_actual
                },
                "periodo_anterior": {
                    "dias": periodo_anterior_dias,
                    "total": total_anterior
                },
                "cambio_porcentual": cambio,
                "tendencia": "subio" if cambio > 0 else "bajo" if cambio < 0 else "estable"
            }
            
        except Exception as e:
            logger.exception(f"Error en comparacion_periodos: {str(e)}")
            return {"error": str(e)}
    
    async def metricas_tiempo_resolucion(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calcula métricas de tiempo de resolución.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_where_clause(filters)
            
            query = f"""
                SELECT 
                    AVG(TIMESTAMPDIFF(HOUR, r.created_at, r.updated_at)) as tiempo_promedio_horas,
                    MIN(TIMESTAMPDIFF(HOUR, r.created_at, r.updated_at)) as tiempo_minimo_horas,
                    MAX(TIMESTAMPDIFF(HOUR, r.created_at, r.updated_at)) as tiempo_maximo_horas,
                    COUNT(*) as total_resueltos
                FROM reporte r
                {where_clause}
                    AND r.updated_at IS NOT NULL
                    AND r.estado = 'FINALIZADO'
            """
            
            result = self.base.execute_query_with_count(query, params)
            success = result.get("success", False)
            data = result.get("data", [])
            error = result.get("error")
            
            if success and data:
                return data[0]
            return {"tiempo_promedio_horas": 0, "tiempo_minimo_horas": 0, "tiempo_maximo_horas": 0}
            
        except Exception as e:
            logger.exception(f"Error en metricas_tiempo_resolucion: {str(e)}")
            return {"error": str(e)}
    
    # ======================================================
    # MÉTODOS AUXILIARES
    # ======================================================
    
    def _build_filters(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_infraccion: Optional[str] = None,
        prioridad: Optional[str] = None
    ) -> Dict[str, Any]:
        """Construye filtros."""
        filters = {}
        
        if fecha_inicio:
            filters['fecha_inicio'] = fecha_inicio
        if fecha_fin:
            filters['fecha_fin'] = fecha_fin
        if estado:
            filters['estado'] = estado.lower()
        if tipo_infraccion:
            filters['tipo_infraccion'] = tipo_infraccion.lower()
        if prioridad:
            filters['prioridad'] = prioridad.lower()
        
        return filters
    
    def _build_where_clause(
        self,
        filters: Dict[str, Any]
    ) -> tuple:
        """Construye cláusula WHERE."""
        conditions = []
        params = {}
        
        if filters.get('fecha_inicio'):
            conditions.append("r.created_at >= :fecha_inicio")
            params['fecha_inicio'] = filters['fecha_inicio']
        
        if filters.get('fecha_fin'):
            conditions.append("r.created_at <= :fecha_fin")
            params['fecha_fin'] = filters['fecha_fin'] + " 23:59:59"
        
        if filters.get('estado'):
            conditions.append("r.estado = :estado")
            params['estado'] = filters['estado']
        
        if filters.get('tipo_infraccion'):
            conditions.append("r.tipo_infraccion = :tipo_infraccion")
            params['tipo_infraccion'] = filters['tipo_infraccion']
        
        if filters.get('prioridad'):
            conditions.append("r.prioridad = :prioridad")
            params['prioridad'] = filters['prioridad']
        
        if conditions:
            return " WHERE " + " AND ".join(conditions), params
        
        return "", {}
    
    def _calcular_metricas(
        self,
        resumen: Dict,
        por_estado: List,
        por_tipo: List,
        por_fecha: List
    ) -> Dict[str, Any]:
        """Calcula métricas derivadas."""
        try:
            # Calcular tasa de resolución - USANDO ESTADOS EN MAYÚSCULAS
            total = resumen.get('total', 0)
            resueltos = sum(e.get('total', 0) for e in por_estado if e.get('estado') == 'FINALIZADO')
            
            tasa_resolucion = 0
            if total > 0:
                tasa_resolucion = round((resueltos / total) * 100, 2)
            
            # Calcular promedio diario
            promedio_diario = 0
            if por_fecha:
                total_dias = len(por_fecha)
                if total_dias > 0:
                    promedio_diario = round(sum(d.get('total', 0) for d in por_fecha) / total_dias, 2)
            
            # Tipo más común
            tipo_mas_comun = por_tipo[0].get('tipo') if por_tipo else None
            
            return {
                "tasa_resolucion_porcentual": tasa_resolucion,
                "promedio_diario": promedio_diario,
                "tipo_mas_comun": tipo_mas_comun,
                "dias_analizados": len(por_fecha)
            }
            
        except Exception as e:
            logger.exception(f"Error en _calcular_metricas: {str(e)}")
            return {}
    
    # ======================================================
    # MÉTODOS DE COMPATIBILIDAD
    # ======================================================
    
    async def resumen_hoy(self) -> Dict[str, Any]:
        """Método de compatibilidad."""
        return await self.resumen_general()
    
    async def reportes_por_estado(self) -> List[Dict[str, Any]]:
        """Método de compatibilidad."""
        return await self.estadisticas_por_estado()
    
    async def reportes_por_infraccion(self) -> List[Dict[str, Any]]:
        """Método de compatibilidad."""
        return await self.estadisticas_por_tipo()
    
    async def reportes_por_dia(self, dias: int = 7) -> List[Dict[str, Any]]:
        """Método de compatibilidad."""
        return await self.estadisticas_por_dia(dias)
    
    async def get_zonas_con_mas_reportes(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limite: int = 10
    ) -> List[Dict[str, Any]]:
        """Método de compatibilidad."""
        return await self.zonas_con_mas_reportes(filters, limite)
    
    async def get_placas_mas_reportadas(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limite: int = 10
    ) -> List[Dict[str, Any]]:
        """Método de compatibilidad."""
        return await self.placas_mas_reportadas(filters, limite)
