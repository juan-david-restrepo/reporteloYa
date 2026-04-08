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


class UpdateTitleRequest(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=255)
    manual: bool = Field(default=True)


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

        # 🔄 FALLBACK: Si usuario no existe, crearlo automáticamente
        if user is None:
            logger.warning(f"Usuario {request.user_id} no encontrado. Creándolo automáticamente.")
            user = UserService(db).create_or_update_user(
                user_id=request.user_id,
                email=f"user_{request.user_id}@local.com",
                nombre_completo=f"Usuario {request.user_id}",
                role="CIUDADANO",
                tipo_documento=None,
                numero_documento=None
            )
            logger.info(f"Usuario {request.user_id} creado automáticamente")

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
    Si el usuario no existe, se crea automáticamente (fallback).
    """

    try:
        user = UserService(db).get_user(user_id)

        # 🔄 FALLBACK: Si usuario no existe, crearlo automáticamente
        if user is None:
            logger.warning(f"Usuario {user_id} no encontrado. Creándolo automáticamente.")
            user = UserService(db).create_or_update_user(
                user_id=user_id,
                email=f"user_{user_id}@local.com",
                nombre_completo=f"Usuario {user_id}",
                role="CIUDADANO",
                tipo_documento=None,
                numero_documento=None
            )
            logger.info(f"Usuario {user_id} creado automáticamente")

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

        # 🔄 FALLBACK: Si usuario no existe, crearlo automáticamente
        if user is None:
            logger.warning(f"Usuario {user_id} no encontrado. Creándolo automáticamente.")
            user = UserService(db).create_or_update_user(
                user_id=user_id,
                email=f"user_{user_id}@local.com",
                nombre_completo=f"Usuario {user_id}",
                role="CIUDADANO",
                tipo_documento=None,
                numero_documento=None
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


# ======================================================
# ✏️ ACTUALIZAR TÍTULO DE CONVERSACIÓN
# ======================================================

@router.patch("/conversations/{conversation_id}/title", status_code=status.HTTP_200_OK)
def update_conversation_title(
    conversation_id: int,
    request: UpdateTitleRequest,
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

        conversation.titulo = request.titulo
        conversation.titulo_manual = request.manual
        db.commit()
        db.refresh(conversation)

        return {
            "id_conversacion": conversation.id_conversacion,
            "titulo": conversation.titulo,
            "titulo_manual": conversation.titulo_manual,
            "message": "Título actualizado correctamente."
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error actualizando título: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error actualizando el título."
        )


# ======================================================
# 🔄 SINCRONIZAR USUARIO DESDE AUTH SERVICE
# ======================================================

class SyncUserRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    email: str = Field(..., max_length=255)
    nombre_completo: str = Field(..., max_length=255)
    role: str = Field(..., max_length=50)
    tipo_documento: str = Field(default=None, max_length=50)
    numero_documento: str = Field(default=None, max_length=50)


@router.post("/sync-user", status_code=status.HTTP_200_OK)
def sync_user(
    request: SyncUserRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint para sincronizar un usuario desde el auth service.
    Este endpoint debe ser llamado por el auth service cuando el usuario hace login.
    """
    try:
        user_service = UserService(db)
        
        user = user_service.create_or_update_user(
            user_id=request.user_id,
            email=request.email,
            nombre_completo=request.nombre_completo,
            role=request.role,
            tipo_documento=request.tipo_documento,
            numero_documento=request.numero_documento
        )

        logger.info(f"Usuario sincronizado: ID={request.user_id}, email={request.email}")

        return {
            "success": True,
            "message": "Usuario sincronizado correctamente",
            "user": {
                "id": user.id,
                "name": user.name,
                "role": user.role
            }
        }

    except Exception as e:
        logger.exception(f"Error sincronizando usuario: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sincronizando usuario: {str(e)}"
        )