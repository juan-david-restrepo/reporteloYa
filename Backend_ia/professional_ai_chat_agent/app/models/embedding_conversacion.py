from sqlalchemy import Column, BigInteger, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.models.conversation import Conversation
from app.db.base import Base  # tu clase Base de SQLAlchemy

class EmbeddingConversacion(Base):
    __tablename__ = "embeddings_conversaciones"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_conversacion = Column(BigInteger, ForeignKey("conversaciones.id_conversacion", ondelete="CASCADE"))
    embedding = Column(JSON, nullable=False)
    contenido = Column(Text, nullable=False)

    conversacion = relationship("Conversation", backref="embeddings")