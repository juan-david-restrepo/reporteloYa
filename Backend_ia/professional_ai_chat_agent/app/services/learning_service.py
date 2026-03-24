"""
Sistema de Aprendizaje y Análisis para el Agente de IA.
Proporciona capacidades de:
- Análisis de patrones de uso
- Mejora basada en interacciones
- Detección de necesidades de usuarios
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import Counter
import logging

logger = logging.getLogger(__name__)


class LearningService:
    """
    Servicio de aprendizaje que analiza patrones de uso
    y proporciona insights para mejorar el sistema.
    """

    def __init__(self, db):
        self.db = db

    def analyze_user_patterns(self, user_id: int, role: str) -> Dict[str, Any]:
        """
        Analiza los patrones de uso de un usuario específico.
        """
        patterns = {
            "frequent_actions": [],
            "preferred_times": [],
            "common_queries": [],
            "insights": []
        }
        
        try:
            # Obtener mensajes recientes del usuario
            query = """
                SELECT contenido, created_at 
                FROM mensajes_ia m
                JOIN conversaciones c ON m.id_conversacion = c.id_conversacion
                WHERE c.id_usuario = %s
                ORDER BY m.created_at DESC
                LIMIT 50
            """
            result = self.db.execute(query, (user_id,))
            messages = result.fetchall() if result else []
            
            if not messages:
                return patterns
            
            # Analizar patrones de texto
            action_words = []
            for msg in messages:
                contenido = msg[0].lower() if msg[0] else ""
                # Extraer acciones comunes
                if "ver" in contenido or "mostrar" in contenido:
                    action_words.append("ver")
                if "crear" in contenido or "nuevo" in contenido:
                    action_words.append("crear")
                if "actualizar" in contenido or "cambiar" in contenido:
                    action_words.append("actualizar")
            
            # Contar acciones más frecuentes
            if action_words:
                action_counts = Counter(action_words)
                patterns["frequent_actions"] = [
                    {"action": action, "count": count}
                    for action, count in action_counts.most_common(5)
                ]
            
            # Generar insights
            if patterns["frequent_actions"]:
                top_action = patterns["frequent_actions"][0]["action"]
                patterns["insights"].append(
                    f"El usuario suele {top_action} información frecuentemente."
                )
                
        except Exception as e:
            logger.error(f"Error analizando patrones: {str(e)}")
        
        return patterns

    def get_system_analytics(self) -> Dict[str, Any]:
        """
        Proporciona análisis general del uso del sistema.
        """
        analytics = {
            "total_conversations": 0,
            "total_messages": 0,
            "active_users_today": 0,
            "top_intents": [],
            "average_messages_per_conversation": 0
        }
        
        try:
            # Contar conversaciones
            query = "SELECT COUNT(*) FROM conversaciones"
            result = self.db.execute(query)
            analytics["total_conversations"] = result.fetchone()[0] if result else 0
            
            # Contar mensajes
            query = "SELECT COUNT(*) FROM mensajes_ia"
            result = self.db.execute(query)
            analytics["total_messages"] = result.fetchone()[0] if result else 0
            
            # Usuarios activos hoy
            query = """
                SELECT COUNT(DISTINCT c.id_usuario) 
                FROM conversaciones c
                WHERE DATE(c.updated_at) = CURDATE()
            """
            result = self.db.execute(query)
            analytics["active_users_today"] = result.fetchone()[0] if result else 0
            
            # Promedio de mensajes por conversación
            if analytics["total_conversations"] > 0:
                analytics["average_messages_per_conversation"] = round(
                    analytics["total_messages"] / analytics["total_conversations"], 2
                )
                
        except Exception as e:
            logger.error(f"Error obteniendo analytics: {str(e)}")
        
        return analytics

    def predict_user_needs(self, user_id: int, role: str) -> List[str]:
        """
        Predice las necesidades del usuario basándose en patrones históricos.
        """
        predictions = []
        
        try:
            # Basado en el rol, predecir necesidades comunes
            if role == "ADMIN":
                predictions.extend([
                    "Ver estadísticas del sistema",
                    "Revisar reportes pendientes",
                    "Gestionar agentes"
                ])
            elif role == "AGENTE":
                predictions.extend([
                    "Ver tareas pendientes",
                    "Actualizar estado de reportes",
                    "Revisar asignaciones"
                ])
            elif role == "CIUDADANO":
                predictions.extend([
                    "Crear nuevo reporte",
                    "Ver estado de mis reportes"
                ])
                
        except Exception as e:
            logger.error(f"Error prediciendo necesidades: {str(e)}")
        
        return predictions

    def suggest_improvements(self) -> List[Dict[str, Any]]:
        """
        Sugiere mejoras para el sistema basándose en el análisis de uso.
        """
        suggestions = []
        
        try:
            # Analizar reportes sin atender por mucho tiempo
            query = """
                SELECT COUNT(*) FROM reporte 
                WHERE estado = 'pendiente' 
                AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
            """
            result = self.db.execute(query)
            old_pendientes = result.fetchone()[0] if result else 0
            
            if old_pendientes > 10:
                suggestions.append({
                    "priority": "high",
                    "category": "eficiencia",
                    "title": "Reportes pendientes antiguos",
                    "description": f"Hay {old_pendientes} reportes pendientes hace más de 3 días.",
                    "action": "Revisar flujo de asignación de reportes"
                })
            
            # Analizar agentes sin actividad reciente
            query = """
                SELECT COUNT(*) FROM agentes 
                WHERE estado = 'disponible' 
                AND id NOT IN (SELECT DISTINCT id_agente FROM reporte WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY))
            """
            result = self.db.execute(query)
            inactivos = result.fetchone()[0] if result else 0
            
            if inactivos > 0:
                suggestions.append({
                    "priority": "medium",
                    "category": "productividad",
                    "title": "Agentes disponibles sin actividad",
                    "description": f"Hay {inactivos} agentes disponibles sin reportes asignados recently.",
                    "action": "Revisar distribución de carga de trabajo"
                })
                
        except Exception as e:
            logger.error(f"Error generando sugerencias: {str(e)}")
        
        return suggestions


learning_service = None


def get_learning_service(db):
    """Factory para obtener instancia de LearningService."""
    global learning_service
    if learning_service is None:
        learning_service = LearningService(db)
    else:
        learning_service.db = db
    return learning_service
