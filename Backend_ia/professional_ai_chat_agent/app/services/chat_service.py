from app.services.llm_service import LLMService
from app.core.memory import Memory
import logging
from typing import Optional, Dict, Any
import random

from app.core.navigation import NavigationEngine

logger = logging.getLogger("robotransit")


class IntentClassifier:
    """
    Clasificador de intenciones para distingir entre navegación y ejecución de herramientas.
    """
    
    NAVIGATION_INTENTS = [
        "ir a", "abrir", "volver a", "menu", "home", "inicio",
        "ver", "consultar", "estado", "historial", "mis", "datos",
        "perfil", "configurar", "-settings"
    ]
    
    TOOL_ACTION_INTENTS = [
        "crear", "creame", "hacer", "generar", "registrar",
        "enviar", "subir", "reportar", "nuevo", "agregar"
    ]
    
    @staticmethod
    def classify(message: str) -> str:
        """
        Retorna 'navigation', 'tool_action', o 'ambiguous'
        """
        msg_lower = message.lower().strip()
        
        has_nav = any(kw in msg_lower for kw in IntentClassifier.NAVIGATION_INTENTS)
        has_tool = any(kw in msg_lower for kw in IntentClassifier.TOOL_ACTION_INTENTS)
        
        if has_tool and not has_nav:
            return "tool_action"
        elif has_nav and not has_tool:
            return "navigation"
        elif has_tool and has_nav:
            if msg_lower.startswith("crear") or msg_lower.startswith("creame") or \
               msg_lower.startswith("hacer") or msg_lower.startswith("generar") or \
               msg_lower.startswith("registrar"):
                return "tool_action"
            else:
                return "navigation"
        else:
            return "navigation"


