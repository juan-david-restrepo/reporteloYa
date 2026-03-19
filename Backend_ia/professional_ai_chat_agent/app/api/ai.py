from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.api.dependencies import get_db
from app.models.conversation import Conversation

router = APIRouter()

class AIRequest(BaseModel):
    user_id: int
    name: str
    role: str

@router.post("/start")
def start_conversation(request: AIRequest, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(
        Conversation.id_usuario == request.user_id,
        Conversation.activa == True
    ).first()

    if not conversation:
        conversation = Conversation(
            id_usuario=request.user_id,
            titulo=f"Chat {request.user_id}"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    return {"conversation_id": conversation.id_conversacion}