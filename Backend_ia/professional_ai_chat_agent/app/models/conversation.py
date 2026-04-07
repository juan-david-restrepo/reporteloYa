from sqlalchemy import Column, BigInteger, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversaciones"

    id_conversacion = Column(BigInteger, primary_key=True, index=True)
    id_usuario = Column(BigInteger, ForeignKey("usuarios.id_usuario"), nullable=False)

    titulo = Column(String(255), nullable=True)
    titulo_manual = Column(Boolean, default=False)
    activa = Column(Boolean, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    mensajes = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")