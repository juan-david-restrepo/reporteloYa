from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.embedding_conversacion import EmbeddingConversacion
from datetime import datetime
from typing import Optional, List
import json
from numpy import dot
from numpy.linalg import norm


class ConversationRepository:

    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # CREAR CONVERSACIÓN
    # ==========================================
    def create_conversation(
        self,
        id_usuario: int,
        titulo: Optional[str] = None
    ) -> Conversation:

        nueva_conversacion = Conversation(
            id_usuario=id_usuario,
            titulo=titulo,
            activa=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(nueva_conversacion)
        self.db.commit()
        self.db.refresh(nueva_conversacion)
        return nueva_conversacion

    # ==========================================
    # OBTENER CONVERSACIÓN
    # ==========================================
    def get_conversation(
        self,
        id_conversacion: int
    ) -> Optional[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.id_conversacion == id_conversacion)
            .first()
        )

    # ==========================================
    # OBTENER ÚLTIMA CONVERSACIÓN ACTIVA
    # ==========================================
    def get_last_active_conversation(self, id_usuario: int) -> Optional[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.id_usuario == id_usuario,
                Conversation.activa == True
            )
            .order_by(Conversation.updated_at.desc())
            .first()
        )

    # ==========================================
    # NUEVO MÉTODO: OBTENER TODAS LAS CONVERSACIONES DE UN USUARIO
    # ==========================================
    def get_conversations_by_user(self, id_usuario: int) -> List[Conversation]:
        """
        Devuelve todas las conversaciones activas de un usuario,
        ordenadas por última actualización descendente.
        """
        return (
            self.db.query(Conversation)
            .filter(Conversation.id_usuario == id_usuario, Conversation.activa == True)
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    # ==========================================
    # ACTUALIZAR TÍTULO
    # ==========================================
    def update_title(
        self,
        id_conversacion: int,
        titulo: str,
        manual: bool = False
    ) -> bool:

        conversacion = self.get_conversation(id_conversacion)
        if not conversacion:
            return False

        conversacion.titulo = titulo
        conversacion.titulo_manual = manual
        conversacion.updated_at = datetime.utcnow()
        self.db.commit()
        return True

    # ==========================================
    # ACTUALIZAR ÚLTIMA ACTIVIDAD
    # ==========================================
    def update_last_activity(
        self,
        id_conversacion: int
    ) -> None:

        conversacion = self.get_conversation(id_conversacion)
        if not conversacion:
            return

        conversacion.updated_at = datetime.utcnow()
        self.db.commit()

    # ==========================================
    # OBTENER MENSAJES
    # ==========================================
    def get_messages(
        self,
        id_conversacion: int
    ) -> List[dict]:

        mensajes = (
            self.db.query(Message)
            .filter(Message.id_conversacion == id_conversacion)
            .order_by(Message.created_at.asc())
            .all()
        )

        return [
            {
                "id_mensaje": mensaje.id_mensaje,
                "emisor": mensaje.emisor,
                "contenido": mensaje.contenido,
                "created_at": mensaje.created_at
            }
            for mensaje in mensajes
        ]

    # ==========================================
    # GUARDAR MENSAJE
    # ==========================================
    def save_message(
        self,
        id_conversacion: int,
        emisor: str,
        contenido: str
    ) -> Message:

        conversacion = self.get_conversation(id_conversacion)
        if not conversacion:
            return None

        nuevo_mensaje = Message(
            id_conversacion=id_conversacion,
            emisor=emisor,
            contenido=contenido,
            created_at=datetime.utcnow()
        )

        self.db.add(nuevo_mensaje)
        # Actualizamos última actividad en el mismo commit
        conversacion.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(nuevo_mensaje)
        return nuevo_mensaje

    # ==========================================
    # GUARDAR EMBEDDING
    # ==========================================
    def save_embedding(
        self,
        id_conversacion: int,
        contenido: str,
        embedding: list
    ) -> EmbeddingConversacion:

        conversacion = self.get_conversation(id_conversacion)
        if not conversacion:
            return None

        nuevo_embedding = EmbeddingConversacion(
            id_conversacion=id_conversacion,
            contenido=contenido,
            embedding=json.dumps(embedding)
        )

        self.db.add(nuevo_embedding)
        conversacion.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(nuevo_embedding)
        return nuevo_embedding

    # ==========================================
    # OBTENER EMBEDDINGS RELEVANTES
    # ==========================================
    def get_relevant_embeddings(
        self,
        id_conversacion: int,
        embedding: list,
        top_k: int = 5
    ) -> List[dict]:
        """
        Devuelve los top_k embeddings más cercanos por similitud coseno.
        """
        all_embeddings = (
            self.db.query(EmbeddingConversacion)
            .filter(EmbeddingConversacion.id_conversacion == id_conversacion)
            .all()
        )

        def cosine_similarity(a, b):
            return dot(a, b) / (norm(a) * norm(b) + 1e-10)

        scored = []
        for e in all_embeddings:
            e_vector = json.loads(e.embedding)
            score = cosine_similarity(embedding, e_vector)
            scored.append({"contenido": e.contenido, "score": score})

        scored_sorted = sorted(scored, key=lambda x: x["score"], reverse=True)
        return [s["contenido"] for s in scored_sorted[:top_k]]