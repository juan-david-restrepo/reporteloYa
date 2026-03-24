"""
Tool de Generación de Reportes PDF para Administrador.
Permite generar reportes PDF con estadísticas, filtros avanzados
y exportación estructurada de datos.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from app.core.tools.admin.report_stats_tool import ReportStatsTool
from app.core.tools.admin.PDFGenerator_tool import PDFGeneratorTool
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class ReportPDFTool:
    """
    Tool profesional para generar reportes PDF del sistema.
    
    Funcionalidades:
    - Generación de estadísticas en PDF
    - Filtros dinámicos para los datos
    - Múltiples tipos de reportes
    - Soporte para exportación completa
    """
    
    def __init__(self, db, llm_service=None):
        """
        Inicializa el tool de generación de PDFs.
        
        Args:
            db: Sesión de base de datos SQLAlchemy
            llm_service: Servicio de LLM para mejorar texto
        """
        self.db = db
        self.llm = llm_service
        self.stats_tool = ReportStatsTool(db)
        self.pdf_tool = PDFGeneratorTool(llm_service) if llm_service else None
        self.nlp = NLPParser()
    
    async def generar_reporte_estadisticas(
        self,
        mensaje: str = "",
        titulo: str = "Reporte de Estadísticas del Sistema",
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        tipo: str = "general"
    ) -> Dict[str, Any]:
        """
        Genera un PDF con estadísticas del sistema.
        
        Args:
            mensaje: Mensaje original para NLP
            titulo: Título del reporte
            fecha_inicio: Fecha inicial para estadísticas
            fecha_fin: Fecha final para estadísticas
            tipo: Tipo de reporte (general, reportes, agentes, tareas)
        
        Returns:
            Dict con información del PDF generado
        """
        try:
            # Extraer parámetros via NLP
            if mensaje:
                params = self.nlp.extract_params(mensaje)
                fecha_params = self.nlp.extract_fecha(mensaje)
                if fecha_params:
                    fecha_inicio = fecha_inicio or fecha_params.get('fecha_inicio')
                    fecha_fin = fecha_fin or fecha_params.get('fecha_fin')
            
            # Obtener estadísticas según el tipo
            if tipo == "reportes":
                stats = await self.stats_tool.estadisticas_reportes(
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin
                )
                table_data = self._preparar_tabla_reportes(stats)
                user_text = self._generar_texto_reportes(stats)
                
            elif tipo == "agentes":
                from app.core.tools.admin.agent_query_tool import AgentQueryTool
                agent_tool = AgentQueryTool(self.db)
                stats = await agent_tool.conteo_agentes()
                table_data = self._preparar_tabla_agentes(stats)
                user_text = self._generar_texto_agentes(stats)
                
            elif tipo == "tareas":
                from app.core.tools.admin.task_query_tool import TaskQueryTool
                task_tool = TaskQueryTool(self.db)
                stats = await task_tool.conteo_tareas()
                table_data = self._preparar_tabla_tareas(stats)
                user_text = self._generar_texto_tareas(stats)
                
            else:  # general
                stats = await self.stats_tool.estadisticas_reportes(
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin
                )
                table_data = self._preparar_tabla_general(stats)
                user_text = self._generar_texto_general(stats)
            
            if not stats.get('success', False):
                return {
                    "status": "empty",
                    "message": "No hay datos disponibles para generar el reporte."
                }
            
            # Generar PDF
            if self.pdf_tool:
                pdf_result = await self.pdf_tool.generate_pdf(
                    title=titulo,
                    user_text=user_text,
                    table_data=table_data
                )
                
                return {
                    "status": "success",
                    "file": pdf_result.get("file"),
                    "tipo": tipo,
                    "datos_incluidos": {
                        "fecha_inicio": fecha_inicio,
                        "fecha_fin": fecha_fin
                    },
                    "timestamp": datetime.now().isoformat()
                }
            else:
                # Si no hay servicio de PDF, retornar datos para mostrar
                return {
                    "status": "success",
                    "data": stats,
                    "table_data": table_data,
                    "tipo": tipo,
                    "message": "PDF no disponible, pero los datos están listos.",
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.exception(f"Error generando PDF de estadísticas: {str(e)}")
            return {
                "status": "error",
                "message": f"No se pudo generar el reporte: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    async def generar_reporte_filtrado(
        self,
        filtros: Dict[str, Any],
        titulo: str = "Reporte Personalizado"
    ) -> Dict[str, Any]:
        """
        Genera un PDF con filtros específicos.
        
        Args:
            filtros: Diccionario de filtros
            titulo: Título del reporte
        
        Returns:
            Dict con información del PDF
        """
        try:
            from app.core.tools.admin.report_query_tool import ReportQueryTool
            report_tool = ReportQueryTool(self.db)
            
            reportes = await report_tool.obtener_reportes(
                estado=filtros.get('estado'),
                tipo_infraccion=filtros.get('tipo'),
                fecha_inicio=filtros.get('fecha_inicio'),
                fecha_fin=filtros.get('fecha_fin'),
                prioridad=filtros.get('prioridad'),
                page=1,
                page_size=1000
            )
            
            if not reportes.get('success') or reportes.get('total', 0) == 0:
                return {
                    "status": "empty",
                    "message": "No hay datos con los filtros especificados."
                }
            
            # Preparar tabla
            table_data = []
            for r in reportes.get('reportes', []):
                table_data.append({
                    "ID": r.get('id_reporte', ''),
                    "Tipo": r.get('tipo_infraccion', ''),
                    "Estado": r.get('estado', ''),
                    "Fecha": str(r.get('fecha_incidente', '')),
                    "Placa": r.get('placa', ''),
                    "Dirección": r.get('direccion', '')[:30]
                })
            
            user_text = f"Reporte generado con filtros: {filtros}"
            
            if self.pdf_tool:
                pdf_result = await self.pdf_tool.generate_pdf(
                    title=titulo,
                    user_text=user_text,
                    table_data=table_data
                )
                
                return {
                    "status": "success",
                    "file": pdf_result.get("file"),
                    "total_registros": reportes.get('total'),
                    "filtros": filtros,
                    "timestamp": datetime.now().isoformat()
                }
            
            return {
                "status": "success",
                "data": reportes,
                "table_data": table_data,
                "message": "PDF no disponible.",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Error generando PDF filtrado: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ======================================================
    # MÉTODOS AUXILIARES DE PREPARACIÓN
    # ======================================================
    
    def _preparar_tabla_reportes(self, stats: Dict) -> list:
        """Prepara tabla de estadísticas de reportes."""
        table = []
        
        por_estado = stats.get('por_estado', [])
        for item in por_estado:
            table.append({
                "Categoría": "Estado",
                "Valor": item.get('estado', '').upper(),
                "Cantidad": item.get('total', 0)
            })
        
        por_tipo = stats.get('por_tipo', [])[:10]
        for item in por_tipo:
            table.append({
                "Categoría": "Tipo",
                "Valor": item.get('tipo', ''),
                "Cantidad": item.get('total', 0)
            })
        
        return table
    
    def _preparar_tabla_agentes(self, stats: Dict) -> list:
        """Prepara tabla de estadísticas de agentes."""
        table = []
        
        por_estado = stats.get('por_estado', [])
        for item in por_estado:
            table.append({
                "Estado": item.get('estado', ''),
                "Cantidad": item.get('total', 0)
            })
        
        return table
    
    def _preparar_tabla_tareas(self, stats: Dict) -> list:
        """Prepara tabla de estadísticas de tareas."""
        table = []
        
        por_estado = stats.get('por_estado', [])
        for item in por_estado:
            table.append({
                "Estado": item.get('estado', ''),
                "Cantidad": item.get('total', 0)
            })
        
        return table
    
    def _preparar_tabla_general(self, stats: Dict) -> list:
        """Prepara tabla de estadísticas generales."""
        table = []
        
        resumen = stats.get('resumen', {})
        table.append({"Métrica": "Total Reportes", "Valor": resumen.get('total', 0)})
        table.append({"Métrica": "Reportes Hoy", "Valor": resumen.get('hoy', 0)})
        table.append({"Métrica": "Esta Semana", "Valor": resumen.get('esta_semana', 0)})
        
        metricas = stats.get('metricas', {})
        table.append({"Métrica": "Tasa Resolución (%)", "Valor": metricas.get('tasa_resolucion_porcentual', 0)})
        
        return table
    
    def _generar_texto_reportes(self, stats: Dict) -> str:
        """Genera texto descriptivo para reportes."""
        resumen = stats.get('resumen', {})
        
        texto = f"""
