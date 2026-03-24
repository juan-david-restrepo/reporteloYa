from typing import Optional, List
from app.repositories.conversation_repository import ConversationRepository
from app.models.embedding_conversacion import EmbeddingConversacion
from app.services.llm_service import LLMService
import logging

logger = logging.getLogger("robotransit")

class Memory:

    def __init__(self, db):
        self.repository = ConversationRepository(db)
        self.llm_service = LLMService()

    # ===============================
    # 💾 MENSAJES
    # ===============================
    def save_message(
        self,
        id_conversacion: int,
        emisor: str,
        contenido: str
    ) -> None:
        """
        Guarda un mensaje en la conversación.
        También permite crear el embedding automáticamente.
        """
        if not contenido or not contenido.strip():
            return

        contenido = contenido.strip()

        # guardar mensaje normal
        self.repository.save_message(
            id_conversacion=id_conversacion,
            emisor=emisor,
            contenido=contenido
        )

        # 🔥 GENERACIÓN AUTOMÁTICA DE EMBEDDING
        try:
            embedding = self.llm_service.generate_embedding(contenido)

            if embedding:
                self.save_embedding(
                    id_conversacion=id_conversacion,
                    contenido=contenido,
                    embedding=embedding
                )

        except Exception as e:
            logger.exception(f"Error generando embedding: {str(e)}")

    def get_messages(self, id_conversacion: int) -> List[dict]:
        return self.repository.get_messages(id_conversacion)

    # ===============================
    # 🧠 CONVERSACIONES
    # ===============================
    def create_conversation(
        self,
        id_usuario: int,
        titulo: Optional[str] = None
    ):
        return self.repository.create_conversation(
            id_usuario=id_usuario,
            titulo=titulo
        )

    def get_conversation(self, id_conversacion: int):
        return self.repository.get_conversation(id_conversacion)

    def get_user_conversations(self, id_usuario: int):
        return self.repository.get_conversations_by_user(id_usuario)

    def update_title(self, id_conversacion: int, titulo: str):
        self.repository.update_title(id_conversacion, titulo)

    def update_last_activity(self, id_conversacion: int):
        self.repository.update_last_activity(id_conversacion)

    # ===============================
    # 🔥 CONVERSACIÓN ACTIVA
    # ===============================
    def get_last_active_conversation(self, id_usuario: int):
        """
        Devuelve la última conversación activa de un usuario.
        """
        return self.repository.get_last_active_conversation(id_usuario)

    # ===============================
    # 🚫 LÍMITE DE CONVERSACIONES
    # ===============================
    def count_user_conversations(self, id_usuario: int) -> int:
        """
        Cuenta cuántas conversaciones activas tiene un usuario.
        """
        return self.repository.count_user_conversations(id_usuario)

    def delete_conversation(self, id_conversacion: int):
        """
        Elimina una conversación (la marca como inactiva).
        """
        return self.repository.delete_conversation(id_conversacion)

    # ===============================
    # 🔥 EMBEDDINGS
    # ===============================
    def save_embedding(
        self,
        id_conversacion: int,
        contenido: str,
        embedding: list
    ) -> EmbeddingConversacion:
        """
        Guarda un embedding de la conversación.
        """
        return self.repository.save_embedding(
            id_conversacion=id_conversacion,
            contenido=contenido,
            embedding=embedding
        )

    def get_relevant_embeddings(
        self,
        id_conversacion: int,
        embedding: list,
        top_k: int = 5
    ) -> List[str]:
        """
        Devuelve los contenidos más relevantes por similitud de embeddings.
        """
        return self.repository.get_relevant_embeddings(
            id_conversacion=id_conversacion,
            embedding=embedding,
            top_k=top_k
        )

    # ===============================
    # 🔥 RAG / CONTEXTO DE EMBEDDINGS
    # ===============================
    def generate_context_for_message(
        self,
        id_conversacion: int,
        message: str,
        top_k: int = 5
    ) -> str:
        """
        Genera un contexto basado en embeddings relevantes para mejorar la respuesta.
        """
        try:
            # Generar embedding del mensaje nuevo
            new_embedding = self.llm_service.generate_embedding(message)

            if not new_embedding:
                return ""

            # Obtener mensajes más relevantes
            relevant_msgs = self.get_relevant_embeddings(
                id_conversacion=id_conversacion,
                embedding=new_embedding,
                top_k=top_k
            )

            # Unir los contenidos en un solo string como contexto
            context_text = "\n".join(relevant_msgs)
            return context_text

        except Exception as e:
            logger.exception(f"Error generando contexto RAG: {str(e)}")
            return ""