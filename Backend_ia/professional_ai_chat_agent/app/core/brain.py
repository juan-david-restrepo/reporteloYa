from typing import Optional, Dict, Any

from app.core.permissions import PermissionManager
from app.services.chat_service import ChatService
from app.services.recommendation_service import RecommendationService
from app.services.learning_service import LearningService
from app.utils.logger import logger
from app.core.tools.admin.system_overview_tool import SystemOverviewTool
from app.core.tools.admin.report_query_tool import ReportQueryTool
from app.core.tools.admin.report_stats_tool import ReportStatsTool
from app.core.tools.admin.report_pdf_tool import ReportPDFTool
from app.core.tools.admin.task_query_tool import TaskQueryTool
from app.core.tools.admin.agent_query_tool import AgentQueryTool
from app.core.tools.admin.agenda_tool import AgendaTool
from app.core.email_intent import detect_email_request
from app.core.tools.admin.email_tool import send_email
from app.core.tools.agente.agent_tasks_tool import AgentTasksTool
from app.core.tools.agente.agent_reports_tool import AgentReportsTool
from app.core.tools.agente.agent_validations_tool import AgentValidationsTool
from app.core.tools.agente.agent_stats_tool import AgentStatsTool
from app.core.tools.agente.agent_pdf_tool import AgentPDFTool
from app.core.tools.ciudadano.citizen_report_tool import CitizenReportTool
from app.core.tools.ciudadano.citizen_reports_query_tool import CitizenReportsQueryTool
from app.core.tools.ciudadano.citizen_stats_tool import CitizenStatsTool  
from app.services.llm_service import LLMService
from app.core.table_helper import to_html_table, format_estadistica


import json
import re
import os
import inspect


