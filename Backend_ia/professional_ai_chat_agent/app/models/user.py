from sqlalchemy import Column, BigInteger, String, Enum
from app.db.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(BigInteger, primary_key=True, index=True)

    correo = Column(String(255), nullable=False, unique=True)

    nombre_completo = Column(String(255), nullable=False)

    numero_documento = Column(String(255), nullable=True)

    tipo_documento = Column(String(255), nullable=True)

    password = Column(String(255), nullable=False)

    role = Column(
        Enum("ADMIN", "AGENTE", "CIUDADANO", name="role_enum"),
        nullable=True
    )