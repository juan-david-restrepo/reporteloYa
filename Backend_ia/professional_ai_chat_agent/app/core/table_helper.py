"""
Módulo centralizado para generar tablas HTML con estilos.
Permite mostrar datos en formato tabla en el chat del frontend.
"""

# Colores por defecto para cada estado de reporte
ESTADO_COLORS = {
    # Estados de reportes
    "pendiente": {"bg": "#fff3cd", "text": "#856404", "border": "#ffc107"},
    "aprobado": {"bg": "#d4edda", "text": "#155724", "border": "#28a745"},
    "rechazado": {"bg": "#f8d7da", "text": "#721c24", "border": "#dc3545"},
    "resuelto": {"bg": "#d4edda", "text": "#155724", "border": "#28a745"},
    "completado": {"bg": "#d4edda", "text": "#155724", "border": "#28a745"},
    "en_proceso": {"bg": "#cce5ff", "text": "#004085", "border": "#007bff"},
    "nuevo": {"bg": "#e2e3e5", "text": "#383d41", "border": "#6c757d"},
    "urgente": {"bg": "#f8d7da", "text": "#721c24", "border": "#dc3545"},
    # Estados de tareas
    "PENDIENTE": {"bg": "#fff3cd", "text": "#856404", "border": "#ffc107"},
    "COMPLETADA": {"bg": "#d4edda", "text": "#155724", "border": "#28a745"},
    "EN_PROCESO": {"bg": "#cce5ff", "text": "#004085", "border": "#007bff"},
    "COMPLETADO": {"bg": "#d4edda", "text": "#155724", "border": "#28a745"},
}

# Mapeo de estados normalizados para búsqueda sin importar mayúsculas
ESTADO_COLORS_LOWER = {k.lower(): v for k, v in ESTADO_COLORS.items()}


def get_estado_class(estado_value):
    """
    Retorna la clase CSS según el valor del estado.
    Si el estado no se reconoce, retorna None.
    """
    if not estado_value:
        return None
    
    estado_str = str(estado_value).strip().lower()
    
    # Buscar en mapeo directo
    if estado_str in ESTADO_COLORS_LOWER:
        return ESTADO_COLORS_LOWER[estado_str]
    
    # Buscar coincidencia parcial
    for key, colors in ESTADO_COLORS_LOWER.items():
        if key in estado_str or estado_str in key:
            return colors
    
    return None


def to_html_table(data, titulo="", show_index=True, column_mapping=None):
    """
    Convierte datos (lista de dicts o dict con listas) a tabla HTML con estilos.
    
    Args:
        data: Lista de diccionarios o diccionario con claves que contienen listas
        titulo: Título opcional para la tabla
        show_index: Si True, muestra índice de fila
        column_mapping: Dict opcional para renombrar columnas {nombre_original: nombre_mostrar}
    
    Returns:
        String con HTML de la tabla
    """
    if not data:
        return ""
    
    # Determinar si es dict con listas (como {tareas_del_dia: [], tareas_pendientes: []})
    # o una lista directa de diccionarios
    if isinstance(data, dict):
        # Es un dict - puede ser {key: [lista]} o {key: valor_simple}
        # Si tiene listas, generar múltiples tablas
        tables_html = []
        
        for section_title, section_data in data.items():
            if isinstance(section_data, list) and section_data:
                table_html = _build_single_table(section_data, section_title, show_index, column_mapping)
                if table_html:
                    tables_html.append(table_html)
        
        if tables_html:
            return "\n".join(tables_html)
        
        # Si es dict simple (no listas), convertir a lista
        data = [data]
    
    if isinstance(data, list):
        if not data:
            return ""
        return _build_single_table(data, titulo, show_index, column_mapping)
    
    return str(data)