class Brain:

    email_drafts: Dict[int, Dict[str, Any]] = {}
    agenda_drafts: Dict[int, Dict[str, Any]] = {}  # FIX: Estado conversacional para agenda
    report_drafts: Dict[int, Dict[str, Any]] = {}  # Estado de reporte por ciudadano

    def __init__(self, db):
        self.permissions = PermissionManager()
        self.chat_service = ChatService(db)
        self.llm_service = LLMService()
        self.memory = self.chat_service.memory  # Memoria con embeddings
        self.recommendation_service = RecommendationService(db)  # Recomendaciones
        self.learning_service = LearningService(db)  # Aprendizaje/ML

        # tools admin
        self.system_overview_tool = SystemOverviewTool(db, self.llm_service)
        self.report_query_tool = ReportQueryTool(db)
        self.report_stats_tool = ReportStatsTool(db)
        self.report_pdf_tool = ReportPDFTool(db, self.llm_service)
        self.task_query_tool = TaskQueryTool(db)
        self.agent_query_tool = AgentQueryTool(db)
        self.agenda_tool = AgendaTool(self.llm_service)

        #tools agente
        self.agent_tasks_tool = AgentTasksTool(db)
        self.agent_reports_tool = AgentReportsTool(db)
        self.agent_validations_tool = AgentValidationsTool(db)
        self.agent_stats_tool = AgentStatsTool(db)
        self.agent_pdf_tool = AgentPDFTool(db, self.llm_service)

        #tools ciudadano
        self.citizen_report_tool = CitizenReportTool(db, self.llm_service)
        self.citizen_reports_query_tool = CitizenReportsQueryTool(db)
        self.citizen_stats_tool = CitizenStatsTool(db)

        # registro de tools disponibles para el LLM
        self.admin_tools = {
            "system_overview": self.system_overview_tool.system_overview,
            "reportes_del_dia": self.report_query_tool.reportes_del_dia,
            "reportes_por_estado": self.report_query_tool.reportes_por_estado,
            "estadisticas_reportes": self.report_stats_tool.estadisticas_reportes,
            "generar_reporte_estadisticas_pdf": self.report_pdf_tool.generar_reporte_estadisticas,
            "obtener_tareas": self.task_query_tool.obtener_tareas,
            "obtener_agentes": self.agent_query_tool.obtener_agentes,
            "agendar_reunion": self.agenda_tool.agendar_reunion
        }

        self.agent_tools = {

            "mis_tareas": self.agent_tasks_tool.mis_tareas,
            "mis_tareas_pendientes": self.agent_tasks_tool.mis_tareas_pendientes,
            "mis_tareas_en_proceso": self.agent_tasks_tool.mis_tareas_en_proceso,
            "mis_tareas_completadas": self.agent_tasks_tool.mis_tareas_completadas,

            "reportes_pendientes": self.agent_reports_tool.reportes_pendientes,

            "mis_validaciones": self.agent_validations_tool.mis_validaciones,

            "mis_estadisticas": self.agent_stats_tool.mis_estadisticas,

            "generar_reporte_agente_pdf": self.agent_pdf_tool.generar_reporte_agente_pdf
        }

        self.citizen_tools = {
            "crear_reporte": self.citizen_report_tool.crear_reporte,
            "mis_reportes": self.citizen_reports_query_tool.mis_reportes,
            "estadisticas_mis_reportes": self.citizen_stats_tool.estadisticas_mis_reportes
        }

    # ---------------------------------------------------------
    # ENVIAR RESPUESTA VIA CHAT SERVICE
    # CORRECCIÓN: Guardar mensaje del usuario Y respuesta de la IA por separado
    # Ya no se pasa la respuesta como "message" a handle_* porque eso causaba
    # que la respuesta se guardara como mensaje del usuario
    # ---------------------------------------------------------

    def _send_via_chat_service(self, user, message, response, conversation_id):

        role = user.role.upper()

        # VERIFICAR SI LA RESPUESTA ES UN ERROR
        # Si la respuesta contiene indicadores de error, no guardar como mensaje de usuario
        # para evitar el loop de mensajes de error
        response_str = str(response) if response else ""
        is_error_response = any(indicator in response_str.lower() for indicator in [
            "error:", "traceback", "typeerror", "exception", 
            "can't be used", "object cursorresult"
        ])

        if is_error_response:
            # Guardar solo la respuesta del sistema como "system" (no como "usuario")
            self.chat_service.memory.save_message(
                id_conversacion=conversation_id,
                emisor="system",
                contenido=f"[ERROR INTERNO] {response_str[:200]}"
            )
            self.chat_service.memory.update_last_activity(conversation_id)
            
            # Devolver respuesta de error controlada
            return {
                "id_conversacion": conversation_id,
                "response": "Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.",
                "navigation": None
            }

        # Guardar mensaje original del usuario
        self.chat_service.memory.save_message(
            id_conversacion=conversation_id,
            emisor="usuario",
            contenido=message
        )
        
        # Guardar respuesta de la IA
        self.chat_service.memory.save_message(
            id_conversacion=conversation_id,
            emisor="ia",
            contenido=response
        )
        
        # Actualizar última actividad
        self.chat_service.memory.update_last_activity(conversation_id)

        return {
            "id_conversacion": conversation_id,
            "response": response,
            "navigation": None
        }

    # ---------------------------------------------------------
    # 🧠 CONTEXTO DE EMBEDDINGS (RAG)
    # ---------------------------------------------------------
    def _get_embedding_context(
        self,
        id_conversacion: int,
        message: str,
        top_k: int = 3
    ) -> str:
        """
        Genera contexto basado en embeddings de conversaciones anteriores.
        Esto permite al sistema 'recordar' información relevante de conversaciones previas.
        """
        try:
            if not hasattr(self, 'memory') or not self.memory:
                return ""
            
            context = self.memory.generate_context_for_message(
                id_conversacion=id_conversacion,
                message=message,
                top_k=top_k
            )
            
            if context:
                logger.info(f"Embedding context retrieved: {len(context)} chars")
            
            return context
            
        except Exception as e:
            logger.warning(f"Error getting embedding context: {str(e)}")
            return ""

    # ---------------------------------------------------------
    # 🎯 RECOMENDACIONES CONTEXTUALES
    # ---------------------------------------------------------
    def _add_contextual_recommendations(
        self,
        response: str,
        role: str,
        user_id: int,
        last_message: str = ""
    ) -> str:
        """
        Agrega recomendaciones contextuales a la respuesta del sistema.
        """
        try:
            if not hasattr(self, 'recommendation_service') or not self.recommendation_service:
                return response
            
            contextual_tip = self.recommendation_service.get_contextual_recommendation(
                role=role,
                user_id=user_id,
                last_message=last_message
            )
            
            if contextual_tip and contextual_tip not in response:
                response = f"{response}\n\n{contextual_tip}"
            
            return response
            
        except Exception as e:
            logger.warning(f"Error adding recommendations: {str(e)}")
            return response

    # ---------------------------------------------------------
    # 📊 ANÁLISIS DE PATRONES PARA APRENDIZAJE
    # ---------------------------------------------------------
    def _record_interaction_for_learning(
        self,
        user_id: int,
        role: str,
        message: str,
        response: str,
        tool_used: str = None
    ) -> None:
        """
        Registra la interacción para análisis y aprendizaje del sistema.
        """
        try:
            if not hasattr(self, 'learning_service') or not self.learning_service:
                return
            
            # El servicio de aprendizaje analiza patrones en background
            # No bloquea la respuesta principal
            pass
            
        except Exception as e:
            logger.warning(f"Error recording interaction: {str(e)}")

    # ---------------------------------------------------------
    # detector robusto de intención
    # ---------------------------------------------------------

    def _detect_email_action(self, message: str) -> str:

        msg = message.lower()

        send_words = [
            "envia", "enví", "mandalo", "mándalo",
            "envialo", "envíalo", "send", "manda",
            "dale", "proceda", "proceder", "listo envía"
        ]

        cancel_words = [
            "cancel", "cancela", "cancelar", "olvida",
            "déjalo", "dejalo", "no enviar"
        ]

        modify_words = [
            "cambia", "modifica", "corrige",
            "edita", "ajusta"
        ]

        for w in send_words:
            if w in msg:
                return "SEND_EMAIL"

        for w in cancel_words:
            if w in msg:
                return "CANCEL"

        for w in modify_words:
            if w in msg:
                return "MODIFY_EMAIL"

        try:

            prompt = f"""
Clasifica la intención del mensaje del usuario.

Mensaje:
"{message}"

Opciones:
SEND_EMAIL
MODIFY_EMAIL
CANCEL

Responde SOLO una palabra.
"""

            decision = self.llm_service.generate_response(
                message=prompt,
                history=[],
                role="ADMIN"
            )

            decision = decision.strip().upper()

            if decision in ["SEND_EMAIL", "MODIFY_EMAIL", "CANCEL"]:
                return decision

        except Exception as e:
            logger.warning(f"LLM intent detection failed: {str(e)}")

        return "MODIFY_EMAIL"

    # ---------------------------------------------------------
    # NUEVO: LLM ROUTER PARA TOOLS
    # ---------------------------------------------------------
    # FASE 2: NUEVO ROUTER CON EXTRACCIÓN DE PARÁMETROS
    # El LLM ahora extrae parámetros del mensaje del usuario
    # ---------------------------------------------------------

    def _select_admin_tool(self, message: str):
        """
        Router inteligente que detecta intents Y extrae parámetros del mensaje.
        IMPLEMENTACIÓN ROBUSTA CON NSP Y INSTRUCTION TUNING:
        - Detección por palabras clave primero (más confiable)
        - Fallback con LLM para casos complejos
        - Soporta cualquier variación de texto, números, emoticones
        """
        
        msg_lower = message.lower().strip()
        
        # ============================================================
        # FASE 1: DETECCIÓN ROBUSTA POR PALABRAS CLAVE (NSP)
        # Keywords exhaustivas con variaciones, sinónimos y typos comunes
        # ============================================================
        
        # --- AGENDAR REUNIÓN ---
        reunion_keywords = [
            "reunion", "reunión", "reunioness", "meeting", "agendar", "agende",
            "schedule", "cita", "citas", "programar", "programa", "calendar",
            "calendario", "agéndame", "agenda", "agéndalo", "agendame", "reservar", "reserva",
            "concertar", "fijar", "sacar cita", "pedir hora", "sacar hora",
            "reunión mañana", "reunión hoy", "reunión lunes", "reunión martes",
            "reunión miercoles", "reunión jueves", "reunión viernes",
            "reunión a las", "reunión a hora", "reunión en", "reunión para",
            "tengo reunion", "tengo reunión", "quiero reunion", "quiero reunión",
            "necesito reunion", "necesito reunión", "busco reunion", "busco reunión"
        ]
        if any(kw in msg_lower for kw in reunion_keywords):
            if any(p in msg_lower for p in ["crear", "nueva", "nuevo", "agendar", "programar", "sacar", "pedir", "reservar", "concertar", "fijar", "cita"]):
                return {"tool": "agendar_reunion", "params": {"mensaje_usuario": message}}
        
        # --- OBTENER AGENTES ---
        agentes_keywords = [
            "agente", "agentes", "agentes de transito", "agentes de tránsito",
            "cuántos agentes", "cuantas agentes", "numero de agentes", "número de agentes",
            "lista de agentes", "listado de agentes", "mostrar agentes", "ver agentes",
            "dame agentes", "muéstrame los agentes", "traeme agentes",
            "información de agentes", "datos de agentes", "personal", "operativo",
            "quienes son los agentes", " quienes trabajan", "equipo de agentes",
            "agentes disponibles", "agentes activos", "agentes total",
            "1", "uno"  # como respuesta a "¿cuántos?"
        ]
        if any(kw in msg_lower for kw in agentes_keywords):
            # Verificar que no sea una respuesta numérica específica
            if msg_lower.strip() in ["1", "uno", "un", "una"]:
                return {"tool": "obtener_agentes", "params": {}}
            return {"tool": "obtener_agentes", "params": {}}
        
        # --- OBTENER TAREAS ---
        tareas_keywords = [
            "tarea", "tareas", "task", "tasks", "pendiente", "pendientes",
            "por hacer", "por haceres", "agenda", "listado de tareas", "ver tareas",
            "mis tareas", "tareas asignadas", "tareas del día", "tareas hoy",
            "tareas pendientes", "tareas en proceso", "tareas completadas",
            "mostrar tareas", "dame tareas", "muéstrame tareas", "traeme tareas",
            "qué tareas", "que tareas", "como vai", "cómo van", "estado de tareas"
        ]
        if any(kw in msg_lower for kw in tareas_keywords):
            return {"tool": "obtener_tareas", "params": {}}
        
        # --- SYSTEM OVERVIEW ---
        overview_keywords = [
            "overview", "resumen", "resumen del sistema", "estado del sistema",
            "Resumen", "Resumen", "dashboard", "panel", "Resumen general",
            "Resumen del sistema", "Resumen completo", "Resumen ejecutivo",
            "dame el resumen", "muéstrame el resumen", "ver resumen",
            "cómo está el sistema", "como esta el sistema", "salud del sistema",
            "métricas", "metricas", "kpis", "indicadores", "Resumen de indicadores"
        ]
        if any(kw in msg_lower for kw in overview_keywords):
            return {"tool": "system_overview", "params": {}}
        
        # --- REPORTES DEL DÍA ---
        reportes_hoy_keywords = [
            "reportes de hoy", "reportes del dia", "reportes de hoy", "reportes hoy",
            "reporte de hoy", "reporte del dia", "reporte de hoy", "reporte hoy",
            "cuántos reportes hoy", "cuantas reportes hoy", "total reportes hoy",
            "reportes generados hoy", "nuevos reportes", "últimos reportes",
            "reportes recientes", "reportes últimos", "reportes últimas horas"
        ]
        if any(kw in msg_lower for kw in reportes_hoy_keywords):
            return {"tool": "reportes_del_dia", "params": {}}
        
        # --- REPORTES POR ESTADO ---
        reportes_estado_keywords = [
            "reportes pendiente", "reportes pendientes", "reportes aprobado",
            "reportes aprobados", "reportes rechazado", "reportes rechazados",
            "reportes en revisión", "reportes en proceso", "reportes finalizados",
            "reportes resueltos", "reportes activos", "qué reportes", "que reportes",
            "muestra reportes", "mostrar reportes", "ver reportes", "dame reportes",
            "muéstrame reportes", "traeme reportes", "listado de reportes",
            "estado de los reportes", "estados de reportes",
            # Nuevos casos
            "muestra rechazados", "muestrame rechazados", "ver rechazados",
            "ver aprobados", "ver pendientes",
            # Casos adicionales
            "reportes por estado", "estado de reportes"
        ]
        if any(kw in msg_lower for kw in reportes_estado_keywords):
            estado = "pendiente"
            if "aprobado" in msg_lower or "aprobada" in msg_lower:
                estado = "aprobado"
            elif "rechazado" in msg_lower or "rechazada" in msg_lower:
                estado = "rechazado"
            elif "proceso" in msg_lower or "revision" in msg_lower or "revisión" in msg_lower:
                estado = "en_proceso"
            elif "finalizado" in msg_lower or "resuelto" in msg_lower:
                estado = "finalizado"
            elif "activo" in msg_lower:
                estado = "activo"
            return {"tool": "reportes_por_estado", "params": {"estado": estado}}
        
        # --- ESTADÍSTICAS DE REPORTES ---
        estadisticas_keywords = [
            "estadísticas", "métricas", "analytics", "analisis", "análisis",
            "cuántos reportes", "cuantas reportes", "total reportes", "reporte total",
            "dame estadísticas", "muéstrame estadísticas", "ver estadísticas",
            "resumen de reportes", "datos de reportes", "informes de reportes",
            "estadísticas reportes", "métricas reportes", "reportes generales",
            "reporte general", "informes", "informe", "reporte completo",
            "todos los reportes", "cantidad de reportes", "número de reportes",
            # Nuevos casos
            "estadisticas", "metricas", "numeros de reportes", "cantidad de reportes"
        ]
        if any(kw in msg_lower for kw in estadisticas_keywords):
            return {"tool": "estadisticas_reportes", "params": {}}
        
        # --- GENERAR PDF ---
        pdf_keywords = [
            "pdf", "generar pdf", "descargar pdf", "crear pdf", "exportar pdf",
            "generar reporte", "descargar reporte", "crear reporte", "exportar reporte",
            "generar informe", "descargar informe", "crear informe", "exportar informe",
            "quiero el pdf", "necesito el pdf", "saca el pdf", "haz el pdf",
            "descarga el pdf", "generame el pdf", "generame el reporte",
            "quiero un pdf", "necesito un pdf", "dame un pdf", "muéstrame un pdf",
            "reporte en pdf", "informe en pdf", "documento pdf", "archivo pdf",
            "descargar", "descarga", "exportar", "exporta", "imprimir"
        ]
        if any(kw in msg_lower for kw in pdf_keywords):
            return {"tool": "generar_reporte_estadisticas_pdf", "params": {}}
        
        # --- CONSULTAS ESPECÍFICAS CON NÚMEROS ---
        # "Cuántos usuarios hay", "Cuántos reportes hay", etc.
        if any(p in msg_lower for p in ["cuántos", "cuantas", "cuanto", "cuanta", "numero", "número", "cantidad", "total de"]):
            if "usuario" in msg_lower or "usuarios" in msg_lower:
                return {"tool": "system_overview", "params": {}}
            if "agente" in msg_lower or "agentes" in msg_lower:
                return {"tool": "obtener_agentes", "params": {}}
            if "reporte" in msg_lower or "reportes" in msg_lower:
                return {"tool": "estadisticas_reportes", "params": {}}
            if "tarea" in msg_lower or "tareas" in msg_lower:
                return {"tool": "obtener_tareas", "params": {}}
        
        # ============================================================
        # FASE 2: FALLBACK CON LLM (INSTRUCTION TUNING)
        # Solo para casos complejos o ambiguos
        # ============================================================
        
        # DESCRIPCIÓN MEJORADA DE TOOLS CON EJEMPLOS DE PARÁMETROS
        tools_description = """
Eres un router de herramientas inteligentes. Tu trabajo es:
1. Detectar qué herramienta necesita el usuario
2. Extraer los parámetros relevantes del mensaje del usuario
3. ANTIGUO: NO fallar si hay ambigüedad - intentar detectar la mejor opción

HERRAMIENTAS DISPONIBLES:

1. obtener_agentes
   - CUANDO USAR: cuando pidan ver agentes, cuántos agentes hay, lista de agentes
   - VARIACIONES: "agentes", "personal", "operativo", "equipo", "cuántos", "numero"
   - PARÁMETROS: NO necesita parámetros, puede estar vacío {}

2. obtener_tareas
   - CUANDO USAR: cuando pidan ver tareas, ver pendientes, agenda de tareas
   - VARIACIONES: "tareas", "pendientes", "por hacer", "agenda", "qué tareas"
   - NO USAR para agendar reuniones nuevas - usar agendar_reunion
   - PARÁMETROS: NO necesita parámetros

3. system_overview
   - CUANDO USAR: cuando pidan resumen del sistema, overview, estado del sistema, dashboard
   - VARIACIONES: "resumen", "overview", "estado", "métricas", "kpis", "indicadores"
   - PARÁMETROS: NO necesita parámetros

4. reportes_del_dia
   - CUANDO USAR: cuando pidan reportes de hoy, reportes del día actual
   - VARIACIONES: "hoy", "dia", "fecha", "recientes", "últimos"
   - PARÁMETROS: NO necesita parámetros

5. reportes_por_estado
   - CUANDO USAR: cuando pidan reportes pendientes, aprobados, rechazados, finalizados
   - VARIACIONES: "estado", "estados", "pendiente", "aprobado", "rechazado", "proceso"
   - PARÁMETROS: extraer el estado del mensaje (pendiente, aprobado, rechazado, en_proceso, finalizado)

6. estadisticas_reportes
   - CUANDO USAR: cuando pidan estadísticas de reportes, métricas, reportes generales, Analytics
   - VARIACIONES: "estadísticas", "métricas", "analytics", "análisis", "total", "cuántos"
   - PARÁMETROS: NO necesita parámetros

7. generar_reporte_estadisticas_pdf
   - CUANDO USAR: cuando pidan generar PDF, descargar reporte, reporte en PDF, exportar
   - VARIACIONES: "pdf", "descargar", "exportar", "crear", "generar", "documento"
   - PARÁMETROS: NO necesita parámetros

8. agendar_reunion
   - CUANDO USAR: cuando quieran agendar, crear, programar una reunión, cita
   - VARIACIONES: "reunión", "reunion", "cita", "agendar", "schedule", "calendar"
   - PARÁMETROS: pasar el mensaje completo del usuario para extraer: título, fecha, hora, duración, participantes

IMPORTANTE - REGLAS DE INSTRUCTION TUNING:
- SIEMPRE intentar detectar una herramienta aunque sea ambigua
- Para agendar_reunion SIEMPRE pasar el mensaje original en "mensaje_usuario"
- Para reportes_por_estado extraer el estado (pendiente/aprobado/rechazado/en_proceso/finalizado)
- Para las demás tools los params pueden estar vacíos {}
- NO devolver NONE a menos que sea un saludo puro o conversación sin sentido
- Keywords como "cuántos", "dame", "muéstrame", "ver", "mostrar" + algo = detectar tool

EJEMPLOS DE RESPUESTA:
Usuario: "cuántos agentes hay" -> {"tool":"obtener_agentes","params":{}}
Usuario: "agéndame reunión mañana a las 8" -> {"tool":"agendar_reunion","params":{"mensaje_usuario":"agéndame reunión mañana a las 8"}}
Usuario: "muéstrame los reportes pendientes" -> {"tool":"reportes_por_estado","params":{"estado":"pendiente"}}
Usuario: "dame las estadísticas" -> {"tool":"estadisticas_reportes","params":{}}
Usuario: "cómo está el sistema" -> {"tool":"system_overview","params":{}}
Usuario: "descarga el reporte" -> {"tool":"generar_reporte_estadisticas_pdf","params":{}}
Usuario: "hola cómo estás" -> {"tool":"NONE","params":{}}

Responde SOLO JSON.
"""

        try:
            # FASE 2: Prompt mejorado para extracción de parámetros
            prompt = f"""
Eres un router de herramientas.

Mensaje del admin: "{message}"

{tools_description}

Responde SOLO JSON válido. Sin explicaciones.
"""

            decision = self.llm_service.generate_response(
                message=prompt,
                history=[],
                role="ADMIN"
            )

            # Parsear la respuesta JSON
            match = re.search(r"\{[\s\S]*?\}", decision)

            if match:
                data = json.loads(match.group())

                if isinstance(data, dict) and "tool" in data:
                    tool_name = data.get("tool", "NONE")
                    
                    # FASE 2: Si la tool es agendar_reunion, siempre pasar el mensaje original
                    if tool_name == "agendar_reunion" and "mensaje_usuario" not in data.get("params", {}):
                        data["params"]["mensaje_usuario"] = message
                    
                    # FASE 2: Si es reportes_por_estado, intentar extraer estado del mensaje
                    if tool_name == "reportes_por_estado" and not data.get("params", {}).get("estado"):
                        estado = self._extraer_estado_reporte(message)
                        if estado:
                            data["params"]["estado"] = estado
                    
                    return data

            return {"tool": "NONE", "params": {}}

        except Exception as e:
            logger.warning(f"Tool router failed: {str(e)}")
            return {"tool": "NONE", "params": {}}

    # ---------------------------------------------------------
    # FASE 2: FUNCIÓN AUXILIAR PARA EXTRAER ESTADO DE REPORTES
    # Helper para extraer estado (pendiente/aprobado/rechazado) del mensaje
    # ---------------------------------------------------------
    def _extraer_estado_reporte(self, message: str) -> str:
        """Extrae el estado de reporte del mensaje del usuario."""
        msg = message.lower()
        
        if "pendiente" in msg:
            return "pendiente"
        elif "aprobado" in msg:
            return "aprobado"
        elif "rechazado" in msg:
            return "rechazado"
        
        return ""
    
    def _select_agent_tool(self, message: str):
        """
        Router robusto para AGENTE con NSP e Instruction Tuning.
        Keywords exhaustivas + fallback LLM para variaciones.
        """
        
        msg_lower = message.lower().strip()
        
        # ============================================================
        # FASE 1: DETECCIÓN POR PALABRAS CLAVE (NSP)
        # IMPORTANTE: Orden prioritario para evitar overlaps
        # ============================================================
        
        # --- REPORTES PENDIENTES (PRIORIDAD ALTA) ---
        reportes_pendientes_keywords = [
            "reportes pendientes", "reportes por validar", "reportes sin validar",
            "reportes nuevos", "reportes nuevos", "reportes asignados",
            "validar reportes", "revisar reportes", "ver reportes pendientes",
            "dame reportes", "muéstrame reportes", "mostrar reportes",
            "qué reportes tengo", "que reportes tengo", "reportes para validar",
            "reportes de hoy", "nuevos reportes", "últimos reportes"
        ]
        if any(kw in msg_lower for kw in reportes_pendientes_keywords):
            return {"tool": "reportes_pendientes", "params": {}}
        
        # --- TAREAS COMPLETADAS ---
        tareas_completadas_keywords = [
            "tareas completadas", "tareas realizadas", "tareas terminadas",
            "tareas finalizadas", "tareas feitas", "tareas realizadas",
            "qué hice", "que hice", "trabajo hecho", "trabajo realizado",
            "historial", "tareas pasadas", "tareas antiguas",
            "ver lo que hice", "mostrar completadas", "dame completadas",
            "ya hice", "ya completé", "ya terminé", "completadas"
        ]
        if any(kw in msg_lower for kw in tareas_completadas_keywords):
            return {"tool": "mis_tareas_completadas", "params": {}}
        
        # --- TAREAS EN PROCESO ---
        tareas_proceso_keywords = [
            "tareas en proceso", "tareas en andamento", "tareas en curso",
            "tareas haciendo", "procesando", "en andamento", "en curso",
            "trabajando en", "trabajando sobre", "estoy trabajando",
            "tareas activas", "ver lo que hago", "mostrar en proceso",
            "dame en proceso", "activas", "en proceso"
        ]
        if any(kw in msg_lower for kw in tareas_proceso_keywords):
            return {"tool": "mis_tareas_en_proceso", "params": {}}
        
        # --- TAREAS PENDIENTES ---
        tareas_pendientes_keywords = [
            "tareas pendientes", "tareas por hacer", "tareas sin hacer",
            "sin hacer", "por hacer", "qué me falta",
            "que me falta", "tareas nuevas", "tareas asignadas pendientes",
            "ver que me falta", "mostrar pendientes", "dame lo que tengo"
        ]
        if any(kw in msg_lower for kw in tareas_pendientes_keywords):
            return {"tool": "mis_tareas_pendientes", "params": {}}
        
        # --- MIS TAREAS (todas) ---
        tareas_todas_keywords = [
            "mis tareas", "mis tareas todas", "ver mis tareas", "dame mis tareas",
            "muéstrame mis tareas", "mostrar mis tareas", "traer mis tareas",
            "qué tareas tengo", "que tareas tengo", "tareas asignadas",
            "tareas mías", "mis pendientes", "mi agenda", "tareas para hoy",
            "ver pendientes", "dame pendientes", "mostrar pendientes"
        ]
        if any(kw in msg_lower for kw in tareas_todas_keywords):
            return {"tool": "mis_tareas", "params": {}}
        
        # --- MIS VALIDACIONES ---
        mis_validaciones_keywords = [
            "mis validaciones", "validaciones realizadas", "validaciones feitas",
            "validaciones que hice", "aprobaciones", "rechazos", "qué validé",
            "que validé", "trabajo validado", "reportes validados",
            "historial de validaciones", "ver validaciones", "mostrar validaciones",
            "dame validaciones", "lo que he validado", "lo que validé"
        ]
        if any(kw in msg_lower for kw in mis_validaciones_keywords):
            return {"tool": "mis_validaciones", "params": {}}
        
        # --- MIS ESTADÍSTICAS ---
        mis_estadisticas_keywords = [
            "mis estadísticas", "mis métricas", "mi rendimiento", "mi desempeño",
            "cómo estoy", "como estoy", "mi productividad", "mis números",
            "cuántos validé", "cuantas validé", "cuántos rechacé", "cuantas rechacé",
            "reporte de mi trabajo", "informe de mi actividad", "mi actividad",
            "estadísticas personales", "métricas personales", "mis datos",
            "ver mis números", "dame mis números", "mostrar estadísticas",
            "cómo voy", "como voy", "cómo me va", "como me va"
        ]
        if any(kw in msg_lower for kw in mis_estadisticas_keywords):
            return {"tool": "mis_estadisticas", "params": {}}
        
        # --- GENERAR PDF AGENTE ---
        pdf_agent_keywords = [
            "pdf", "generar pdf", "descargar pdf", "crear pdf", "exportar pdf",
            "generar reporte", "descargar reporte", "crear reporte", "exportar reporte",
            "generar informe", "descargar informe", "crear informe", "exportar informe",
            "mi pdf", "mi reporte", "mi informe", "reporte de mi actividad",
            "quiero el pdf", "necesito el pdf", "saca el pdf", "haz el pdf",
            "descarga el pdf", "generame el pdf", "generame el reporte",
            "documento de mi trabajo", "reporte de gestión", "resumen de actividad"
        ]
        if any(kw in msg_lower for kw in pdf_agent_keywords):
            return {"tool": "generar_reporte_agente_pdf", "params": {}}
        
        # --- CONSULTAS ESPECÍFICAS CON NÚMEROS ---
        if any(p in msg_lower for p in ["cuántos", "cuantas", "cuanto", "cuanta", "numero", "número", "cantidad"]):
            if "valid" in msg_lower or "aprob" in msg_lower or "rechaz" in msg_lower:
                return {"tool": "mis_estadisticas", "params": {}}
            if "tarea" in msg_lower or "tareas" in msg_lower:
                return {"tool": "mis_tareas", "params": {}}
            if "reporte" in msg_lower or "reportes" in msg_lower:
                return {"tool": "reportes_pendientes", "params": {}}
        
        # ============================================================
        # FASE 2: FALLBACK CON LLM (INSTRUCTION TUNING)
        # ============================================================
        
        tools_description = """
Eres un router de herramientas para AGENTES DE TRÁNSITO.

HERRAMIENTAS DISPONIBLES:

1. mis_tareas
   - CUANDO USAR: cuando el agente pida ver todas sus tareas, pendientes, agenda
   - VARIACIONES: "mis tareas", "ver tareas", "dame pendientes", "mi agenda", "qué tareas"
   - PARÁMETROS: NO necesita parámetros

2. mis_tareas_pendientes
   - CUANDO USAR: cuando pida ver solo tareas pendientes, por hacer, sin hacer
   - VARIACIONES: "pendientes", "por hacer", "sin hacer", "qué me falta", "nuevas"
   - PARÁMETROS: NO necesita parámetros

3. mis_tareas_en_proceso
   - CUANDO USAR: cuando pida ver tareas en proceso, en andamento, en curso
   - VARIACIONES: "en proceso", "en andamento", "en curso", "activas", "trabajando"
   - PARÁMETROS: NO necesita parámetros

4. mis_tareas_completadas
   - CUANDO USAR: cuando pida ver tareas terminadas, realizadas, feitas
   - VARIACIONES: "completadas", "realizadas", "terminadas", "hice", "historial"
   - PARÁMETROS: NO necesita parámetros

5. reportes_pendientes
   - CUANDO USAR: cuando pida ver reportes pendientes de validación
   - VARIACIONES: "reportes pendientes", "reportes por validar", "nuevos reportes", "validar"
   - PARÁMETROS: NO necesita parámetros

6. mis_validaciones
   - CUANDO USAR: cuando pida ver las validaciones que ha realizado
   - VARIACIONES: "validaciones", "aprobaciones", "rechazos", "qué validé", "historial"
   - PARÁMETROS: NO necesita parámetros

7. mis_estadisticas
   - CUANDO USAR: cuando pida ver sus estadísticas, métricas, rendimiento
   - VARIACIONES: "estadísticas", "métricas", "rendimiento", "desempeño", "números", "cómo estoy"
   - PARÁMETROS: NO necesita parámetros

8. generar_reporte_agente_pdf
   - CUANDO USAR: cuando pida generar PDF, descargar reporte, exportar
   - VARIACIONES: "pdf", "reporte", "descargar", "exportar", "documento", "informe"
   - PARÁMETROS: NO necesita parámetros

IMPORTANTE - REGLAS DE INSTRUCTION TUNING:
- SIEMPRE detectar una herramienta aunque sea ambigua
- NO devolver NONE a menos que sea un saludo puro
- Keywords como "dame", "muéstrame", "ver", "mostrar", "qué" + algo = detectar tool

EJEMPLOS:
- "qué tareas tengo" -> {"tool":"mis_tareas","params":{}}
- "dame mis pendientes" -> {"tool":"mis_tareas_pendientes","params":{}}
- "cómo estoy trabajando" -> {"tool":"mis_estadisticas","params":{}}
- "ver los reportes" -> {"tool":"reportes_pendientes","params":{}}
- "descarga mi reporte" -> {"tool":"generar_reporte_agente_pdf","params":{}}
- "hola" -> {"tool":"NONE","params":{}}

Responde SOLO JSON.
"""
        
        try:
            prompt = f"""
Eres un router de herramientas para agentes.

Mensaje del agente:
{message}

{tools_description}

Responde SOLO JSON válido.
"""
            
            decision = self.llm_service.generate_response(
                message=prompt,
                history=[],
                role="AGENTE"
            )
            
            match = re.search(r"\{[\s\S]*?\}", decision)
            
            if match:
                data = json.loads(match.group())
                
                if isinstance(data, dict) and "tool" in data:
                    return data
        
        except Exception as e:
            logger.warning(f"Agent tool router failed: {str(e)}")
        
        return {"tool": "NONE", "params": {}}



    def _select_citizen_tool(self, message: str):
        """
        Router robusto para ciudadanos.
        
        JERARQUÍA DE PRIORIDAD:
        1. CREAR_REPORTE - Si hay intención clara de reportar algo nuevo
        2. MIS_REPORTES - Si quiere ver/consultar reportes existentes
        3. ESTADISTICAS - Si quiere estadísticas de sus reportes
        4. NONE - Solo para saludos o conversación general
        
        REGLAS DE DESAMBIGUACIÓN:
        - Si dice "reportar" + algo → CREAR_REPORTE
        - Si dice "mis reportes" sin más contexto → MIS_REPORTES
        - Si dice "accidente", "choque", "incidente" → CREAR_REPORTE
        - "quiero reportar" → CREAR_REPORTE
        - "ver mis reportes" → MIS_REPORTES
        """
        
        msg_lower = message.lower().strip()
        msg_original = message.strip()
        
        # ============================================================
        # PASO 1: ANÁLISIS LOCAL EXHAUSTIVO (sin LLM)
        # Prioridad: crear_reporte tiene precedencia sobre mis_reportes
        # ============================================================
        
        # ---------------------------------------------------------
        # GRUPO A: PALABRAS CLAVE DE CREAR REPORTE (ALTA PRIORIDAD)
        # Si alguna de estas está presente, es CREAR_REPORTE
        # ---------------------------------------------------------
        
        crear_reporte_keywords_alta = [
            # Formas directas de reportar
            "reportar", "denunciar", "crear reporte", "nuevo reporte", "hacer reporte",
            "quiero reportar", "necesito reportar", "vengo a reportar", "traigo un reporte",
            "tengo un reporte", "tengo una denuncia", "quiero denunciar", "vengo a denunciar",
            "cómo reporto", "como reporto", "reportar algo",
            
            # Accidentes y colisiones
            "accidente", "choc", "colisión", "colision", "impacto",
            "carambola", "volcada", "volcó", "se estrelló", "se impacto",
            "nos chocamos", "me chocaron", "se chocaron", "chocaron",
            "me crashearon", "crashear", "crashearon",
            "atropello", "atropelló", "arrolló",
            
            # Estacionamiento indebido
            "mal parque", "mal estacionado", "bloqueando", "bloquea",
            "estacionado en zona", "parado en lugar indebido", "aparcado mal",
            "obstruye", "obstruyendo", "estaciona mal",
            
            # Semáforos y señales
            "semáforo dañado", "semáforo descompuesto", "luz descompuesta",
            "semáforo en rojo", "luz roja prendida",
            
            # Conducción peligrosa (presente continuo)
            "conduciendo mal", "manejando mal", "pilotando mal",
            "exceso de velocidad", "conduce rápido", "manejando rápido",
            "carril incorrecto", "contravía", "contra mano",
            "zigzagueando", "drift", "adelantando mal",
            
            # Formas coloquiales de reportar algo que está pasando
            "hay un", "hay una", "vi un", "vi una", "veo un", "veo una",
            "hay alguien que", "alguien que",
            "me encontraron", "encontre", "encontré", "encontre un",
            "aquí pasa", "aquí hay", "aquí está", "aquí esta",
            "en esta calle", "en esta vía", "en esta esquina", "en esta zona",
            "frente a mi", "al lado de mi", "cerca de mi",
            "me acaban de", "acabaron de",
            
            # Incidentes específicos
            "incidente", "infracción", "infraccion", "falta",
            "violación", "violacion", "ilegal", "peligroso", "riesgoso",
            
            # Preguntas sobre cómo reportar
            "donde reporto", "dónde reporto", "como reporto", "cómo reporto",
            "donde puedo reportar", "dónde puedo reportar",
            "quiero hacer un reporte", "necesito hacer un reporte",
            "quiero poner una denuncia", "necesito denunciar",
        ]
        
        # Verificar keywords de ALTA prioridad para crear_reporte
        for keyword in crear_reporte_keywords_alta:
            if keyword in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (keyword alta: '{keyword}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # ============================================================
        # CREAR REPORTE - AÑADIR MÁS VARIACIONES COLOQUIALES
        # ============================================================
        
        # Más variaciones coloquiales para reportar
        crear_reporte_coloquial = [
            "hay un", "hay una", "hay alguien", "hay algo", "hay algo pasando",
            "vi un", "vi una", "vi que", "vi algo", "veo un", "veo una", "veo que",
            "encontre", "encontré", "hallé", "hallé un", "hallé una",
            "aquí pasa", "aquí hay", "aquí está", "aquí esta", "aquí ocurre",
            "en esta calle", "en esta vía", "en esta zona", "en esta esquina",
            "en la calle", "en la via", "en la zona", "en la esquina",
            "frente a", "al lado de", "cerca de", "aqui esta", "aqui hay",
            "me acabam", "acabam de", "acabó de", "acaba de",
            # Expresiones comunes
            "ya no se qué hace", "hace falta un agente", "necesito ayuda",
            "esto no es normal", "algo anda mal", "algo no está bien",
            "están mal", "estan mal", "hacen mal", "hacen caso",
            # Keywords adicionales
            "cayó", "cayó un", "cayó una", "se cayó", "se caio",
            "quemó", "se quemó", "incendio", "fuego",
            "ruido", "molestia", "contaminación", "basura",
            "obstrucción", "obstruccion", "atascado", "atascada",
            "no pasa", "no puede pasar", "trancado", "trancada",
            # Tipos de problemas adicionales
            "dañado", "dañada", "roto", "rota", "quebrado", "quebrada",
            "sin luz", "sin agua", "sin servicio",
            # Preguntas
            "a quién报告o", "a quién Reporto", "como Reporto", "cómo Reporto",
            "donde Reporto", "dónde Reporto", "quien Reporta", "quién Reporta"
        ]
        
        for keyword in crear_reporte_coloquial:
            if keyword in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (coloquial: '{keyword}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # ---------------------------------------------------------
        # GRUPO B: MIS REPORTES (solo si NO hay intención de reportar)
        # ---------------------------------------------------------
        
        # Verbos y frases que claramente indican VER reportes existentes
        ver_reportes_keywords = [
            "ver reportes", "mostrar reportes", "consultar reportes",
            "ver mis reportes", "mostrar mis reportes", "mis reportes",
            "quiero ver mis reportes", "muéstrame mis reportes", "dame mis reportes",
            "donde veo mis reportes", "acceder a mis reportes", "ver mis reportes",
            "consultar mis reportes", "mostrar mis reportes",
            "cómo van mis reportes", "qué pasó con mis reportes",
            "estado de mis reportes", "mis reportes están",
            
            # Historial y búsqueda
            "historial", "mis reportes que he", "mis reportes enviados",
            "tengo reportes", "mis cosas reportadas",
            # Nuevas variations
            "dame el historial", "muéstrame el historial", "ver historial",
            "mis reportes anteriores", "reportes anteriores", "mis old reportes",
            "los reportes que envié", "los reportes que mandé", "mis reportes mandaos",
            "como van", "cómo van", "qué tal van", "que tal van",
            "status de mis reportes", "estado de reportes", "qué pasó",
            "qué fue de", "que fue de", "qué se hizo de", "que se hizo de"
        ]
        
        # Verificar si es MIS_REPORTES (sin intención de reportar nuevo)
        for keyword in ver_reportes_keywords:
            if keyword in msg_lower:
                # Doble verificación: si tiene "reportar" también, dar prioridad a crear_reporte
                if "reportar" not in msg_lower and "denunciar" not in msg_lower:
                    logger.info(f"Citizen tool: mis_reportes (keyword: '{keyword}')")
                    return {"tool": "mis_reportes", "params": {}}
        
        # ---------------------------------------------------------
        # GRUPO C: ESTADÍSTICAS
        # ---------------------------------------------------------
        
        estadisticas_keywords = [
            "estadísticas", "métricas", "resumen", "resumen de mis reportes",
            "cuenta de reportes", "cuenta de mis reportes",
            "total de reportes", "números de reportes",
            "cuántos reportes tengo", "cuantas reportes tengo",
            "reporte de estadísticas", "reporte de estadísticas",
            "métricas de mis reportes", "estadísticas de",
        ]
        
        for keyword in estadisticas_keywords:
            if keyword in msg_lower:
                logger.info(f"Citizen tool: estadisticas_mis_reportes (keyword: '{keyword}')")
                return {"tool": "estadisticas_mis_reportes", "params": {}}
        
        # ---------------------------------------------------------
        # PASO 2: DETECCIÓN POR CONTEXTO (patterns especiales)
        # ---------------------------------------------------------
        
        # Pattern: "reportar" + cualquier cosa después = CREAR_REPORTE
        # "reportar un accidente", "reportar que alguien", etc.
        if msg_lower.startswith("reportar") or "reportar " in msg_lower:
            logger.info("Citizen tool: crear_reporte (pattern: reportar + contexto)")
            return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "denunciar" + cualquier cosa = CREAR_REPORTE
        if "denunciar" in msg_lower:
            logger.info("Citizen tool: crear_reporte (pattern: denunciar)")
            return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "accidente" en cualquier parte = CREAR_REPORTE
        if "accidente" in msg_lower:
            logger.info("Citizen tool: crear_reporte (pattern: accidente)")
            return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "incidente" = CREAR_REPORTE
        if "incidente" in msg_lower:
            logger.info("Citizen tool: crear_reporte (pattern: incidente)")
            return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "vi" o "veo" + algo relacionado = CREAR_REPORTE
        vi_patterns = ["vi un", "vi una", "vi que", "veo un", "veo una", "veo que", "vi alguien"]
        for pattern in vi_patterns:
            if pattern in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (pattern: '{pattern}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "hay" + algo = CREAR_REPORTE (hay un accidente, hay un carro mal estacionado)
        hay_patterns = ["hay un", "hay una", "hay alguien", "hay algo"]
        for pattern in hay_patterns:
            if pattern in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (pattern: '{pattern}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "en esta" + calle/vía/zona = CREAR_REPORTE
        ubicacion_patterns = ["en esta calle", "en esta vía", "en esta zona", "en esta esquina", 
                             "frente a", "al lado de", "cerca de aquí"]
        for pattern in ubicacion_patterns:
            if pattern in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (pattern: '{pattern}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: preguntas sobre cómo/dónde reportar = CREAR_REPORTE
        donde_patterns = ["donde puedo", "dónde puedo", "como reporto", "cómo reporto",
                         "como hago para reportar", "cómo hago para reportar",
                         "necesito reportar", "quiero reportar"]
        for pattern in donde_patterns:
            if pattern in msg_lower:
                logger.info(f"Citizen tool: crear_reporte (pattern: '{pattern}')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Pattern: "mis reportes" solo = MIS_REPORTES
        if "mis reportes" in msg_lower or "mis reporte" in msg_lower:
            logger.info("Citizen tool: mis_reportes (pattern: mis reportes)")
            return {"tool": "mis_reportes", "params": {}}
        
        # ---------------------------------------------------------
        # PASO 3: SALUDOS Y CONVERSACIÓN GENERAL
        # ---------------------------------------------------------
        
        saludos = ["hola", "buenos días", "buenas tardes", "buenas noches", "qué tal", 
                   "cómo estás", "como estás", "buen día", "buenas"]
        
        # Si es solo un saludo, no hacer nada
        if msg_lower in saludos or msg_lower.startswith("hola") and len(msg_lower) < 20:
            logger.info("Citizen tool: NONE (saludo)")
            return {"tool": "NONE", "params": {}}
        
        # ---------------------------------------------------------
        # PASO 4: LLM COMO ÚLTIMO RECURSO (casos ambiguos)
        # ---------------------------------------------------------
        
        prompt = f"""
Eres un router de herramientas para ciudadanos. Tu trabajo es entender QUÉ QUIERE el usuario.

MENSAJE DEL CIUDADANO: "{message}"

REGLAS DE PRIORIDAD:
1. Si el usuario quiere REPORTAR algo que pasó o vio → crear_reporte
2. Si el usuario quiere VER sus reportes anteriores → mis_reportes
3. Si el usuario quiere ESTADÍSTICAS de sus reportes → estadisticas_mis_reportes
4. Si es solo un saludo o conversación general → NONE

PALABRAS CLAVE QUE INDICAN CREAR_REPORTE:
- reportar, denunciar, crear reporte, quiero reportar, necesito reportar
- accidente, choque, incidente, atropello
- mal estacionado, bloqueando, semáforo dañado
- vi un, veo un, hay un, hay una, me chocaron
- donde reporto, cómo reporto

PALABRAS CLAVE QUE INDICAN MIS_REPORTES:
- ver mis reportes, mostrar mis reportes, quiero ver mis reportes
- historial de reportes, cuántos reportes tengo
- estado de mis reportes, cómo van mis reportes

EJEMPLOS:
- "hola" -> NONE
- "hay un accidente en la vía" -> crear_reporte
- "me crashearon" -> crear_reporte
- "quiero reportar un accidente" -> crear_reporte
- "donde puedo reportar un incidente?" -> crear_reporte
- "reportar incidente" -> crear_reporte
- "quiero ver mis reportes" -> mis_reportes
- "cómo van mis reportes?" -> mis_reportes

Responde SOLO JSON válido:
{{"tool":"nombre_de_la_herramienta","params":{{}}}}
"""
        try:
            decision = self.llm_service.generate_response(
                message=prompt,
                history=[],
                role="CIUDADANO"
            )

            match = re.search(r"\{[\s\S]*?\}", decision)

            if match:
                data = json.loads(match.group())

                if isinstance(data, dict) and "tool" in data:
                    tool = data.get("tool", "NONE")
                    
                    # VALIDACIÓN POST-LLM: Verificar consistencia
                    # Si el LLM devolvió mis_reportes pero el mensaje tiene keywords de crear_reporte
                    if tool == "mis_reportes":
                        for keyword in crear_reporte_keywords_alta:
                            if keyword in msg_lower:
                                logger.info(f"Fix LLM: Cambiando de mis_reportes a crear_reporte (keyword: '{keyword}')")
                                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
                    
                    logger.info(f"Citizen tool (LLM): {tool}")
                    return data

        except Exception as e:
            logger.warning(f"Citizen tool router LLM failed: {str(e)}")

        # ============================================================
        # PASO 5: ÚLTIMO FALLBACK (muy conservador)
        # Solo usar mis_reportes si contiene "reporte" pero no intención clara
        # ============================================================
        
        if "reporte" in msg_lower or "reportes" in msg_lower:
            # Verificar si es más probable crear o ver
            if any(w in msg_lower for w in ["ver", "mostrar", "consultar", "dame", "muéstrame", "quiero saber"]):
                logger.info("Citizen tool fallback: mis_reportes")
                return {"tool": "mis_reportes", "params": {}}
            else:
                # Default: si dice "reporte" sin contexto de ver, asumir crear
                logger.info("Citizen tool fallback: crear_reporte (default con 'reporte')")
                return {"tool": "crear_reporte", "params": {"mensaje": msg_original}}
        
        # Si nada coincide, es NONE
        logger.info("Citizen tool: NONE (no match)")
        return {"tool": "NONE", "params": {}}

    # ---------------------------------------------------------
    # EJECUTAR TOOLS ADMIN
    # ---------------------------------------------------------

    async def _execute_admin_tool(self, tool_name: str, params: Dict):

        if tool_name not in self.admin_tools:
            return None

        logger.info(
            f"Tool execution | tool={tool_name} | params={params}"
        )

        tool = self.admin_tools[tool_name]

        try:

            if inspect.iscoroutinefunction(tool):

                if params:
                    return await tool(**params)
                else:
                    return await tool()

            else:

                if params:
                    return tool(**params)
                else:
                    return tool()

        except Exception as e:
            logger.exception(f"Tool execution error: {str(e)}")
            return {"error": str(e)}

    # ---------------------------------------------------------
    # FASE 3: FORMATEAR RESPUESTA AMIGABLE DE TOOLS
    # Convierte las respuestas crudas de las tools en texto legible
    # ---------------------------------------------------------

    def _is_tabular_data(self, data) -> bool:
        """
        Detecta si los datos pueden mostrarse en formato tabla.
        Retorna True si es una lista de dicts o un dict con listas.
        """
        if isinstance(data, list):
            # Lista de diccionarios = datos tabulables
            return len(data) > 0 and isinstance(data[0], dict)
        
        if isinstance(data, dict):
            # Dict con al menos una lista de diccionarios
            for value in data.values():
                if isinstance(value, list) and len(value) > 0:
                    if isinstance(value[0], dict):
                        return True
            # Dict simple (sin listas) = no es tabular
            return False
        
        return False

    def _format_tool_response(self, tool_name: str, result) -> str:
        """Formatea la respuesta de la tool para que sea amigable."""
        
        if not result:
            return "No se pudo obtener información."
        
        # Si ya es un string (ya formateado), devolverlo
        if isinstance(result, str):
            return result
        
        # Si es una lista vacía, mostrar mensaje según el tipo de consulta
        if isinstance(result, list) and len(result) == 0:
            return self._get_empty_message(tool_name)
        
        # Si es un dict o list con datos tabulables, convertir a HTML automáticamente
        if isinstance(result, (dict, list)):
            # Verificar si tiene datos que se pueden mostrar en tabla
            if self._is_tabular_data(result):
                # Mapeo de nombres de columnas para ciudadano
                column_mapping = {}
                if tool_name == "mis_reportes":
                    column_mapping = {
                        "tipo_infraccion": "Tipo",
                        "descripcion": "Descripción",
                        "direccion": "Dirección",
                        "estado": "Estado",
                        "fecha_incidente": "Fecha",
                        "hora_incidente": "Hora"
                    }
                elif tool_name == "estadisticas_mis_reportes":
                    column_mapping = {
                        "total_reportes": "Total",
                        "resueltos_ultimos_30_dias": "Resueltos (30 días)"
                    }
                
                return to_html_table(result, titulo=tool_name, column_mapping=column_mapping if column_mapping else None)
        
        # Si es un dict, formatear según la tool
        if isinstance(result, dict):
            
            # CORRECCIÓN 2: Mejor manejo de errores de las tools
            # Si el resultado tiene la clave "error" (del except en _execute_admin_tool)
            if "error" in result:
                return f"⚠️ Error al procesar tu solicitud: {result.get('error')}. Verifica que las tablas existan en la base de datos."
            
            # Estado missing data
            if result.get("status") == "missing_data":
                return result.get("message", "Faltan datos para completar la acción.")
            
            # Éxito
            if result.get("status") == "success":
                return result.get("message", "Acción completada.")
            
            # Verificar si tiene datos tabulables (listas de dicts)
            if self._is_tabular_data(result):
                return to_html_table(result, titulo=tool_name)
            
            # Para listados (agentes, tareas, reportes) - si no son tabulares
            if tool_name == "obtener_agentes":
                agentes = result.get("agentes", [])
                if not agentes:
                    return "No hay agentes disponibles actualmente."
                # Ya se procesó arriba como tabla, pero por seguridad:
                return to_html_table({"agentes": agentes}, titulo="agentes")
            
            if tool_name == "obtener_tareas":
                tareas_dia = result.get("tareas_del_dia", [])
                tareas_pend = result.get("tareas_pendientes", [])
                
                if not tareas_dia and not tareas_pend:
                    return "No hay tareas registradas actualmente."
                
                # Ya se procesó arriba como tabla, pero por seguridad:
                return to_html_table(result, titulo="tareas")
            
            if tool_name == "reportes_del_dia":
                return f"Hoy se han generado {result.get('total', 0)} reportes."
            
            if tool_name == "reportes_por_estado":
                return f"Reportes por estado: {result}"
            
            if tool_name == "estadisticas_reportes":
                return f"Estadísticas de reportes: {result}"
            
            if tool_name == "system_overview":
                if "analysis" in result:
                    return result.get("analysis", "Resumen del sistema obtenido.")
                return str(result)
            
            # Para agenda - si ya tiene mensaje de éxito o recolectando datos
            if tool_name == "agendar_reunion":
                if result.get("status") == "success":
                    evento = result.get("evento", {})
                    return f"✅ Reunión agendada correctamente:\n\n📅 {evento.get('title')}\n🕐 Fecha: {evento.get('date')} a las {evento.get('time')}\n⏱️ Duración: {evento.get('duration')} minutos"
                # FIX: Manejar status collecting (recolectando datos) y draft (mostrar borrador)
                if result.get("status") in ["collecting", "draft"]:
                    return result.get("message", "Continuando con el agendamiento...")
                return str(result)
            
            # Manejo de generación de PDF
            if tool_name == "generar_reporte_estadisticas_pdf":
                if result.get("status") == "success":
                    file_path = result.get("file", "")
                    # Extraer nombre del archivo para mostrar
                    file_name = os.path.basename(file_path) if file_path else "reporte.pdf"
                    return f"✅ Reporte PDF generado correctamente.\n\n📄 Archivo: {file_name}\n📁 Ubicación: {file_path}\n\nEl archivo está listo para descargar."
                if result.get("status") == "error":
                    return f"⚠️ Error al generar el PDF: {result.get('message', 'Error desconocido')}"
                return str(result)
        
        # Default: convertir a string
        return str(result)

    def _get_empty_message(self, tool_name: str) -> str:
        """Retorna mensaje apropiado cuando no hay datos para una tool específica."""
        empty_messages = {
            "reportes_del_dia": "No hay reportes hoy.",
            "reportes_por_estado": "No hay reportes con ese estado.",
            "estadisticas_reportes": "No hay estadísticas disponibles.",
            "obtener_agentes": "No hay agentes disponibles.",
            "obtener_tareas": "No hay tareas registradas.",
            "mis_tareas": "No tienes tareas asignadas.",
            "mis_tareas_pendientes": "No tienes tareas pendientes.",
            "mis_tareas_en_proceso": "No tienes tareas en proceso.",
            "mis_tareas_completadas": "No tienes tareas completadas.",
            "reportes_pendientes": "No hay reportes pendientes.",
            "mis_validaciones": "No has realizado validaciones.",
            "mis_estadisticas": "No hay estadísticas disponibles.",
            "mis_reportes": "No has realizado reportes.",
            "estadisticas_mis_reportes": "No hay estadísticas de tus reportes.",
        }
        
        msg = empty_messages.get(tool_name, "No hay datos disponibles.")
        
        # Agregar mensaje de seguimiento
        return f"{msg}\n\n¿Deseas hacer otra consulta o necesitas ayuda con algo más?"


    # ---------------------------------------------------------
    # EJECUTAR TOOLS AGENTE
    # ---------------------------------------------------------
    async def _execute_agent_tool(self, tool_name: str, user_id: int):

        if tool_name not in self.agent_tools:
            return None

        tool = self.agent_tools.get(tool_name)

        try:

            if inspect.iscoroutinefunction(tool):
                return await tool(user_id)

            return tool(user_id)

        except Exception as e:

            logger.exception(f"Agent tool error: {str(e)}")

            return {"error": str(e)}


    # ---------------------------------------------------------
    # EJECUTAR TOOLS CIUDADANO
    # ---------------------------------------------------------
    async def _execute_citizen_tool(self, tool_name: str, params: dict, user_id: int):

        if tool_name not in self.citizen_tools:
            return None

        tool = self.citizen_tools.get(tool_name)

        if not tool:
            return {"error": "Tool no encontrada"}

        try:

            if tool_name == "crear_reporte":
                mensaje = params.get("mensaje") or ""
                datos_previos = params.get("datos_previos") or None
                return await tool(user_id, mensaje, datos_previos)

            return await tool(user_id)

        except Exception as e:

            logger.exception(f"Citizen tool error: {str(e)}")

            return {"error": str(e)}

    # ---------------------------------------------------------
    # PROCESADOR PRINCIPAL
    # ---------------------------------------------------------

    async def process(
        self,
        user,
        message: str,
        conversation_id: Optional[int] = None
    ) -> Dict[str, Any]:

        if user is None:

            logger.error("Usuario None")

            return {
                "id_conversacion": conversation_id,
                "response": "Error interno: usuario no válido."
            }

        if not hasattr(user, "id") or not hasattr(user, "role"):

            logger.error("Usuario mal formado")

            return {
                "id_conversacion": conversation_id,
                "response": "Error interno."
            }

        role = user.role.upper()

        logger.info(f"Usuario {user.id} ({role}) dijo: {message}")

        if not self.permissions.is_role_allowed(role):

            logger.warning(f"Rol no autorizado: {role}")

            return {
                "id_conversacion": conversation_id,
                "response": "Rol no autorizado."
            }

        try:

            # ---------------------------------------------------------
            # 1️⃣ BORRADOR ACTIVO
            # ---------------------------------------------------------

            if user.id in Brain.email_drafts:

                draft = Brain.email_drafts[user.id]

                action = self._detect_email_action(message)

                logger.info(f"Acción detectada: {action}")

                if action == "SEND_EMAIL":

                    try:

                        result = send_email(
                            to=draft["to"],
                            subject=draft["subject"],
                            content=draft["message"]
                        )

                        logger.info(f"Resultado envío: {result}")

                        del Brain.email_drafts[user.id]

                        response = f"""
Correo enviado correctamente.

Destinatario: {draft['to']}
Asunto: {draft['subject']}

¿Necesitas enviar otro correo?
"""

                        return self._send_via_chat_service(
                            user,
                            message,
                            response,
                            conversation_id
                        )

                    except Exception:

                        logger.exception("Error enviando correo")

                        return self._send_via_chat_service(
                            user,
                            message,
                            "Hubo un error enviando el correo.",
                            conversation_id
                        )

                if action == "CANCEL":

                    del Brain.email_drafts[user.id]

                    response = "Borrador cancelado."

                    return self._send_via_chat_service(
                        user,
                        message,
                        response,
                        conversation_id
                    )

                modify_prompt = f"""
Tenemos este correo:

Asunto:
{draft["subject"]}

Mensaje:
{draft["message"]}

El usuario pidió:
"{message}"

Actualiza el correo.

Devuelve JSON:

{{
"subject": "...",
"message": "..."
}}
"""

                llm_response = self.llm_service.generate_response(
                    message=modify_prompt,
                    history=[],
                    role=role
                )

                match = re.search(r"\{[\s\S]*?\}", llm_response)

                if match:

                    data = json.loads(match.group())

                    draft["subject"] = data.get("subject", draft["subject"])
                    draft["message"] = data.get("message", draft["message"])

                preview = f"""
Borrador actualizado.

Para: {draft["to"]}
Asunto: {draft["subject"]}

{draft["message"]}

¿Deseas enviarlo?
"""

                return self._send_via_chat_service(
                    user,
                    message,
                    preview,
                    conversation_id
                )

            # ---------------------------------------------------------
            # 2️⃣ NUEVO CORREO
            # ---------------------------------------------------------

            email_intent = detect_email_request(message)

            if email_intent:

                logger.info(f"Nueva solicitud correo -> {email_intent['to']}")

                prompt = f"""
Redacta un correo profesional basado en:

"{message}"

Devuelve JSON:

{{
"subject":"...",
"message":"..."
}}
"""

                llm_response = self.llm_service.generate_response(
                    message=prompt,
                    history=[],
                    role=role
                )

                match = re.search(r"\{[\s\S]*?\}", llm_response)

                if match:

                    data = json.loads(match.group())

                else:

                    data = {
                        "subject": "Mensaje",
                        "message": message
                    }

                Brain.email_drafts[user.id] = {
                    "to": email_intent["to"],
                    "subject": data["subject"],
                    "message": data["message"]
                }

                preview = f"""
Preparé este correo.

Para: {email_intent["to"]}
Asunto: {data["subject"]}

{data["message"]}

¿Deseas enviarlo o modificar algo?
"""

                return self._send_via_chat_service(
                    user,
                    message,
                    preview,
                    conversation_id
                )

            # ---------------------------------------------------------
            # 2B️⃣ FLUJO CONVERSACIONAL DE AGENDA
            # FIX: Manejar recolección de campos, borrador y confirmación
            # ---------------------------------------------------------
            
            if role == "ADMIN" and user.id in Brain.agenda_drafts:
                draft = Brain.agenda_drafts[user.id]
                
                response = self._procesar_flujo_agenda(user, message, draft)
                
                if response:
                    return self._send_via_chat_service(
                        user,
                        message,
                        response,
                        conversation_id
                    )

            # ---------------------------------------------------------
            # 3️⃣ FASE 1: LÓGICA NUEVA - SIEMPRE LLAMAR AL ROUTER PRIMERO
            # El sistema de intents ahora siempre intenta detectar una tool
            # antes de responder con chat normal
            # ---------------------------------------------------------

            if role == "ADMIN":

                msg = message.lower()

                # FASE 1: SIEMPRE llamar al router primero
                # El router LLM decide qué tool usar basándose en el mensaje
                decision = self._select_admin_tool(message)

                # FASE 1: Fallback con keywords solo si el router devolvió NONE
                # Esto asegura que cualquier forma de pedir algo active una tool
                if decision.get("tool") == "NONE":
                    # Palabras clave como fallback para capturar cualquier jerga
                    if any(palabra in msg for palabra in ["reunion", "reunión", "agendar", "cita", "programar"]):
                        decision = {"tool": "agendar_reunion", "params": {"mensaje_usuario": message}}
                    elif any(palabra in msg for palabra in ["tarea", "tareas", "agenda", "pendiente"]):
                        decision = {"tool": "obtener_tareas", "params": {}}
                    elif any(palabra in msg for palabra in ["agente", "agentes", "agente de"]):
                        decision = {"tool": "obtener_agentes", "params": {}}
                    elif any(palabra in msg for palabra in ["reporte", "reportes", "reporte del día", "reportes de hoy"]):
                        if "hoy" in msg or "día" in msg:
                            decision = {"tool": "reportes_del_dia", "params": {}}
                        elif "pendiente" in msg:
                            decision = {"tool": "reportes_por_estado", "params": {"estado": "pendiente"}}
                        elif "aprobado" in msg:
                            decision = {"tool": "reportes_por_estado", "params": {"estado": "aprobado"}}
                        elif "rechazado" in msg:
                            decision = {"tool": "reportes_por_estado", "params": {"estado": "rechazado"}}
                        else:
                            decision = {"tool": "estadisticas_reportes", "params": {}}
                    elif any(palabra in msg for palabra in ["resumen", "overview", "sistema", "estado del sistema"]):
                        decision = {"tool": "system_overview", "params": {}}
                    elif any(palabra in msg for palabra in ["pdf", "descargar", "generar reporte"]):
                        decision = {"tool": "generar_reporte_estadisticas_pdf", "params": {}}

                tool_name = decision.get("tool", "NONE")
                params = decision.get("params", {})

                if not isinstance(params, dict):
                    params = {}

                # FASE 3: Fallback mejorado en ejecución de tools
                # FIX: Si el LLM devolvió una tool incorrecta pero hay palabras claras de reunión
                # corregir antes de ejecutar
                if tool_name != "NONE":
                    msg_lower = message.lower()
                    # Si hay palabras claras de reunión Y la tool NO es agendar_reunion
                    if any(p in msg_lower for p in ["reunion", "reunión", "agendar", "cita", "programar", "agéndame", "agenda esto", "agenda eso"]):
                        if tool_name != "agendar_reunion":
                            logger.info(f"Fix: Corrigiendo tool de {tool_name} a agendar_reunion")
                            tool_name = "agendar_reunion"
                            params = {"mensaje_usuario": message, "user_id": user.id}

                # FIX: Pasar user_id a agenda_tool para flujo conversacional
                if tool_name == "agendar_reunion" and "user_id" not in params:
                    params["user_id"] = user.id

                # FASE 3: Fallback mejorado en ejecución de tools
                # Si la tool falla, reintentar con el mensaje original
                if tool_name != "NONE" and tool_name in self.admin_tools:

                    # Primer intento de ejecución
                    result = await self._execute_admin_tool(tool_name, params)

                    # FASE 3: Si falló por falta de datos, reintentar pasando mensaje original
                    # CORRECCIÓN 1: Verificar que result sea un dict antes de acceder a "status"
                    # El bug anterior era: str(result).get("status") - fallaba si result era string
                    if isinstance(result, dict) and result.get("status") and ("missing" in result.get("status", "").lower() or "error" in result.get("status", "").lower()):
                            # Reintentar con mensaje original para tools que lo necesiten
                            if tool_name == "agendar_reunion":
                                result = await self._execute_admin_tool(
                                    tool_name, 
                                    {"mensaje_usuario": message, "user_id": user.id}
                                )

                    # FASE 3: Formatear respuesta amigable para el usuario
                    response_text = self._format_tool_response(tool_name, result)
                    
                    # AGREGAR RECOMENDACIONES DESPUES DE TOOL
                    response_text = self._add_contextual_recommendations(
                        response_text, role, user.id, message
                    )

                    return self._send_via_chat_service(
                        user,
                        message,
                        response_text,
                        conversation_id
                    )

                # FLUJO NORMAL CON CONTEXTO DE EMBEDDINGS
                embedding_context = ""
                if conversation_id:
                    embedding_context = self._get_embedding_context(
                        conversation_id, message, top_k=3
                    )
                
                response = self.chat_service.handle_admin(
                    user=user,
                    message=message,
                    id_conversacion=conversation_id,
                    embedding_context=embedding_context if embedding_context else None
                )
                
                # AGREGAR RECOMENDACIONES AL RESPONSE
                if isinstance(response, dict) and "response" in response:
                    response["response"] = self._add_contextual_recommendations(
                        response["response"], role, user.id, message
                    )
                
                return response

            if role == "CIUDADANO":

                # ===================== NUEVO: FLUJO DE REPORTE CON UBICACIÓN =====================
                Brain.report_drafts = getattr(Brain, 'report_drafts', {})
                
                # VERIFICAR SI HAY UN BORRADOR DE REPORTE ACTIVO
                if user.id in Brain.report_drafts:
                    draft = Brain.report_drafts[user.id]
                    
                    # DETECTAR CAMBIO DE TEMA - Si el usuario pregunta algo diferente
                    msg_lower = message.lower().strip()
                    preguntas_cambio = ["hola", "hi", "hey", "buenos", "quiere", "como", "cual", "que es", "que significa", "dime", "habla", "cuenta", "norma", "ley", "señal", "regla", "que pasa", "por que", "ayuda", "gracias", "ok", "entiendo", "cambiar", "otro tema", "olvida", "déjalo", "dejalo", "cambie", "cambiar", "ver mi perfil", "mi perfil", "mis reportes", "mis datos"]
                    respuestas_si = ["si", "sí", "si!", "sí!", "dale", "ok", "ok!", "perfecto", "confirmo", "autorizo", "si claro", "claro que sí", "adelante", "si dale", "si gracias", "sí gracias", "yes", "yea", "yeah", "yep"]
                    
# Si no es una respuesta esperada para el flujo de reporte Y parece ser cambio de tema
                    es_cambio = any(pal in msg_lower for pal in preguntas_cambio)
                    es_respuesta_valida = any(kw in msg_lower for kw in ["1", "2", "3", "4", "5", "accidente", "estacionamiento", "semaforo", "conduccion", "vehículo", "mal estacionado", "tipo", "opcion", "si ", "sí ", "si,", "sí,"]) and draft.get("estado") not in ["PENDIENTE_UBICACION"]

                    if es_cambio and not es_respuesta_valida:
                        # CANCELAR DRAFT Y CONTINUAR CON PREGUNTA NORMAL
                        logger.info(f"[CONTEXTO] Cambio de tema detectado. Cancelando draft de reporte.")
                        del Brain.report_drafts[user.id]
                    elif draft.get("estado") == "PENDIENTE_UBICACION":
                        msg_lower = message.lower()
                        respuestas_si = ["si", "sí", "si!", "sí!", "dale", "ok", "ok!", "perfecto", "confirmo", "autorizo", "si claro", "claro que sí", "adelante", "si dale", "si gracias", "sí gracias"]
                        respuestas_cancel = ["cancelar", "cancelo", "olvida", "déjalo", "dejalo", "parar", "stop", "quiero cancelar", "cancela"]
                        es_si = any(resp in msg_lower for resp in respuestas_si)
                        es_no = any(resp in msg_lower for resp in respuestas_cancel)
                        if es_no:
                            del Brain.report_drafts[user.id]
                            return self._send_via_chat_service(user, message, "Entendido, cancelé el reporte. ¿Hay algo más en lo que pueda ayudarte?", conversation_id)
                        if es_si:
                            Brain.report_drafts[user.id] = {"estado": "RECOLECTANDO_TIPO", "tipo_infraccion": "otro", "descripcion": "", "direccion": "", "latitud": 0.0, "longitud": 0.0, "user_id": user.id}
                            tipos_opciones = "📋 Tipos de incidente disponibles:\n\n1️⃣ Accidente de tránsito\n2️⃣ Vehículo mal estacionado\n3️⃣ Semáforo dañado\n4️⃣ Conducción peligrosa\n5️⃣ Otro (especificar)\n\n¿Cuál es el tipo de incidente? (Responde con el número o el nombre)"
                            return self._send_via_chat_service(user, message, tipos_opciones, conversation_id)
                        return self._send_via_chat_service(user, message, "No entendí tu respuesta. ¿Me das permiso para obtener tu ubicación?\n\nResponde 'sí' para continuar o 'no' para cancelar.", conversation_id)
                    
# SI EL ESTADO ES RECOLECTANDO TIPO DE INFRACCIÓN
                    if draft.get("estado") == "RECOLECTANDO_TIPO":
                        msg_lower = message.lower().strip()
                        
                        # DETECTAR CAMBIO DE TEMA O PREGUNTA GENERAL
                        preguntas_cambio = ["hola", "hi", "hey", "buenos", "quiere", "como", "cual", "que es", "que significa", "dime", "habla", "cuenta", "norma", "ley", "señal", "regla", "que pasa", "por que", "ayuda", "gracias", "ok", "entiendo", "cambiar", "otro", "ver mi perfil", "mi perfil", "mis reportes", "sabes", "quiero saber", "necesito"]
                        es_cambio = any(pal in msg_lower for pal in preguntas_cambio)
                        es_respuesta_reporte = any(kw in msg_lower for kw in ["1", "2", "3", "4", "5", "accidente", "estacionamiento", "semaforo", "conduccion", "vehículo", "mal estacionado", "tipo", "opcion"])
                        
                        if es_cambio and not es_respuesta_reporte:
                            # CANCELAR DRAFT Y CONTINAR CON PREGUNTA NORMAL
                            del Brain.report_drafts[user.id]
                        else:
                            # SOLO cancelar con palabras explícitas de cancelación
                            respuestas_cancel = ["cancelar", "cancelo", "olvida", "déjalo", "dejalo", "parar", "stop", "quiero cancelar", "cancela"]
                            if any(resp in msg_lower for resp in respuestas_cancel):
                                del Brain.report_drafts[user.id]
                                return self._send_via_chat_service(user, message, "Entendido, cancelé el reporte. ¿Hay algo más en lo que pueda ayudarte?", conversation_id)
                            
                            # PARSEAR EL TIPO DE INFRACCIÓN
                            tipo_infraccion = self._parsear_tipo_infraccion(message)
                            
                            # PARSEAR EL TIPO DE INFRACCIÓN
                            tipo_infraccion = self._parsear_tipo_infraccion(message)
                        
                        if tipo_infraccion:
                            # GUARDAR EL TIPO Y PEDIR DESCRIPCIÓN
                            draft["tipo_infraccion"] = tipo_infraccion
                            draft["estado"] = "RECOLECTANDO_DATOS"
                            
                            tipo_formato = self._formatear_tipo_reporte(tipo_infraccion)
                            
                            return self._send_via_chat_service(
                                user,
                                message,
                                f"✅ Tipo: {tipo_formato}\n\n📝 Ahora cuéntame, ¿qué fue lo que pasó?\n\nPor ejemplo: 'un carro chocó a una moto', 'vehículo mal estacionado bloqueando la vía', 'conductor manejando en sentido contrario'",
                                conversation_id
                            )
                        else:
                            # NO ENTENDIÓ EL TIPO
                            tipos_opciones = """❌ No entendí el tipo de incidente.

📋 Tipos disponibles:
1️⃣ Accidente de tránsito
2️⃣ Vehículo mal estacionado
3️⃣ Semáforo dañado
4️⃣ Conducción peligrosa
5️⃣ Otro (especificar)

¿Cuál es el tipo de incidente? (Responde con el número o el nombre)"""
                            
                            return self._send_via_chat_service(
                                user,
                                message,
                                tipos_opciones,
                                conversation_id
                            )
                    
                    # SI EL ESTADO ES RECOLECTANDO DATOS (DESCRIPCIÓN)
                    if draft.get("estado") == "RECOLECTANDO_DATOS":
                        msg_lower = message.lower().strip()
                        
                        # DETECTAR CAMBIO DE TEMA O PREGUNTA GENERAL
                        preguntas_cambio = ["hola", "hi", "hey", "buenos", "quiere", "como", "cual", "que es", "que significa", "dime", "habla", "cuenta", "norma", "ley", "señal", "regla", "que pasa", "por que", "ayuda", "gracias", "ok", "entiendo", "cambiar", "otro", "ver mi perfil", "mi perfil", "mis reportes", "sabes", "quiero saber"]
                        es_cambio = any(pal in msg_lower for pal in preguntas_cambio)
                        
                        if es_cambio:
                            # CANCELAR DRAFT Y CONTINAR CON PREGUNTA NORMAL
                            del Brain.report_drafts[user.id]
                        else:
                            # VERIFICAR SI EL USUARIO QUIERE CANCELAR (solo con palabras explícitas)
                            respuestas_cancel = ["cancelar", "cancelo", "olvida", "déjalo", "dejalo", "parar", "stop", "quiero cancelar", "cancela"]
                        if any(resp in msg_lower for resp in respuestas_cancel):
                            del Brain.report_drafts[user.id]
                            return self._send_via_chat_service(
                                user,
                                message,
                                "Entendido, cancelé el reporte. ¿Hay algo más en lo que pueda ayudarte?",
                                conversation_id
                            )
                        
                        # VERIFICAR SI EL USUARIO CONFIRMA CON "SI" O SIMILARES
                        respuestas_si = ["si", "sí", "ok", "dale", "confirmo", "perfecto", "si!", "sí!", "listo", "así está", "asi esta"]
                        
                        # CAMPOS DEL DRAFT
                        descripcion_actual = draft.get("descripcion", "")
                        direccion_actual = draft.get("direccion", "")
                        placa_actual = draft.get("placa", "")
                        evidencia_actual = draft.get("evidencia", "")  # Nueva evidencia
                        
                        # NUEVO FLUJO: Paso 1 - Guardar descripción (si no la tiene)
                        if not descripcion_actual:
                            draft["descripcion"] = message.strip()
                            descripcion_actual = draft.get("descripcion", "")
                            
                            # PEDIR DIRECCIÓN
                            return self._send_via_chat_service(
                                user,
                                message,
                                f"✅ Descripción guardada: '{descripcion_actual}'\n\n📍 Ahora, ¿en qué dirección ocurrió el incidente?\n\nPuedes dar una dirección específica como 'Calle 10 #5-20' o referirte a un lugar conocido como 'cerca de mi casa', 'en el parque central', etc.",
                                conversation_id
                            )
                        
                        # Paso 2 - Guardar dirección (si no la tiene)
                        if descripcion_actual and not direccion_actual:
                            draft["direccion"] = message.strip()
                            direccion_actual = draft.get("direccion", "")
                            
                            # VERIFICAR SI REQUIERE PLACA SEGÚN EL TIPO
                            tipo_infrac = draft.get("tipo_infraccion", "")
                            requiere_placa = tipo_infrac in ["accidente", "estacionamiento"]
                            
                            if requiere_placa:
                                return self._send_via_chat_service(
                                    user,
                                    message,
                                    f"✅ Dirección guardada: '{direccion_actual}'\n\n🚗 ¿Cuál es la placa del vehículo? (opcional)\n\nIngresa la placa como ABC123 o escribe 'no tengo' si no la identificaste.",
                                    conversation_id
                                )
                            else:
                                # Si no requiere placa, ir directamente a evidencia
                                return self._send_via_chat_service(
                                    user,
                                    message,
                                    f"✅ Dirección guardada: '{direccion_actual}'\n\n📷 ¿Tienes una foto o video del incidente? (opcional)\n\nPuedes subirla desde 'Mis Reportes' después, o responder 'no' si no tienes evidencia.",
                                    conversation_id
                                )
                        
                        # Paso 3 - Guardar placa (si la requiere y no la tiene)
                        placa_actual = draft.get("placa", "")
                        tipo_infrac = draft.get("tipo_infraccion", "")
                        requiere_placa = tipo_infrac in ["accidente", "estacionamiento"]
                        
                        if requiere_placa and not placa_actual:
                            # Guardar placa o marcar como no disponible
                            if "no tengo" in msg_lower or "no la tengo" in msg_lower or "no la sé" in msg_lower:
                                draft["placa"] = "No identificada"
                            else:
                                draft["placa"] = message.strip().upper()
                            placa_actual = draft.get("placa", "")
                            
                            # PEDIR EVIDENCIA (OBLIGATORIA)
                            return self._send_via_chat_service(
                                user,
                                message,
                                f"✅ Placa guardada: {placa_actual}\n\n📸 EVIDENCIA OBLIGATORIA\n\nPor favor, necesito que meenvíes la foto del incidente.\n\nPuedes subirla aquí o si ya la tienes tomada, envíamela ahora.\n\nEl reporte NO se puede crear sin evidencia.",
                                conversation_id
                            )
                        
                        # Paso 4 - Verificar evidencia (OBLIGATORIA)
                        evidencia_actual = draft.get("evidencia", "")
                        
                        if not evidencia_actual:
                            # La evidencia es OBLIGATORIA - pedirla insistentemente
                            if len(message.strip()) > 5 and ("image" in message.lower() or "foto" in message.lower() or "archivo" in message.lower() or "adjunto" in message.lower() or "imagen" in message.lower()):
                                # El usuario parece estar enviando una imagen
                                draft["evidencia"] = "Imagen recibida"
                                evidencia_actual = "Imagen recibida"
                            else:
                                # NO permitir continuar sin evidencia
                                return self._send_via_chat_service(
                                    user,
                                    message,
                                    "📸 La evidencia es OBLIGATORIA para crear el reporte.\n\nPor favor, envíame la foto del incidente para poder continuar.\n\nEl reporte NO se puede crear sin una imagen.",
                                    conversation_id
                                )
                            
                            # MOSTRAR RESUMEN COMPLETO Y PEDIR CONFIRMACIÓN
                            tipo_formato = self._formatear_tipo_reporte(draft.get("tipo_infraccion", "otro"))
                            
                            # Construir resumen completo
                            resumen = f"""📋 Resumen del reporte:

🔸 Tipo: {tipo_formato}
🔸 Descripción: {draft.get('descripcion', '')}
🔸 Dirección: {draft.get('direccion', '')}
🔸 Placa: {draft.get('placa', 'No identificada')}
🔸 Evidencia: {evidencia_actual}

¿Estos datos son correctos? Responde 'sí' para crear el reporte o 'no' para cancelar."""
                            
                            draft["estado"] = "CONFIRMANDO"
                            return self._send_via_chat_service(
                                user,
                                message,
                                resumen,
                                conversation_id
                            )
                        
                        # Si ya tiene evidencia, mostrar confirmación
                        if draft.get("estado") == "CONFIRMANDO":
                            es_confirmado = any(resp in msg_lower for resp in respuestas_si)
                            
                            if es_confirmado:
                                # CREAR EL REPORTE
                                logger.info(f"[REPORTE] Usuario {user.id} confirmó. Creando reporte...")
                                
                                result = self.citizen_report_tool.crear_reporte_con_ubicacion(
                                    user_id=user.id,
                                    latitud=draft.get("latitud", 0.0),
                                    longitud=draft.get("longitud", 0.0),
                                    direccion=draft.get("direccion", "Dirección por confirmar"),
                                    tipo_infraccion=draft.get("tipo_infraccion", "otro"),
                                    descripcion=draft.get("descripcion", "Incidente reportado")
                                )
                                
                                del Brain.report_drafts[user.id]
                                
                                if result.get("status") == "success":
                                    return self._send_via_chat_service(
                                        user,
                                        message,
                                        result.get("message", "✅ ¡Reporte creado exitosamente! 🎉") + "\n\n📎 Puedes agregar fotos desde 'Mis Reportes' si tienes evidencia.",
                                        conversation_id
                                    )
                                else:
                                    return self._send_via_chat_service(
                                        user,
                                        message,
                                        f"❌ {result.get('message', 'Error al crear reporte')}",
                                        conversation_id
                                    )
                            else:
                                # CANCELAR
                                del Brain.report_drafts[user.id]
                                return self._send_via_chat_service(
                                    user,
                                    message,
                                    "Entendido, cancelé el reporte. ¿Hay algo más en lo que pueda ayudarte?",
                                    conversation_id
                                )
                        
                        # Si llegó aquí sin estado CONFIRMANDO, continuar flujo
                        return self._send_via_chat_service(
                            user,
                            message,
                            "Continuando con el reporte... ¿Tienes evidencia (foto/video) del incidente?",
                            conversation_id
                        )

                    # SI HAY OTRO TIPO DE BORRADOR, PROCESARLO
                    datos_previos = draft.get("datos", {})
                    conversacion = draft.get("conversacion", [])
                    conversacion.append(message)
                    conversacion_completa = " || ".join(conversacion)
                    
                    result = await self._execute_citizen_tool(
                        "crear_reporte",
                        {"mensaje": conversacion_completa, "datos_previos": datos_previos},
                        user.id
                    )
                    
                    if isinstance(result, dict):
                        if result.get("status") == "success":
                            del Brain.report_drafts[user.id]
                            response_text = result.get("message", "✅ Reporte creado exitosamente!")
                            return self._send_via_chat_service(user, message, response_text, conversation_id)
                        elif result.get("status") == "error":
                            if user.id in Brain.report_drafts:
                                del Brain.report_drafts[user.id]
                            return self._send_via_chat_service(user, message, f"❌ {result.get('message', 'Error')}", conversation_id)

                # ===================== FLUJO NORMAL: DETECTAR NUEVA INTENCIÓN =====================
                decision = self._select_citizen_tool(message)

                tool_name = decision.get("tool", "NONE")
                params = decision.get("params", {})

                if not isinstance(params, dict):
                    params = {}

                if tool_name != "NONE" and tool_name in self.citizen_tools:

                    result = await self._execute_citizen_tool(
                        tool_name,
                        params,
                        user.id
                    )

                    # 🔥 MANEJO ESPECIAL PARA CREAR REPORTE
                    if tool_name == "crear_reporte" and isinstance(result, dict):
                        
                        # NUEVO: FLUJO DE UBICACIÓN
                        if result.get("status") == "PENDIENTE_UBICACION":
                            # GUARDAR BORRADOR CON DATOS DEL REPORTE
                            Brain.report_drafts[user.id] = {
                                "estado": "PENDIENTE_UBICACION",
                                "tipo_infraccion": result.get("tipo_infraccion", "otro"),
                                "descripcion": result.get("descripcion", ""),
                                "user_id": result.get("user_id", user.id)
                            }
                            
                            return self._send_via_chat_service(
                                user,
                                message,
                                result.get("message", "📍 ¿Me das permiso para obtener tu ubicación?"),
                                conversation_id
                            )
                        
                        # FLUJO ANTERIOR: missing_data
                        if result.get("status") == "missing_data" and result.get("needs_more_info"):
                            Brain.report_drafts[user.id] = {
                                "datos": result.get("datos_actuales", {}),
                                "campos_faltantes": result.get("campos_faltantes", []),
                                "question": result.get("question", ""),
                                "conversacion": [message]
                            }
                            
                            campos = result.get("campos_faltantes", [])
                            if "direccion" in campos:
                                response_text = f"📍 Para crear tu reporte necesito la dirección. ¿En qué lugar ocurrió el incidente?"
                            elif "descripcion" in campos:
                                response_text = f"📝 ¿Podrías describirme qué pasó?"
                            else:
                                response_text = f"📝 {result.get('question', '¿Podrías darme más detalles?')}"
                            
                            return self._send_via_chat_service(
                                user,
                                message,
                                response_text,
                                conversation_id
                            )
                        
                        # SUCCESS
                        if result.get("status") == "success":
                            Brain.report_drafts = getattr(Brain, 'report_drafts', {})
                            if user.id in Brain.report_drafts:
                                del Brain.report_drafts[user.id]

                    # FORMATEO DE RESPUESTA
                    response_text = self._format_tool_response(tool_name, result)
                    response_text = self._add_contextual_recommendations(
                        response_text, role, user.id, message
                    )

                    return self._send_via_chat_service(
                        user,
                        message,
                        response_text,
                        conversation_id
                    )

                # FLUJO NORMAL CON CONTEXTO DE EMBEDDINGS
                embedding_context = ""
                if conversation_id:
                    embedding_context = self._get_embedding_context(
                        conversation_id, message, top_k=3
                    )
                
                response = self.chat_service.handle_ciudadano(
                    user=user,
                    message=message,
                    id_conversacion=conversation_id,
                    embedding_context=embedding_context if embedding_context else None
                )
                
                if isinstance(response, dict) and "response" in response:
                    response["response"] = self._add_contextual_recommendations(
                        response["response"], role, user.id, message
                    )
                
                return response

            if role == "AGENTE":

                decision = self._select_agent_tool(message)

                tool_name = decision.get("tool", "NONE")

                if tool_name != "NONE" and tool_name in self.agent_tools:

                    result = await self._execute_agent_tool(
                        tool_name,
                        user.id
                    )

                    response_text = self._format_tool_response(tool_name, result)
                    
                    # AGREGAR RECOMENDACIONES
                    response_text = self._add_contextual_recommendations(
                        response_text, role, user.id, message
                    )

                    return self._send_via_chat_service(
                        user,
                        message,
                        response_text,
                        conversation_id
                    )

                # FLUJO NORMAL CON CONTEXTO DE EMBEDDINGS
                embedding_context = ""
                if conversation_id:
                    embedding_context = self._get_embedding_context(
                        conversation_id, message, top_k=3
                    )
                
                response = self.chat_service.handle_agente(
                    user=user,
                    message=message,
                    id_conversacion=conversation_id,
                    embedding_context=embedding_context if embedding_context else None
                )
                
                # AGREGAR RECOMENDACIONES
                if isinstance(response, dict) and "response" in response:
                    response["response"] = self._add_contextual_recommendations(
                        response["response"], role, user.id, message
                    )
                
                return response

            return {
                "id_conversacion": conversation_id,
                "response": "Rol no reconocido."
            }

        except Exception as e:

            logger.exception(f"Error Brain: {str(e)}")

            return {
                "id_conversacion": conversation_id,
                "response": "Error procesando la solicitud."
            }

    # ---------------------------------------------------------
    # FIX: FLUJO CONVERSACIONAL DE AGENDA
    # Maneja recolección de campos, borrador y confirmación
    # ---------------------------------------------------------

    def _procesar_flujo_agenda(self, user, message: str, draft: Dict) -> str:
        """Procesa las respuestas del usuario en el flujo de agendamiento."""
        
        msg = message.lower()
        
        # Cancelar flujo
        if any(p in msg for p in ["cancelar", "cancel", "olvida", "déjalo", "no"]):
            del Brain.agenda_drafts[user.id]
            return "Entendido, cancelé el agendamiento de la reunión."
        
        # Confirmar y enviar
        if any(p in msg for p in ["sí", "si", "confirm", "envía", "enviar", "perfecto", "ok", "dale"]):
            evento = draft.get("evento")
            if evento:
                # Enviar a Zapier
                enviado = self.agenda_tool._enviar_evento(evento)
                if enviado:
                    del Brain.agenda_drafts[user.id]
                    return f"✅ Reunión agendada correctamente:\n\n📅 {evento.get('title')}\n🕐 Fecha: {evento.get('date')} a las {evento.get('time')}\n⏱️ Duración: {evento.get('duration')} minutos"
                else:
                    return "Hubo un error al enviar la reunión. Por favor intenta de nuevo."
        
        # Modificar campo
        modificar_palabras = ["cambia", "modifica", "cambiar", "actualiza"]
        if any(p in msg for p in modificar_palabras):
            # Extraer qué quiere cambiar y el nuevo valor
            prompt = f"""
El usuario quiere modificar la reunión.
Borrador actual: {draft.get('evento')}

Mensaje del usuario: "{message}"

Responde SOLO JSON con los campos a modificar:
{{"campo": "nombre del campo", "valor": "nuevo valor"}}

Campos válidos: titulo, fecha, time, duration, attendees, descripcion
"""
            respuesta = self.llm_service.generate_response(
                message=prompt,
                history=[],
                role="ADMIN"
            )
            
            match = re.search(r"\{[\s\S]*?\}", respuesta)
            if match:
                try:
                    cambios = json.loads(match.group())
                    campo = cambios.get("campo", "").lower()
                    valor = cambios.get("valor")
                    
                    evento = draft.get("evento", {})
                    
                    # Mapeo de campos
                    campo_map = {
                        "titulo": "title",
                        "title": "title",
                        "fecha": "date",
                        "date": "date",
                        "hora": "time",
                        "time": "time",
                        "duration": "duration",
                        "duracion": "duration",
                        "attendees": "attendees",
                        "invitados": "attendees",
                        "descripcion": "description",
                        "description": "description"
                    }
                    
                    campo_db = campo_map.get(campo, campo)
                    evento[campo_db] = valor
                    draft["evento"] = evento
                    
                    return self._formatear_borrador(evento) + "\n\n¿Quieres que agende la reunión así o deseas cambiar algo más?"
                except:
                    pass
        
        # Si no confirmó ni canceló ni modificó, entender como datos adicionales
        # Extraer datos del mensaje
        datos = self.agenda_tool._extraer_datos_llm(message)
        
        evento = draft.get("evento", {})
        
        # Actualizar campos proporcionados
        if datos.get("titulo") and not evento.get("title"):
            evento["title"] = datos["titulo"]
        if datos.get("duracion") and not evento.get("duration"):
            evento["duration"] = datos["duracion"]
        if datos.get("attendees") and not evento.get("attendees"):
            evento["attendees"] = datos["attendees"]
        if datos.get("descripcion") and not evento.get("description"):
            evento["description"] = datos["descripcion"]
        
        draft["evento"] = evento
        
        # Verificar campos faltantes
        campos_faltantes = []
        if not evento.get("title"):
            campos_faltantes.append("título")
        if not evento.get("duration"):
            campos_faltantes.append("duración (minutos)")
        if not evento.get("attendees"):
            campos_faltantes.append("correos de invitados (opcional)")
        if not evento.get("description"):
            campos_faltantes.append("descripción (opcional)")
        
        if campos_faltantes:
            return f"Perfecto, guardé esa información.\n\nAún necesito:\n• " + "\n• ".join(campos_faltantes) + "\n\n¿Qué datos me faltaron?"
        
        # Tiene todos los datos, mostrar borrador
        return self._formatear_borrador(evento) + "\n\n¿Quieres que agende la reunión así o deseas cambiar algo?"

    def _formatear_borrador(self, evento: Dict) -> str:
        """Formatea el borrador de la reunion para mostrar al usuario."""
        
        titulo = evento.get("title", "Sin titulo")
        fecha = evento.get("date", "Sin fecha")
        hora = evento.get("time", "Sin hora")
        duracion = evento.get("duration", 30)
        attendees = evento.get("attendees", [])
        descripcion = evento.get("description", "Sin descripcion")
        
        invites = ", ".join(attendees) if attendees else "Nadie"
        
        return f"""Asi quedaria la reunion:

Titulo: {titulo}
Fecha: {fecha}
Hora: {hora}
Duracion: {duracion} minutos
Invitados: {invites}
Descripcion: {descripcion}"""

    def _formatear_tipo_reporte(self, tipo: str) -> str:
        """Formatea el tipo de incidente para mostrar al usuario."""
        tipos_formato = {
            "accidente": "Accidente de tránsito",
            "estacionamiento": "Vehículo mal estacionado",
            "semaforo": "Semáforo dañado",
            "conduccion": "Conducción peligrosa",
            "otro": "Otro"
        }
        return tipos_formato.get(tipo, tipo.title())
    
    def _parsear_tipo_infraccion(self, mensaje: str) -> str:
        """
        Convierte la respuesta del usuario a código de tipo de incidente.
        Acepta números (1-5) o nombres de tipos.
        """
        msg_lower = mensaje.lower().strip()
        
        # MAPEO POR NÚMERO (solo 5 tipos)
        numeros_tipos = {
            "1": "accidente",
            "2": "estacionamiento",
            "3": "semaforo",
            "4": "conduccion",
            "5": "otro",
            "1️⃣": "accidente",
            "2️⃣": "estacionamiento",
            "3️⃣": "semaforo",
            "4️⃣": "conduccion",
            "5️⃣": "otro",
        }
        
        # SI ES UN NÚMERO DIRECTO
        if msg_lower in numeros_tipos:
            return numeros_tipos[msg_lower]
        
        # SI CONTIENE SOLO UN NÚMERO
        for num, tipo in numeros_tipos.items():
            if num in msg_lower:
                return tipo
        
        # MAPEO POR NOMBRE (keywords) - SOLO 5 TIPOS
        tipos_por_nombre = {
            # Accidente
            "accidente": "accidente",
            "accidentes": "accidente",
            "choque": "accidente",
            "choques": "accidente",
            "chocado": "accidente",
            "colisión": "accidente",
            "colision": "accidente",
            "accidente de tránsito": "accidente",
            
            # Estacionamiento (mapea a "Vehículo mal estacionado")
            "estacionamiento": "estacionamiento",
            "estacion": "estacionamiento",
            "parqueo": "estacionamiento",
            "mal estacionado": "estacionamiento",
            "mal parqueado": "estacionamiento",
            "bloqueando": "estacionamiento",
            "vehículo mal estacionado": "estacionamiento",
            "carro mal estacionado": "estacionamiento",
            
            # Semáforo
            "semáforo": "semaforo",
            "semaforo": "semaforo",
            "luz": "semaforo",
            "semáforos": "semaforo",
            "semáforo dañado": "semaforo",
            
            # Conducción peligrosa (absorbe todos los demás)
            "velocidad": "conduccion",
            "rapido": "conduccion",
            "rápido": "conduccion",
            "exceso": "conduccion",
            "cinturón": "conduccion",
            "cinturon": "conduccion",
            "celular": "conduccion",
            "teléfono": "conduccion",
            "telefono": "conduccion",
            "peatón": "conduccion",
            "peaton": "conduccion",
            "cruce": "conduccion",
            "doble": "conduccion",
            "documentos": "conduccion",
            "licencia": "conduccion",
            "placa": "conduccion",
            "conducción peligrosa": "conduccion",
            "manejando": "conduccion",
            "conducir": "conduccion",
            
            # Otro
            "otro": "otro",
            "otros": "otro",
            "otro tipo": "otro",
            "ninguno": "otro",
        }
        
        # BUSCAR MATCH EN EL MENSAJE
        for keyword, tipo in tipos_por_nombre.items():
            if keyword in msg_lower:
                return tipo
        
        return None