Este documento presenta las estadísticas actuales del sistema de reportes de tránsito.

Resumen:
- Total de reportes: {resumen.get('total', 0)}
- Reportes de hoy: {resumen.get('hoy', 0)}
- Reportes de esta semana: {resumen.get('esta_semana', 0)}

Las tablas muestran el desglose por estado y tipo de infracción.
"""
        return texto
    
    def _generar_texto_agentes(self, stats: Dict) -> str:
        """Genera texto descriptivo para agentes."""
        total = stats.get('total', 0)
        
        texto = f"""
Este documento presenta las estadísticas de los agentes del sistema.

Total de agentes registrados: {total}

Las tablas muestran la distribución por estado.
"""
        return texto
    
    def _generar_texto_tareas(self, stats: Dict) -> str:
        """Genera texto descriptivo para tareas."""
        total = stats.get('total', 0)
        
        texto = f"""
Este documento presenta las estadísticas de las tareas del sistema.

Total de tareas: {total}

Las tablas muestran la distribución por estado.
"""
        return texto
    
    def _generar_texto_general(self, stats: Dict) -> str:
        """Genera texto descriptivo general."""
        resumen = stats.get('resumen', {})
        metricas = stats.get('metricas', {})
        
        texto = f"""
Este documento presenta un resumen general del sistema de tránsito.

Métricas principales:
- Total de reportes: {resumen.get('total', 0)}
- Reportes de hoy: {resumen.get('hoy', 0)}
- Reportes de esta semana: {resumen.get('esta_semana', 0)}
- Tasa de resolución: {metricas.get('tasa_resolucion_porcentual', 0)}%

El sistema opera con los siguientes datos.
"""
        return texto
