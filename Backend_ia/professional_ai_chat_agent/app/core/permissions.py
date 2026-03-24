from typing import Dict, List


class PermissionManager:
    """
    Gestor de permisos del sistema.

    Se encarga de:
    - Validar si un rol existe
    - Verificar permisos de un rol
    - Devolver permisos asignados

    Los roles se normalizan internamente a minúsculas para
    evitar inconsistencias entre base de datos y lógica.
    """

    ROLE_PERMISSIONS: Dict[str, List[str]] = {
        "ciudadano": [
            "CREATE_REPORT",
            "VIEW_OWN_REPORT",
            "ASK_INFO"
        ],
        "agente": [
            "VIEW_ALL_REPORTS",
            "GENERATE_STATS",
            "ANALYZE_ZONE"
        ],
        "admin": [
            "FULL_ACCESS"
        ]
    }

    # ==========================================================
    # UTILIDAD INTERNA
    # ==========================================================

    def _normalize_role(self, role: str | None) -> str | None:
        """
        Normaliza el rol a minúsculas.
        """
        if not role:
            return None
        return role.strip().lower()

    # ==========================================================
    # VALIDAR ROL
    # ==========================================================

    def is_role_allowed(self, role: str | None) -> bool:
        """
        Verifica si el rol existe en el sistema.
        """
        normalized_role = self._normalize_role(role)

        if normalized_role is None:
            return False

        return normalized_role in self.ROLE_PERMISSIONS

    # ==========================================================
    # VERIFICAR PERMISO
    # ==========================================================

    def has_permission(self, role: str | None, permission: str) -> bool:
        """
        Verifica si un rol tiene un permiso específico.
        """
        normalized_role = self._normalize_role(role)

        if normalized_role is None:
            return False

        permissions = self.ROLE_PERMISSIONS.get(normalized_role, [])

        return (
            permission in permissions
            or "FULL_ACCESS" in permissions
        )

    # ==========================================================
    # OBTENER PERMISOS
    # ==========================================================

    def get_permissions(self, role: str | None) -> List[str]:
        """
        Devuelve la lista de permisos del rol.
        """
        normalized_role = self._normalize_role(role)

        if normalized_role is None:
            return []

        return self.ROLE_PERMISSIONS.get(normalized_role, []).copy()