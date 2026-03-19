"""
Herramienta Base Común para Tools del Administrador.
Proporciona métodos utilitarios para consultas a la base de datos,
validación de parámetros y formateo de respuestas.
"""

from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging

from app.core.tools.admin.base.nlp_parser import nlp_parser


logger = logging.getLogger(__name__)


class BaseQueryTool:
    """
    Clase base para todas las tools de consulta.
    Proporciona utilidades comunes para:
    - Ejecución segura de queries
    - Validación de parámetros
    - Formateo de respuestas
    - Manejo de errores
    """

    def __init__(self, db):
        """
        Inicializa la herramienta base.
        
        Args:
            db: Sesión de la base de datos (SQLAlchemy)
        """
        self.db = db
        self.nlp = nlp_parser

    # ======================================================
    # EJECUCIÓN DE QUERIES
    # ======================================================

    def execute_query(
        self,
        query_text: str,
        params: Optional[Dict[str, Any]] = None,
        fetch_one: bool = False
    ) -> Tuple[bool, Any, Optional[str]]:
        """
        Ejecuta una query de forma segura.
        
        Args:
            query_text: Query SQL a ejecutar
            params: Parámetros para la query
            fetch_one: Si True, retorna solo un resultado
        
        Returns:
            Tupla (éxito, datos, mensaje_error)
        """
        try:
            query = text(query_text)
            params = params or {}
            
            if fetch_one:
                result = self.db.execute(query, params)
                row = result.mappings().first()
                return True, dict(row) if row else None, None
            else:
                result = self.db.execute(query, params)
                rows = result.mappings().all()
                return True, [dict(row) for row in rows], None
                
        except SQLAlchemyError as e:
            logger.exception(f"Error ejecutando query: {str(e)}")
            return False, None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            logger.exception(f"Error inesperado: {str(e)}")
            return False, None, f"Error inesperado: {str(e)}"

    def execute_query_with_count(
        self,
        query_text: str,
        params: Optional[Dict[str, Any]] = None,
        count_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ejecuta una query y retorna resultados con conteo total.
        
        Args:
            query_text: Query principal
            params: Parámetros
            count_query: Query opcional para contar (si hay paginación)
        
        Returns:
            Dict con 'success', 'data', 'total', 'error'
        """
        try:
            query = text(query_text)
            params = params or {}
            
            # Ejecutar query principal
            result = self.db.execute(query, params)
            rows = result.mappings().all()
            data = [dict(row) for row in rows]
            
            # Contar total
            total = len(data)
            
            return {
                "success": True,
                "data": data,
                "total": total,
                "error": None
            }
            
        except SQLAlchemyError as e:
            logger.exception(f"Error ejecutando query: {str(e)}")
            return {
                "success": False,
                "data": [],
                "total": 0,
                "error": f"Error de base de datos: {str(e)}"
            }
        except Exception as e:
            logger.exception(f"Error inesperado: {str(e)}")
            return {
                "success": False,
                "data": [],
                "total": 0,
                "error": f"Error inesperado: {str(e)}"
            }

    def execute_scalar(
        self,
        query_text: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Any, Optional[str]]:
        """
        Ejecuta una query que retorna un valor escalar.
        
        Returns:
            Tupla (éxito, valor, mensaje_error)
        """
        try:
            query = text(query_text)
            params = params or {}
            
            result = self.db.execute(query, params)
            row = result.fetchone()
            
            if row:
                value = row[0] if hasattr(row, '__getitem__') else row
                return True, value, None
            
            return True, 0, None
                
        except SQLAlchemyError as e:
            logger.exception(f"Error ejecutando scalar: {str(e)}")
            return False, 0, str(e)
        except Exception as e:
            logger.exception(f"Error inesperado: {str(e)}")
            return False, 0, str(e)

    # ======================================================
    # CONSTRUCCIÓN DE FILTROS
    # ======================================================

    def build_conditions(
        self,
        filters: Dict[str, Any],
        allowed_fields: List[str]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Construye condiciones WHERE dinámicamente.
        
        Args:
            filters: Dict de filtros a aplicar
            allowed_fields: Lista de campos permitidos para filtrar
        
        Returns:
            Tupla (condiciones_sql, params)
        """
        conditions = []
        params = {}
        
        for field, value in filters.items():
            if field not in allowed_fields:
                continue
            
            if value is None or value == "":
                continue
            
            # Manejar diferentes tipos de filtros
            if isinstance(value, list):
                # IN clause
                placeholders = [f":{field}_{i}" for i in range(len(value))]
                conditions.append(f"{field} IN ({', '.join(placeholders)})")
                for i, v in enumerate(value):
                    params[f"{field}_{i}"] = v
            elif isinstance(value, dict):
                # Rangos
                if "min" in value and value["min"] is not None:
                    conditions.append(f"{field} >= :{field}_min")
                    params[f"{field}_min"] = value["min"]
                if "max" in value and value["max"] is not None:
                    conditions.append(f"{field} <= :{field}_max")
                    params[f"{field}_max"] = value["max"]
            elif isinstance(value, str) and "%" in value:
                # LIKE
                conditions.append(f"{field} LIKE :{field}")
                params[field] = value
            else:
                # Equals
                conditions.append(f"{field} = :{field}")
                params[field] = value
        
        where_clause = " AND ".join(conditions)
        
        return where_clause, params

    def build_search_condition(
        self,
        search_term: str,
        fields: List[str]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Construye condición de búsqueda en múltiples campos.
        
        Args:
            search_term: Término de búsqueda
            fields: Campos donde buscar
        
        Returns:
            Tupla (condición_sql, params)
        """
        if not search_term or not fields:
            return "", {}
        
        # Escapar caracteres especiales para LIKE
        term = search_term.replace("%", r"\%").replace("_", r"\_")
        
        conditions = []
        params = {}
        
        for i, field in enumerate(fields):
            conditions.append(f"{field} LIKE :search_{i}")
            params[f"search_{i}"] = f"%{term}%"
        
        return f"({' OR '.join(conditions)})", params

    # ======================================================
    # VALIDACIÓN DE PARÁMETROS
    # ======================================================

    def validate_params(
        self,
        params: Dict[str, Any],
        required: List[str],
        optional: Optional[List[str]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Valida que estén presentes los parámetros requeridos.
        
        Returns:
            Tupla (es_válido, mensaje_error)
        """
        optional = optional or []
        allowed = required + optional
        
        # Verificar requeridos
        for field in required:
            if field not in params or params[field] is None:
                return False, f"Parámetro requerido faltante: {field}"
        
        # Verificar que no haya campos no reconocidos
        for field in params:
            if field not in allowed:
                return False, f"Parámetro no reconocido: {field}"
        
        return True, None

    def sanitize_params(
        self,
        params: Dict[str, Any],
        allowed: List[str]
    ) -> Dict[str, Any]:
        """
        Elimina parámetros no permitidos.
        """
        return {k: v for k, v in params.items() if k in allowed and v is not None}

    # ======================================================
    # FORMATEO DE RESPUESTAS
    # ======================================================

    def format_response(
        self,
        data: List[Dict[str, Any]],
        total: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Formatea una respuesta estándar para todas las tools.
        
        Args:
            data: Lista de resultados
            total: Total de registros (si es diferente de len(data))
            metadata: Metadatos adicionales
        
        Returns:
            Dict formateado consistentemente
        """
        if total is None:
            total = len(data)
        
        response = {
            "success": True,
            "total": total,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        if metadata:
            response["metadata"] = metadata
        
        return response

    def format_error(
        self,
        message: str,
        code: str = "ERROR"
    ) -> Dict[str, Any]:
        """
        Formatea una respuesta de error.
        """
        return {
            "success": False,
            "error": {
                "code": code,
                "message": message
            },
            "total": 0,
            "data": [],
            "timestamp": datetime.now().isoformat()
        }

    def format_empty(
        self,
        entity_name: str = "datos"
    ) -> Dict[str, Any]:
        """
        Formatea una respuesta cuando no hay datos.
        """
        return {
            "success": True,
            "total": 0,
            "data": [],
            "message": f"No se encontraron {entity_name}.",
            "timestamp": datetime.now().isoformat()
        }

    # ======================================================
    # UTILIDADES DE FORMATEO
    # ======================================================

    @staticmethod
    def format_fecha(row: Dict[str, Any], field: str = "fecha") -> Dict[str, Any]:
        """
        Formatea un campo de fecha en una fila.
        """
        if field in row and row[field]:
            if hasattr(row[field], 'strftime'):
                row[field] = row[field].strftime('%Y-%m-%d')
        return row

    @staticmethod
    def format_fecha_hora(row: Dict[str, Any], field: str = "fecha_hora") -> Dict[str, Any]:
        """
        Formatea un campo de fecha-hora en una fila.
        """
        if field in row and row[field]:
            if hasattr(row[field], 'strftime'):
                row[field] = row[field].strftime('%Y-%m-%d %H:%M:%S')
        return row

    @staticmethod
    def format_hora(row: Dict[str, Any], field: str = "hora") -> Dict[str, Any]:
        """
        Formatea un campo de hora en una fila.
        """
        if field in row and row[field]:
            if hasattr(row[field], 'seconds'):
                total_seconds = row[field].seconds
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                row[field] = f"{hours:02d}:{minutes:02d}"
            elif hasattr(row[field], 'strftime'):
                row[field] = row[field].strftime('%H:%M:%S')
            else:
                row[field] = str(row[field])
        return row

    @staticmethod
    def format_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Aplica formateo a múltiples filas, eliminando valores null.
        """
        formatted = []
        for row in rows:
            if isinstance(row, dict):
                # Eliminar campos con valor None o vacíos que no sirven
                row = {k: v for k, v in row.items() if v is not None and v != ''}
                
                # Formatear fechas comunes
                for field in ['fecha', 'fecha_creacion', 'fecha_incidente', 'fecha_asignacion']:
                    if field in row:
                        BaseQueryTool.format_fecha(row, field)
                for field in ['fecha_hora', 'created_at', 'updated_at']:
                    if field in row:
                        BaseQueryTool.format_fecha_hora(row, field)
                for field in ['hora', 'hora_incidente']:
                    if field in row:
                        BaseQueryTool.format_hora(row, field)
            formatted.append(row)
        return formatted

    # ======================================================
    # UTILIDADES DE PAGINACIÓN
    # ======================================================

    def paginate(
        self,
        data: List[Any],
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Pagina una lista de datos.
        
        Returns:
            Dict con datos de la página y metadatos de paginación
        """
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        
        total = len(data)
        total_pages = (total + page_size - 1) // page_size
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        page_data = data[start_idx:end_idx]
        
        return {
            "data": page_data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

    # ======================================================
    # UTILIDADES DE ORDENAMIENTO
    # ======================================================

    def order_by(
        self,
        data: List[Dict[str, Any]],
        sort_by: str = "id",
        order: str = "asc"
    ) -> List[Dict[str, Any]]:
        """
        Ordena una lista de diccionarios.
        """
        if not data:
            return data
        
        reverse = order.lower() == "desc"
        
        # Normalizar nombre del campo
        sort_key = sort_by.lower()
        
        # Intentar ordenar
        try:
            return sorted(data, key=lambda x: x.get(sort_key, ''), reverse=reverse)
        except Exception:
            return data


# Instancia global para uso rápido
base_query_tool = None


def get_base_query_tool(db):
    """Factory para obtener instancia de BaseQueryTool."""
    global base_query_tool
    if base_query_tool is None:
        base_query_tool = BaseQueryTool(db)
    else:
        base_query_tool.db = db
    return base_query_tool