class ChatService:
    """
    Servicio principal de orquestación del chat.

    REGLAS DEL SISTEMA:
    - La IA SIEMPRE saluda primero.
    - Toda conversación nueva recibe saludo automático.
    - Usuario nuevo recibe conversación automática.
    - Si el usuario elimina TODAS las conversaciones, se crea una nueva automáticamente.
    """

    MAX_CONVERSATIONS = 5
    MAX_USER_MESSAGES = 20

    WELCOME_MESSAGES = {
        "CIUDADANO": [
            "¡Hola! ¿En qué puedo ayudarte hoy?",
            "¡Hola! ¿Listo para hablar sobre normas de tránsito?",
            "¡Hola! ¿Qué tema de tránsito quieres explorar hoy?",
            "¡Hola! Estoy aquí para ayudarte con seguridad vial y señales de tránsito.",
            "¡Hola! ¿Cómo puedo asistirte hoy respecto a tránsito y seguridad vial?"
        ],

        "AGENTE": [
            "Hola agente. ¿Necesitas consultar reportes o normativas?",
            "Bienvenido agente. ¿En qué gestión operativa puedo ayudarte?",
            "Hola agente. Puedo ayudarte con reportes, incidencias o normativa vial.",
            "Agente, estoy listo para asistirte con información del sistema.",
            "Hola agente. ¿Qué consulta necesitas realizar hoy?"
        ],

        "ADMIN": [
            "Hola administrador. ¿Qué deseas gestionar hoy?",
            "Bienvenido admin. ¿Necesitas revisar el sistema o gestionar usuarios?",
            "Administrador, estoy listo para ayudarte con la plataforma.",
            "Hola admin. Puedes consultar gestión del sistema o reportes.",
            "Bienvenido administrador. ¿En qué parte del sistema necesitas apoyo?"
        ]
    }

    def __init__(self, db):
        self.llm = LLMService()
        self.memory = Memory(db)
        self.navigation = NavigationEngine()

    # ==========================================================
    # UTILIDAD: GENERAR SALUDO
    # ==========================================================
    def _generate_welcome(self, role: str) -> str:

        mensajes = self.WELCOME_MESSAGES.get(role, self.WELCOME_MESSAGES["CIUDADANO"])

        return random.choice(mensajes)  

    # ==========================================================
    # VALIDAR ROL DEL USUARIO
    # ==========================================================
    def _get_user_role(self, user) -> str:

        try:

            logger.info(f"Usuario recibido: {user}")
            logger.info(f"Role recibido: {getattr(user,'role',None)}")

            role = getattr(user, "role", None)

            if not role:
                return "CIUDADANO"

            role = str(role).upper()

            if role not in ["CIUDADANO", "AGENTE", "ADMIN"]:
                logger.warning(f"Rol desconocido detectado: {role}")
                return "CIUDADANO"

            return role

        except Exception:
            return "CIUDADANO"

    # ==========================================================
    # CREAR CONVERSACIÓN CON SALUDO
    # ==========================================================
    def _create_conversation_with_greeting(self, user_id: int, role: str):

        conversation = self.memory.create_conversation(user_id)

        saludo = self._generate_welcome(role)

        self.memory.save_message(
            id_conversacion=conversation.id_conversacion,
            emisor="ia",
            contenido=saludo
        )

        return conversation, saludo

    # ==========================================================
    # MÉTODO PRINCIPAL
    # ==========================================================
    def chat(
        self,
        user,
        message: str,
        id_conversacion: Optional[int] = None,
        embedding_context: Optional[str] = None
    ) -> Dict[str, Any]:

        try:

            saludo_inicial = None
            user_role = self._get_user_role(user)

            logger.info(f"Chat iniciado con rol: {user_role}")

            # ======================================================
            # 1️⃣ CREACIÓN DE CONVERSACIÓN
            # ======================================================

            if id_conversacion is None:

                conversations = self.memory.get_user_conversations(user.id)

                if len(conversations) == 0:

                    conversation, saludo_inicial = self._create_conversation_with_greeting(user.id, user_role)
                    id_conversacion = conversation.id_conversacion

                else:

                    if len(conversations) >= self.MAX_CONVERSATIONS:
                        return {
                            "error": "CHAT_LIMIT_REACHED",
                            "message": "Límite alcanzado (5 chats). Elimina uno para crear otro."
                        }

                    conversation, saludo_inicial = self._create_conversation_with_greeting(user.id, user_role)
                    id_conversacion = conversation.id_conversacion

            else:

                conversation = self.memory.get_conversation(id_conversacion)

                if not conversation:

                    conversations = self.memory.get_user_conversations(user.id)

                    if len(conversations) >= self.MAX_CONVERSATIONS:
                        return {
                            "error": "CHAT_LIMIT_REACHED",
                            "message": "Límite alcanzado (5 chats)."
                        }

                    conversation, saludo_inicial = self._create_conversation_with_greeting(user.id, user_role)
                    id_conversacion = conversation.id_conversacion

            # ======================================================
            # 2️⃣ SI SOLO SE CREÓ EL CHAT → DEVOLVER SALUDO
            # ======================================================

            if not message or message.strip() == "":

                if saludo_inicial is None:

                    mensajes = self.memory.get_messages(id_conversacion)

                    if mensajes:
                        for msg in mensajes:
                            if msg["emisor"] == "ia":
                                saludo_inicial = msg["contenido"]
                                break

                return {
                    "id_conversacion": id_conversacion,
                    "response": saludo_inicial,
                    "navigation": None
                }

            # ======================================================
            # 3️⃣ FLUJO NORMAL DEL CHAT
            # ======================================================

            response = self._handle_chat(
                user=user,
                message=message,
                id_conversacion=id_conversacion,
                embedding_context=embedding_context
            )

            navigation_data = None

            try:

                route = self.navigation.find_route(message)

                if route:
                    navigation_data = {
                        "action": route["action"],
                        "route": route["route"],
                        "name": route["name"],
                        "description": route["description"]
                    }

            except Exception as nav_error:
                logger.exception(f"Error detectando navegación: {str(nav_error)}")

            if navigation_data and message.strip():
                intent = IntentClassifier.classify(message)
                if intent == "tool_action":
                    logger.info(f"Intención detectada: tool_action. Ignorando navegación.")
                    navigation_data = None
                elif intent == "navigation":
                    logger.info(f"Intención detectada: navigation. Permitiendo navegación.")

            return {
                "id_conversacion": id_conversacion,
                "response": response,
                "navigation": navigation_data
            }

        except Exception as e:

            logger.exception(f"Error general en ChatService.chat: {str(e)}")

            return {
                "id_conversacion": id_conversacion,
                "response": "Ocurrió un error procesando la conversación."
            }

    # ==========================================================
    # ELIMINAR CONVERSACIÓN
    # ==========================================================
    def delete_conversation(self, id_conversacion: int, user_id: int) -> bool:

        try:

            conversation = self.memory.get_conversation(id_conversacion)

            if not conversation:
                return False

            if conversation.id_usuario != user_id:
                return False

            self.memory.delete_conversation(id_conversacion)

            remaining = self.memory.get_user_conversations(user_id)

            if len(remaining) == 0:
                self._create_conversation_with_greeting(user_id, "CIUDADANO")

            return True

        except Exception as e:
            logger.exception(f"Error eliminando conversación: {str(e)}")
            return False

    # ==========================================================
    # FLUJO INTERNO
    # ==========================================================
    def _handle_chat(
        self,
        user,
        message: str,
        id_conversacion: int,
        embedding_context: Optional[str] = None
    ) -> str:

        try:

            user_role = self._get_user_role(user)

            history_raw = self.memory.get_messages(id_conversacion) or []

            user_messages = [
                msg for msg in history_raw
                if msg["emisor"] == "usuario"
            ]

            if len(user_messages) >= self.MAX_USER_MESSAGES:
                return "Has alcanzado el limite de 20 mensajes en esta conversacion. Inicia un nuevo chat."

            self.memory.save_message(
                id_conversacion=id_conversacion,
                emisor="usuario",
                contenido=message
            )

            history_raw = self.memory.get_messages(id_conversacion) or []

            history = [
                {
                    "role": "user" if item["emisor"] == "usuario" else "model",
                    "content": item["contenido"]
                }
                for item in history_raw
            ]

            # AGREGAR CONTEXTO DE EMBEDDINGS SI ESTÁ DISPONIBLE
            if embedding_context:
                enhanced_message = f"""
Contexto relevante de conversacion anterior:
{embedding_context}

Mensaje actual del usuario: {message}
"""
                response = self.llm.generate_response(
                    message=enhanced_message,
                    history=history,
                    role=user_role
                )
            else:
                response = self.llm.generate_response(
                    message=message,
                    history=history,
                    role=user_role
                )

            if not response:
                response = "No se pudo generar una respuesta."

            self.memory.save_message(
                id_conversacion=id_conversacion,
                emisor="ia",
                contenido=response
            )

            self.memory.update_last_activity(id_conversacion)

            # ==========================================================
            # 🔹 GENERACIÓN INTELIGENTE DE TÍTULOS DE CONVERSACIÓN
            # Objetivo: Título contextual que cambia solo cuando hay cambio de tema
            # ==========================================================

            conversation = self.memory.get_conversation(id_conversacion)

            if conversation:

                # 1️⃣ OBTENER MENSAJES REALES DE LA BASE DE DATOS
                # Usamos self.memory.get_messages() en lugar de conversation.mensajes
                # para obtener los datos actualizados directamente de la BD
                mensajes_db = self.memory.get_messages(id_conversacion) or []

                # 2️⃣ FILTRAR MENSAJES IRRELEVANTES
                # Excluimos saludos, agradecimientos, respuestas cortas y emojis
                # que no aportan contexto para generar un título significativo
                palabras_irrelevantes = (
                    "hola", "gracias", "ok", "si", "no", "bien", "perfecto",
                    "de acuerdo", "entendido", "como no", "por favor",
                    "saludos", "adios", "bye", "👍", "😄", "❤️", "👋",
                    "excelente", "increible", "genial", "ok", "todo bien"
                )

                mensajes_relevantes = [
                    msg["contenido"] for msg in mensajes_db[-10:]  # Últimos 10 mensajes
                    if isinstance(msg, dict)
                    and len(msg.get("contenido", "").strip()) > 5  # Mínimo 5 caracteres
                    and not any(
                        msg.get("contenido", "").lower().startswith(p)
                        for p in palabras_irrelevantes
                    )
                ]

                # 3️⃣ SOLO PROCESAR SI HAY SUFICIENTES MENSAJES RELEVANTES
                # 🔹 CORRECCIÓN: Cambiado de 3 a 2 mensajes relevantes
                # Antes requería 3 mensajes, pero una conversación nueva solo tiene:
                # - Saludo de la IA (1)
                # - Mensaje del usuario (1)
                # - Respuesta de la IA (1)
                # Con 2 mensajes relevantes ya se puede generar un título contextual
                if len(mensajes_relevantes) >= 2:

                    # Obtener título actual de la conversación
                    titulo_actual = conversation.titulo.strip() if conversation.titulo else ""

                    # Verificar si el título fue establecido manualmente
                    # Si titulo_manual = True, respetar el título manual y no actualizarlo
                    titulo_Manual = getattr(conversation, 'titulo_manual', False)

                    # Últimos 5 mensajes relevantes para el contexto
                    context_text = "\n".join(mensajes_relevantes[-5:])

                    # 4️⃣ DETECTAR CAMBIO DE CONTEXTO Y GENERAR NUEVO TÍTULO
                    # El LLM analiza si el tema actual es diferente al título existente
                    # Solo actualiza si hay un cambio significativo de tema Y el título no es manual
                    title_prompt = f"""
Eres un asistente que analiza conversaciones para generar títulos contextuales.

TÍTULO ACTUAL DE LA CONVERSACIÓN: "{titulo_actual if titulo_actual else 'Sin título'}"

ÚLTIMOS MENSAJES DE LA CONVERSACIÓN:
{context_text}

Analiza si hay un CAMBIO DE CONTEXTO significativo respecto al título actual.
Un cambio de contexto significa que la conversación trata sobre un tema completamente diferente.

Responde en formato JSON solo (sin texto adicional):
{{
    "cambio_contexto": true o false,
    "titulo_nuevo": "Máximo 6 palabras, profesional, en español"
}}

Ejemplos de decisión:
- Mismo tema: "Consulta de Reportes" + mensajes sobre reportes → "cambio_contexto": false
- Nuevo tema: "Consulta de Reportes" + mensajes sobre agentes → "cambio_contexto": true, "titulo_nuevo": "Consulta de Agentes"
"""

                    try:
                        respuesta = self.llm.generate_response(
                            message=title_prompt,
                            history=[],
                            role=user_role
                        )

                        # 5️⃣ PARSEAR RESPUESTA JSON DEL LLM
                        import re
                        import json

                        match = re.search(r'\{[\s\S]*\}', respuesta)

                        if match:
                            datos = json.loads(match.group())

                            cambio = datos.get("cambio_contexto", False)
                            nuevo_titulo = datos.get("titulo_nuevo", "").strip()

                            # 6️⃣ DECIDIR SI ACTUALIZAR EL TÍTULO
                            # Actualizar solo si:
                            # - No está establecido como título manual (titulo_manual = False)
                            # - Hay cambio de contexto Y hay nuevo título, O
                            # - No existe título actual (primera vez)
                            debe_actualizar = ((cambio and nuevo_titulo) or not titulo_actual) and not titulo_Manual

                            if debe_actualizar and nuevo_titulo:
                                # Limitar a máximo 6 palabras
                                titulo_corto = " ".join(nuevo_titulo.split()[:6])
                                self.memory.update_title(id_conversacion, titulo_corto)

                                # 📝 LOG DE DEPURACIÓN - Registrar cuando se actualiza el título
                                logger.info(f"🔖 TÍTULO ACTUALIZADO | Conv: {id_conversacion} | Anterior: '{titulo_actual}' | Nuevo: '{titulo_corto}' | Cambio contexto: {cambio}")
                            else:
                                # 📝 LOG DE DEPURACIÓN - Registrar cuando NO se actualiza
                                logger.info(f"🔖 TÍTULO SIN CAMBIO | Conv: {id_conversacion} | Actual: '{titulo_actual}' | Mensajes relevantes: {len(mensajes_relevantes)}")

                    except Exception as e:
                        # Si falla el LLM, registrar error pero no romper el flujo
                        logger.warning(f"Error generando título con LLM: {str(e)}")

            return response

        except Exception as e:
            logger.exception(f"Error en _handle_chat: {str(e)}")
            return "Ocurrió un error procesando tu mensaje."

    # ==========================================================
    # ROLES
    # ==========================================================
    def handle_ciudadano(self, user, message, id_conversacion=None, embedding_context=None):
        return self.chat(user, message, id_conversacion, embedding_context)

    def handle_agente(self, user, message, id_conversacion=None, embedding_context=None):
        return self.chat(user, message, id_conversacion, embedding_context)

    def handle_admin(self, user, message, id_conversacion=None, embedding_context=None):
        return self.chat(user, message, id_conversacion, embedding_context)