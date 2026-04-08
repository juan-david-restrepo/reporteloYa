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

    def create_or_update_user(self, user_id: int, email: str, nombre_completo: str, role: str, tipo_documento: str = None, numero_documento: str = None):
        """
        Crea o actualiza un usuario en la base de datos del Chat AI.
        Este método se usa para sincronizar usuarios desde el auth service.
        """
        usuario = (
            self.db
            .query(Usuario)
            .filter(Usuario.id_usuario == user_id)
            .first()
        )

        if usuario:
            # Actualizar campos si son diferentes
            usuario.correo = email
            usuario.nombre_completo = nombre_completo
            usuario.role = role
            if tipo_documento:
                usuario.tipo_documento = tipo_documento
            if numero_documento:
                usuario.numero_documento = numero_documento
        else:
            # Crear nuevo usuario
            usuario = Usuario(
                id_usuario=user_id,
                correo=email,
                nombre_completo=nombre_completo,
                role=role,
                tipo_documento=tipo_documento,
                numero_documento=numero_documento,
                password=""  # No necesitamos password aquí ya que la autenticación viene del auth service
            )
            self.db.add(usuario)

        self.db.commit()
        self.db.refresh(usuario)

        return User(
            id=usuario.id_usuario,
            name=usuario.nombre_completo,
            role=usuario.role.upper() if usuario.role else "CIUDADANO"
        )