from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.dependencies import get_db
from app.services.user_service import UserService
from app.core.agent import Agent
from app.models.conversation import Conversation
from app.models.message import Message
from app.utils.logger import logger

router = APIRouter()


# ======================================================
# 📦 SCHEMAS
# ======================================================

class ChatRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    conversation_id: int | None = None
    message: str = Field(default="", max_length=1000)


# ======================================================
# 🤖 ENDPOINT PRINCIPAL CHAT
# ======================================================

@router.post("/chat", status_code=status.HTTP_200_OK)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint principal del agente conversacional.

    Flujo compatible con frontend:

    ngOnInit
        ↓
    cargarConversaciones
        ↓
    if conversaciones.length == 0
        ↓
    nuevoChat
        ↓
    guardar id
        ↓
    cargarMensajes
        ↓
    mostrar saludo
    """

    try:

        user = UserService(db).get_user(request.user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado."
            )

        agent = Agent(db)

        result = await agent.chat(
            user=user,
            message=request.message,
            conversation_id=request.conversation_id
        )

        conversation_id = result.get("id_conversacion")
        response_text = result.get("response")

        return {
            "id_conversacion": conversation_id,
            "response": response_text or "",
            "navigation": result.get("navigation")
        }

    except HTTPException:
        raise

    except Exception as e:

        logger.exception(f"Error en /chat: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno procesando la solicitud."
        )


# ======================================================
# 📚 LISTAR CONVERSACIONES POR USUARIO
# ======================================================

@router.get("/conversations", status_code=status.HTTP_200_OK)
def get_user_conversations(
    user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Devuelve todas las conversaciones activas del usuario.
    """

    try:
        user = UserService(db).get_user(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado."
            )

        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.id_usuario == user_id,
                Conversation.activa == True
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )

        return [
            {
                "id_conversacion": conv.id_conversacion,
                # 🔹 CORRECCIÓN: Si no hay título, mostrar "Nuevo chat" en lugar de "Chat {id}"
                # Esto permite que el título se genere dinámicamente cuando la conversación tenga contexto
                "titulo": conv.titulo if conv.titulo and conv.titulo.strip() else "Nuevo chat",
                "created_at": conv.created_at,
                "updated_at": conv.updated_at
            }
            for conv in conversations
        ]

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error obteniendo conversaciones: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo conversaciones."
        )


# ======================================================
# 📄 OBTENER CONVERSACIÓN
# ======================================================

@router.get("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):

    conversation = db.query(Conversation).filter(
        Conversation.id_conversacion == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")

    return {
        "id_conversacion": conversation.id_conversacion,
        "titulo": conversation.titulo,
        "activa": conversation.activa,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at
    }


# ======================================================
# 🔍 BUSCAR CONVERSACIONES
# ======================================================

@router.get("/conversations/search", status_code=status.HTTP_200_OK)
def search_conversations(
    user_id: int = Query(..., gt=0),
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):

    try:
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.id_usuario == user_id,
                Conversation.titulo.ilike(f"%{query}%")
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )

        return [
            {
                "id_conversacion": conv.id_conversacion,
                "titulo": conv.titulo,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at
            }
            for conv in conversations
        ]

    except Exception as e:
        logger.exception(f"Error buscando conversaciones: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error buscando conversaciones."
        )


# ======================================================
# 💬 MENSAJES DE CONVERSACIÓN
# ======================================================

@router.get("/conversations/{conversation_id}/messages", status_code=status.HTTP_200_OK)
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db)
):

    try:
        messages = (
            db.query(Message)
            .filter(Message.id_conversacion == conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )

        return [
            {
                "id_mensaje": msg.id_mensaje,
                "emisor": msg.emisor,
                "contenido": msg.contenido,
                "created_at": msg.created_at
            }
            for msg in messages
        ]

    except Exception as e:
        logger.exception(f"Error obteniendo mensajes: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo mensajes."
        )


# ======================================================
# 🗑️ ELIMINAR CONVERSACIÓN
# ======================================================

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: int,
    user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db)
):

    try:
        user = UserService(db).get_user(user_id)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado."
            )

        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id_conversacion == conversation_id,
                Conversation.id_usuario == user_id
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada."
            )

        db.delete(conversation)
        db.commit()

        return {
            "message": "Conversación eliminada correctamente."
        } 

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error eliminando conversación: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error eliminando conversación."
        )