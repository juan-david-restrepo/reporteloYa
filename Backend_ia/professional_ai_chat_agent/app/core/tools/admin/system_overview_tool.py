"""
Tool de Vista General del Sistema para Administrador.
Proporciona una visión completa del estado del sistema
con métricas, estadísticas y análisis automático.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy import text
from datetime import datetime, timedelta
import json

from app.core.tools.admin.base.base_query_tool import BaseQueryTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class SystemOverviewTool:
    """
    Tool profesional para obtener vista general del sistema.
    
    Funcionalidades:
    - Estadísticas de reportes (hoy, por estado)
    - Estadísticas de agentes (total, por estado)
    - Estadísticas de tareas (pendientes, por estado)
    - Métricas del sistema
    - Análisis automático con IA
    - Filtros dinámicos
    """
    
    def __init__(self, db, llm_service=None):
        """
        Inicializa el tool de overview del sistema.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
            llm_service: Servicio de LLM para análisis
        """
        self.db = db
        self.base = BaseQueryTool(db)
        self.nlp = NLPParser()
        self.llm = llm_service
    
    # ======================================================
    # MÉTODO PRINCIPAL
    # ======================================================
    
    async def system_overview(
        self,
        mensaje: str = "",
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        incluir_analisis: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene una visión completa del estado del sistema.
        
        Args:
            mensaje: Mensaje original para NLP
            fecha_inicio: Fecha inicial para estadísticas
            fecha_fin: Fecha final para estadísticas
            incluir_analisis: Si True, genera análisis con IA
        
        Returns:
            Dict con estadísticas completas del sistema
        """
        try:
            # Extraer parámetros via NLP
            if mensaje:
                fecha_params = self.nlp.extract_fecha(mensaje)
                if fecha_params:
                    fecha_inicio = fecha_inicio or fecha_params.get('fecha_inicio')
                    fecha_fin = fecha_fin or fecha_params.get('fecha_fin')
            
            # Construir filtros
            filters = {}
            if fecha_inicio:
                filters['fecha_inicio'] = fecha_inicio
            if fecha_fin:
                filters['fecha_fin'] = fecha_fin
            
            # Obtener estadísticas de cada componente
            reportes_stats = await self._obtener_estadisticas_reportes(filters)
            agentes_stats = await self._obtener_estadisticas_agentes()
            tareas_stats = await self._obtener_estadisticas_tareas()
            metricas_sistema = await self._obtener_metricas_sistema()
            
            # Compilar datos
            datos = {
                "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "reportes": reportes_stats,
                "agentes": agentes_stats,
                "tareas": tareas_stats,
                "metricas_sistema": metricas_sistema
            }
            
            # Generar análisis con IA si está disponible
            analisis = None
            if incluir_analisis and self.llm:
                analisis = await self._generar_resumen_llm(datos)
            
            # Preparar respuesta
            response = {
                "success": True,
                "status": "success",
                "system_data": datos,
                "timestamp": datetime.now().isoformat()
            }
            
            if analisis:
                response["analysis"] = analisis
            
            return response
            
        except Exception as e:
            logger.exception(f"Error en system_overview: {str(e)}")
            return {
                "status": "error",
                "message": f"Error al obtener el resumen del sistema: {str(e)}",
                "success": False,
                "timestamp": datetime.now().isoformat()
            }
    
    # ======================================================
    # CONSULTAS DE ESTADÍSTICAS
    # ======================================================
    
    async def _obtener_estadisticas_reportes(
        self,
        filters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Obtiene estadísticas de reportes.
        """
        try:
            filters = filters or {}
            where_clause, params = self._build_fecha_where(filters)
            
            # Total reportes
            total_query = f"SELECT COUNT(*) as total FROM reporte r{where_clause}"
            success, total, _ = self.base.execute_scalar(total_query, params)
            total = total if success else 0
            
            # Reportes hoy
            hoy_query = f"""
                SELECT COUNT(*) as total 
                FROM reporte r 
                WHERE DATE(r.created_at) = CURDATE()
            """
            success_hoy, hoy, _ = self.base.execute_scalar(hoy_query, {})
            hoy = hoy if success_hoy else 0
            
            # Reportes por estado
            por_estado_query = """
                SELECT 
                    estado,
                    COUNT(*) as total
                FROM reporte
                GROUP BY estado
            """
            result_estado = self.base.execute_query_with_count(por_estado_query)
            success_estado = result_estado.get("success", False)
            por_estado = result_estado.get("data", []) if success_estado else []
            
            # Reportes por prioridad
            por_prioridad_query = """
                SELECT 
                    prioridad,
                    COUNT(*) as total
                FROM reporte
                WHERE prioridad IS NOT NULL
                GROUP BY prioridad
            """
            result_prioridad = self.base.execute_query_with_count(por_prioridad_query)
            success_prioridad = result_prioridad.get("success", False)
            por_prioridad = result_prioridad.get("data", []) if success_prioridad else []
            
            # Reportes esta semana
            semana_query = """
                SELECT COUNT(*) as total 
                FROM reporte 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            """
            success_semana, semana, _ = self.base.execute_scalar(semana_query, {})
            semana = semana if success_semana else 0
            
            return {
                "total": total,
                "hoy": hoy,
                "esta_semana": semana,
                "por_estado": por_estado,
                "por_prioridad": por_prioridad
            }
            
        except Exception as e:
            logger.exception(f"Error en _obtener_estadisticas_reportes: {str(e)}")
            return {"total": 0, "hoy": 0, "esta_semana": 0, "por_estado": [], "por_prioridad": []}
    
    async def _obtener_estadisticas_agentes(
        self,
        estado: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene estadísticas de agentes.
        """
        try:
            # Total agentes
            total_query = "SELECT COUNT(*) as total FROM agentes"
            success, total, _ = self.base.execute_scalar(total_query)
            total = total if success else 0
            
            # Agentes por estado
            por_estado_query = """
                SELECT 
                    estado,
                    COUNT(*) as total
                FROM agentes
                GROUP BY estado
            """
            result_estado = self.base.execute_query_with_count(por_estado_query)
            success_estado = result_estado.get("success", False)
            por_estado = result_estado.get("data", []) if success_estado else []
            
            # Calcular disponibles (dinámicamente, no hardcoded)
            disponibles = 0
            for e in por_estado:
                if e.get('estado', '').lower() in ['disponible', 'libre', 'activo']:
                    disponibles += e.get('total', 0)
            
            return {
                "total": total,
                "disponibles": disponibles,
                "por_estado": por_estado
            }
            
        except Exception as e:
            logger.exception(f"Error en _obtener_estadisticas_agentes: {str(e)}")
            return {"total": 0, "disponibles": 0, "por_estado": []}
    
    async def _obtener_estadisticas_tareas(
        self,
        estado: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene estadísticas de tareas.
        """
        try:
            # Total tareas
            total_query = "SELECT COUNT(*) as total FROM tareas"
            success, total, _ = self.base.execute_scalar(total_query)
            total = total if success else 0
            
            # Tareas por estado
            por_estado_query = """
                SELECT 
                    estado,
                    COUNT(*) as total
                FROM tareas
                GROUP BY estado
            """
            result_estado = self.base.execute_query_with_count(por_estado_query)
            success_estado = result_estado.get("success", False)
            por_estado = result_estado.get("data", []) if success_estado else []
            
            # Tareas por prioridad
            por_prioridad_query = """
                SELECT 
                    prioridad,
                    COUNT(*) as total
                FROM tareas
                WHERE prioridad IS NOT NULL
                GROUP BY prioridad
            """
            result_prioridad = self.base.execute_query_with_count(por_prioridad_query)
            success_prioridad = result_prioridad.get("success", False)
            por_prioridad = result_prioridad.get("data", []) if success_prioridad else []
            
            # Tareas de hoy
            hoy = datetime.now().strftime('%Y-%m-%d')
            hoy_query = """
                SELECT COUNT(*) as total 
                FROM tareas 
                WHERE fecha = :hoy
            """
            success_hoy, tareas_hoy, _ = self.base.execute_scalar(hoy_query, {"hoy": hoy})
            tareas_hoy = tareas_hoy if success_hoy else 0
            
            # Tareas pendientes (dinámicamente)
            pendientes = 0
            for e in por_estado:
                if e.get('estado', '').upper() in ['PENDIENTE', 'PENDIENTES']:
                    pendientes += e.get('total', 0)
            
            return {
                "total": total,
                "pendientes": pendientes,
                "hoy": tareas_hoy,
                "por_estado": por_estado,
                "por_prioridad": por_prioridad
            }
            
        except Exception as e:
            logger.exception(f"Error en _obtener_estadisticas_tareas: {str(e)}")
            return {
                "total": 0, 
                "pendientes": 0, 
                "hoy": 0, 
                "por_estado": [], 
                "por_prioridad": []
            }
    
    async def _obtener_metricas_sistema(self) -> Dict[str, Any]:
        """
        Obtiene métricas generales del sistema.
        """
        try:
            metricas = {}
            
            # Tiempo promedio de respuesta (reportes creados en las últimas 24h) - USANDO ESTADOS EN MAYÚSCULAS
            metricas_query = """
                SELECT 
                    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as tiempo_promedio
                FROM reporte
                WHERE updated_at IS NOT NULL
                    AND estado = 'FINALIZADO'
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            """
            success, tiempo_promedio, _ = self.base.execute_scalar(metricas_query)
            metricas['tiempo_promedio_resolucion_horas'] = round(tiempo_promedio, 2) if success and tiempo_promedio else 0
            
            # Tasa de resolución - USANDO ESTADOS EN MAYÚSCULAS
            total_query = "SELECT COUNT(*) as total FROM reporte"
            success, total, _ = self.base.execute_scalar(total_query)
            
            resueltos_query = """
                SELECT COUNT(*) as total 
                FROM reporte 
                WHERE estado = 'FINALIZADO'
            """
            success_r, resueltos, _ = self.base.execute_scalar(resueltos_query)
            
            if success and total and total > 0:
                metricas['tasa_resolucion_porcentual'] = round((resueltos / total) * 100, 2) if success_r else 0
            else:
                metricas['tasa_resolucion_porcentual'] = 0
            
            # Carga de trabajo por agente - USANDO ESTADOS EN MAYÚSCULAS
            carga_query = """
                SELECT 
                    COUNT(r.id_reporte) as reportes_asignados,
                    a.nombre
                FROM agentes a
                LEFT JOIN reporte r ON a.id_usuario = r.id_agente AND r.estado != 'FINALIZADO'
                GROUP BY a.id_usuario, a.nombre
                ORDER BY reportes_asignados DESC
                LIMIT 5
            """
            result_carga = self.base.execute_query_with_count(carga_query)
            success_carga = result_carga.get("success", False)
            carga = result_carga.get("data", []) if success_carga else []
            metricas['agentes_con_mas_carga'] = carga
            
            return metricas
            
        except Exception as e:
            logger.exception(f"Error en _obtener_metricas_sistema: {str(e)}")
            return {}
    
    # ======================================================
    # ANÁLISIS CON IA
    # ======================================================
    
    async def _generar_resumen_llm(self, datos: Dict[str, Any]) -> str:
        """
        Genera un análisis automático del sistema usando LLM.
        """
        if not self.llm:
            return self._generar_resumen_local(datos)
        
        try:
            prompt = f"""
Eres un analista experto del sistema de reportes de tránsito.

Datos actuales del sistema:

{json.dumps(datos, indent=2, ensure_ascii=False)}

Basándote en estos datos, genera un análisis breve (máximo 8 líneas) que incluya:

1. Estado general del sistema (funcionando bien, necesita atención, crítico)
2. Posibles problemas o cuellos de botella
3. Recomendaciones operativas prioritarias
4. Alertas si hay métricas fuera de lo normal

Sé conciso y orientado a la acción.
"""
            respuesta = await self.llm.generate_response(
                message=prompt,
                history=[],
                role="ADMIN"
            )
            
            return respuesta.strip()
            
        except Exception as e:
            logger.warning(f"LLM análisis falló: {str(e)}")
            return self._generar_resumen_local(datos)
    
    def _generar_resumen_local(self, datos: Dict[str, Any]) -> str:
        """
        Genera un análisis local cuando no hay LLM disponible.
        """
        try:
            partes = []
            
            # Estado de reportes
            reportes = datos.get('reportes', {})
            total_reportes = reportes.get('total', 0)
            hoy = reportes.get('hoy', 0)
            
            if total_reportes > 0:
                partes.append(f"📊 Reportes: {total_reportes} totales, {hoy} hoy.")
            
            # Estado de agentes
            agentes = datos.get('agentes', {})
            disponibles = agentes.get('disponibles', 0)
            total_agentes = agentes.get('total', 0)
            
            if total_agentes > 0:
                disponibilidad = round((disponibles / total_agentes) * 100, 1)
                partes.append(f"👮 Agentes: {disponibles}/{total_agentes} disponibles ({disponibilidad}%).")
            
            # Estado de tareas
            tareas = datos.get('tareas', {})
            pendientes = tareas.get('pendientes', 0)
            
            if pendientes > 0:
                partes.append(f"📋 Tareas: {pendientes} pendientes.")
            
            # Métricas
            metricas = datos.get('metricas_sistema', {})
            tasa = metricas.get('tasa_resolucion_porcentual', 0)
            
            if tasa > 0:
                partes.append(f"✅ Tasa de resolución: {tasa}%.")
            
            # Alertas
            if disponibles == 0 and total_agentes > 0:
                partes.append("⚠️ ALERTA: No hay agentes disponibles.")
            
            if pendientes > 20:
                partes.append("⚠️ ALERTA: Muchas tareas pendientes.")
            
            return " | ".join(partes) if partes else "Sistema operando normalmente."
            
        except Exception as e:
            logger.exception(f"Error en _generar_resumen_local: {str(e)}")
            return "No se pudo generar análisis."
    
    # ======================================================
    # MÉTODOS AUXILIARES
    # ======================================================
    
    def _build_fecha_where(self, filters: Dict[str, Any]) -> tuple:
        """Construye cláusula WHERE para fechas."""
        conditions = []
        params = {}
        
        if filters.get('fecha_inicio'):
            conditions.append("r.created_at >= :fecha_inicio")
            params['fecha_inicio'] = filters['fecha_inicio']
        
        if filters.get('fecha_fin'):
            conditions.append("r.created_at <= :fecha_fin")
            params['fecha_fin'] = filters['fecha_fin'] + " 23:59:59"
        
        if conditions:
            return " WHERE " + " AND ".join(conditions), params
        
        return "", {}
    
    # ======================================================
    # MÉTODOS DE COMPATIBILIDAD
    # ======================================================
    
    async def _reportes_hoy(self) -> int:
        """Método de compatibilidad."""
        stats = await self._obtener_estadisticas_reportes()
        return stats.get('hoy', 0)
    
    async def _reportes_por_estado(self) -> List[Dict]:
        """Método de compatibilidad."""
        stats = await self._obtener_estadisticas_reportes()
        return stats.get('por_estado', [])
    
    async def _agentes_activos(self) -> int:
        """Método de compatibilidad."""
        stats = await self._obtener_estadisticas_agentes()
        return stats.get('disponibles', 0)
    
    async def _tareas_pendientes(self) -> int:
        """Método de compatibilidad."""
        stats = await self._obtener_estadisticas_tareas()
        return stats.get('pendientes', 0)
