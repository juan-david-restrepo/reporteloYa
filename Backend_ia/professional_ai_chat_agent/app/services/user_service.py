from sqlalchemy.orm import Session
from app.models.user import Usuario
from app.schemas.user import User


class UserService:

    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int):

        usuario = (
            self.db
            .query(Usuario)
            .filter(Usuario.id_usuario == user_id)
            .first()
        )

        if not usuario:
            return None

        # CORRECCIÓN 2: Validar que rol no sea NULL antes de hacer upper()
        # Si el rol es NULL en la base de datos, usar "CIUDADANO" por defecto
        rol_usuario = usuario.role.upper() if usuario.role else "CIUDADANO"

        return User(
            id=usuario.id_usuario,
            name=usuario.nombre_completo,
            role=rol_usuario
        )