def _build_single_table(data_list, titulo="", show_index=True, column_mapping=None):
    """
    Construye una tabla HTML a partir de una lista de diccionarios.
    
    Args:
        data_list: Lista de diccionarios con los datos
        titulo: Título opcional de la tabla
        show_index: Si True, muestra índice de fila
        column_mapping: Dict opcional para renombrar columnas {nombre_original: nombre_mostrar}
    """
    if not data_list:
        return ""
    
    # Asegurar que todos los elementos sean dicts
    rows = []
    for item in data_list:
        # Manejar diferentes tipos de objetos de base de datos
        if hasattr(item, '_mapping'):
            # Es un objeto Row de SQLAlchemy con ._mapping
            rows.append(dict(item._mapping))
        elif hasattr(item, 'keys') and callable(item.keys):
            # Es un objeto que se puede convertir a dict
            rows.append(dict(item))
        elif isinstance(item, dict):
            rows.append(item)
        else:
            rows.append({"valor": item})
    
    if not rows:
        return ""
    
    # Obtener columnas (keys del primer dict)
    columns = list(rows[0].keys())
    
    # Filtrar columnas no deseadas
    columns = [col for col in columns if col not in ('_mapping',)]
    
    # Aplicar mapeo de columnas si existe
    if column_mapping:
        columns = [column_mapping.get(col, col) for col in columns]
        # Also map the data keys
        mapped_rows = []
        for row in rows:
            mapped_row = {}
            for key, value in row.items():
                new_key = column_mapping.get(key, key)
                mapped_row[new_key] = value
            mapped_rows.append(mapped_row)
        rows = mapped_rows
    
    if not columns:
        return ""
    
    # Determinar si hay columna 'estado' para aplicar colores
    has_estado = 'estado' in columns
    
    # Construir HTML de la tabla
    html = []
    
    # Título de la sección (si existe)
    if titulo:
        # Convertir snake_case a título legible
        titulo_legible = titulo.replace('_', ' ').title()
        html.append(f'<div class="table-section-title">{titulo_legible}</div>')
    
    html.append('<table class="data-table">')
    
    # Header
    html.append('<thead><tr>')
    if show_index:
        html.append('<th>#</th>')
    
    for col in columns:
        col_legible = col.replace('_', ' ').title()
        html.append(f'<th>{col_legible}</th>')
    html.append('</tr></thead>')
    
    # Body
    html.append('<tbody>')
    for idx, row in enumerate(rows, 1):
        # Verificar si tiene estado para aplicar color
        estado_class = ""
        if has_estado and 'estado' in row:
            colors = get_estado_class(row['estado'])
            if colors:
                estado_class = f' style="background-color: {colors["bg"]}; color: {colors["text"]};"'
        
        html.append(f'<tr>')
        if show_index:
            html.append(f'<td>{idx}</td>')
        
        for col in columns:
            value = row.get(col, '-')
            # Convertir valores a string
            if hasattr(value, 'strftime'):
                value = value.strftime("%Y-%m-%d")
            elif hasattr(value, 'seconds'):
                # timedelta para horas
                total_seconds = value.seconds
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                value = f"{hours:02d}:{minutes:02d}"
            else:
                value = str(value) if value is not None else '-'
            
            # Si es la columna de estado, aplicar clase especial
            if col == 'estado' and has_estado:
                colors = get_estado_class(value)
                if colors:
                    html.append(f'<td class="estado-badge" style="background-color: {colors["bg"]}; color: {colors["text"]}; border: 1px solid {colors["border"]};">{value}</td>')
                else:
                    html.append(f'<td>{value}</td>')
            else:
                html.append(f'<td>{value}</td>')
        
        html.append('</tr>')
    
    html.append('</tbody>')
    html.append('</table>')
    
    return '\n'.join(html)


def format_estadistica(data, titulo=""):
    """
    Formatea datos de estadísticas simples (como {key: valor}) en una tabla HTML.
    Útil para métricas y resúmenes.
    """
    if not data or not isinstance(data, dict):
        return ""
    
    # Verificar si es un dict con valores simples (no listas)
    has_lists = any(isinstance(v, list) for v in data.values())
    
    if has_lists:
        # Usar to_html_table para dicts con listas
        return to_html_table(data, titulo)
    
    # Es dict simple - convertir a tabla de una fila
    html = []
    
    if titulo:
        titulo_legible = titulo.replace('_', ' ').title()
        html.append(f'<div class="table-section-title">{titulo_legible}</div>')
    
    html.append('<table class="data-table stats-table">')
    html.append('<tbody>')
    
    for key, value in data.items():
        key_legible = key.replace('_', ' ').title()
        html.append(f'<tr><td>{key_legible}</td><td><strong>{value}</strong></td></tr>')
    
    html.append('</tbody>')
    html.append('</table>')
    
    return '\n'.join(html)
