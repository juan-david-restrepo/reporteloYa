"""
Sistema de Recomendaciones para el Agente de IA.
Proporciona recomendaciones inteligentes basadas en:
- Estado actual del sistema
- Historial del usuario
- Patrones de uso
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Servicio de recomendaciones que analiza el estado del sistema
    y proporciona sugerencias útiles para usuarios.
    """

    def __init__(self, db):
        self.db = db

    def get_admin_recommendations(self) -> List[Dict[str, Any]]:
        """
        Genera recomendaciones para administradores basadas en el estado del sistema.
        """
        recommendations = []
        
        try:
            # Revisar reportes pendientes
            pendientes_query = """
                SELECT COUNT(*) as total FROM reporte WHERE estado = 'pendiente'
            """
            result = self.db.execute(pendientes_query)
            count = result.fetchone()[0] if result else 0
            
            if count > 10:
                recommendations.append({
                    "type": "urgente",
                    "title": " Muchos reportes pendientes",
                    "description": f"Hay {count} reportes esperando atención. Considera asignar agentes.",
                    "action": "revisar_reportes_pendientes"
                })
            
            # Revisar agentes disponibles
            agentes_query = """
                SELECT COUNT(*) as total FROM agentes WHERE estado = 'disponible'
            """
            result = self.db.execute(agentes_query)
            disponibles = result.fetchone()[0] if result else 0
            
            if disponibles < 3:
                recommendations.append({
                    "type": "advertencia",
                    "title": "Agentes limitados",
                    "description": f"Solo hay {disponibles} agentes disponibles. Considera activar más agentes.",
                    "action": "revisar_agentes"
                })
            
            # Revisar tareas críticas
            tareas_query = """
                SELECT COUNT(*) as total FROM tareas 
                WHERE prioridad = 'urgente' AND estado != 'completada'
            """
            result = self.db.execute(tareas_query)
            urgentes = result.fetchone()[0] if result else 0
            
            if urgentes > 5:
                recommendations.append({
                    "type": "urgente",
                    "title": "Tareas urgentes pendientes",
                    "description": f"Hay {urgentes} tareas urgentes sin completar.",
                    "action": "revisar_tareas_urgentes"
                })
                
        except Exception as e:
            logger.error(f"Error generando recomendaciones admin: {str(e)}")
        
        return recommendations

    def get_agent_recommendations(self, agent_id: int) -> List[Dict[str, Any]]:
        """
        Genera recomendaciones personalizadas para un agente.
        """
        recommendations = []
        
        try:
            # Revisar tareas pendientes del agente
            tareas_query = """
                SELECT COUNT(*) as total FROM tareas 
                WHERE id_agente = %s AND estado = 'pendiente'
            """
            result = self.db.execute(tareas_query, (agent_id,))
            pendientes = result.fetchone()[0] if result else 0
            
            if pendientes > 0:
                recommendations.append({
                    "type": "accion",
                    "title": f"Tienes {pendientes} tareas pendientes",
                    "description": "Revisa tus tareas pendientes y complétalas.",
                    "action": "mis_tareas_pendientes"
                })
            
            # Revisar reportes asignados sin atender
            reportes_query = """
                SELECT COUNT(*) as total FROM reporte 
                WHERE id_agente = %s AND estado = 'pendiente'
            """
            result = self.db.execute(reportes_query, (agent_id,))
            reportes_pend = result.fetchone()[0] if result else 0
            
            if reportes_pend > 0:
                recommendations.append({
                    "type": "urgente",
                    "title": f"Tienes {reportes_pend} reportes por atender",
                    "description": "Hay reportes asignados que requieren tu atención.",
                    "action": "reportes_pendientes"
                })
                
        except Exception as e:
            logger.error(f"Error generando recomendaciones agente: {str(e)}")
        
        return recommendations

    def get_citizen_recommendations(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Genera recomendaciones para ciudadanos.
        """
        recommendations = []
        
        try:
            # Revisar estado de reportes del ciudadano
            query = """
                SELECT COUNT(*) as total FROM reporte 
                WHERE id_usuario = %s AND estado = 'pendiente'
            """
            result = self.db.execute(query, (user_id,))
            pendientes = result.fetchone()[0] if result else 0
            
            if pendientes > 0:
                recommendations.append({
                    "type": "info",
                    "title": "Tus reportes en proceso",
                    "description": f"Tienes {pendientes} reportes esperando atención.",
                    "action": "mis_reportes"
                })
                
        except Exception as e:
            logger.error(f"Error generando recomendaciones ciudadano: {str(e)}")
        
        return recommendations

    def get_contextual_recommendation(
        self,
        role: str,
        user_id: Optional[int] = None,
        last_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Genera una recomendación contextual basada en el último mensaje del usuario.
        """
        if not last_message:
            return None
            
        msg = last_message.lower()
        
        # Recomendaciones basadas en palabras clave
        if "reporte" in msg and "crear" in msg:
            return "💡 Consejo: Incluye fotos o evidencia para acelerar el proceso de tu reporte."
        
        if "tarea" in msg and "completar" in msg:
            return "💡 Recuerda actualizar el estado de tus tareas para que el sistema refleje tu progreso."
        
        if "agente" in msg and "hablar" in msg:
            return "💡 Los agentes pueden ayudarte con dudas sobre tus reportes o tareas asignadas."
        
        if "estadistica" in msg or "reporte" in msg and "pdf" in msg:
            return "💡 Puedes exportar tus datos en PDF para tener un registro físico."
        
        return None


recommendation_service = None


def get_recommendation_service(db):
    """Factory para obtener instancia de RecommendationService."""
    global recommendation_service
    if recommendation_service is None:
        recommendation_service = RecommendationService(db)
    else:
        recommendation_service.db = db
    return recommendation_service
