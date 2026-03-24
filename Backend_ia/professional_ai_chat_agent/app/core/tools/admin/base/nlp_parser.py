"""
Capa de Normalización NLP para Tools del Administrador.
Proporciona utilidades para interpretar lenguaje natural,
detectar entidades y mapear sinónimos.
"""

import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum


class EstadoReporte(Enum):
    """Estados válidos de reportes."""
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    ASIGNADO = "asignado"
    EN_PROCESO = "en_proceso"
    FINALIZADO = "finalizado"
    RESUELTO = "resuelto"
    CANCELADO = "cancelado"


class EstadoTarea(Enum):
    """Estados válidos de tareas."""
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class EstadoAgente(Enum):
    """Estados válidos de agentes."""
    DISPONIBLE = "disponible"
    OCUPADO = "ocupado"
    INACTIVO = "inactivo"
    ASIGNADO = "asignado"


class Prioridad(Enum):
    """Prioridades válidas."""
    URGENTE = "urgente"
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class TipoInfraccion(Enum):
    """Tipos comunes de infracciones."""
    ESTACIONAMIENTO = "estacionamiento"
    EXCESO_VELOCIDAD = "exceso_velocidad"
    SEMAFORO = "semáforo"
    PEATON = "peatón"
    DOBLE_LINEA = "doble_linea"
    ZONA_RESIDENCIAL = "zona_residencial"
    NO_CINTURON = "no_cinturon"
    CELULAR = "celular"
    DOCUMENTOS = "documentos"
    PLACA = "placa"
    OTRO = "otro"


class NLPParser:
    """
    Parser de lenguaje natural para interpretación de solicitudes.
    Proporciona métodos para normalizar texto y extraer entidades.
    """

    # ======================================================
    # DICCIONARIOS DE SINÓNIMOS Y MAPEOS
    # ======================================================

    # Mapeo de sinónimos de estados de reportes
    ESTADO_SINONIMOS = {
        "pendiente": ["pendiente", "por_aprobar", "sin_revisar", "nuevo", "nueva", "reportado", "recibido"],
        "aprobado": ["aprobado", "aceptado", "confirmado", "validado", "aprobada", "aceptada"],
        "rechazado": ["rechazado", "denegado", "cancelado", "rechazada", "denegada"],
        "asignado": ["asignado", "asignada", "delegado", "encargado"],
        "en_proceso": ["en_proceso", "proceso", "en_trámite", "tramite", "atendiendo", "procesando"],
        "finalizado": ["finalizado", "terminado", "completado", "cerrado", "hecho"],
        "resuelto": ["resuelto", "solucionado", "atendido"],
        "cancelado": ["cancelado", "anulado", "anulada"]
    }

    # Mapeo de sinónimos de estados de tareas
    ESTADO_TAREA_SINONIMOS = {
        "PENDIENTE": ["pendiente", "por_hacer", "sin_iniciar", "sin_empezar", "esperando"],
        "EN_PROCESO": ["en_proceso", "proceso", "en_curso", "curso", "avanzando", "trabajando"],
        "COMPLETADA": ["completada", "completado", "hecha", "hecho", "terminada", "terminado", "finalizada", "finalizado", "lista"],
        "CANCELADA": ["cancelada", "cancelado", "anulada", "anulado"]
    }

    # Mapeo de sinónimos de estados de agentes
    ESTADO_AGENTE_SINONIMOS = {
        "DISPONIBLE": ["disponible", "libre", "libre", "activo", "online", "operativo", "lista"],
        "OCUPADO": ["ocupado", "trabajando", "en_misión", "mision", "atendiendo"],
        "INACTIVO": ["inactivo", "offline", "desconectado", "no_disponible", "ausente"],
        "ASIGNADO": ["asignado", "en_actividad", "comprometido"]
    }

    # Mapeo de sinónimos de prioridades
    PRIORIDAD_SINONIMOS = {
        "urgente": ["urgente", "urgencia", "emergencia", "inmediato", "crítico", "critico", "prioridad_maxima"],
        "alta": ["alta", "importante", "prioridad_alta", "prioritaria"],
        "media": ["media", "normal", "regular", "estándar", "estandar"],
        "baja": ["baja", "menor", "sin_urgencia", "cuando_sea"]
    }

    # Mapeo de tipos de infracciones
    INFRACCION_SINONIMOS = {
        "estacionamiento": ["estacionamiento", "estacionar", "estacionado", "parquear", "parqueo", "parado", 
                           "mal_estacionado", "mal_parqueado", "bloqueando", "bloqueo"],
        "exceso_velocidad": ["velocidad", "exceso", "rápido", "rapido", "excesiva", "corriendo"],
        "semáforo": ["semáforo", "semaforo", "luz_roja", "luz", "rojo", "resaltar_semaforo"],
        "peatón": ["peatón", "peaton", "cruce", "cruzar", "pasajero", "atropello"],
        "doble_linea": ["doble_linea", "doble_línea", "línea_amarilla", "linea_amarilla", "contraflujo", "adelantar"],
        "zona_residencial": ["zona_residencial", "zona_escolar", "escolar", "residencial", "calle", "area"],
        "no_cinturon": ["cinturón", "cinturon", "seguridad", "arnes", "sin_cinturon"],
        "celular": ["celular", "móvil", "movil", "teléfono", "telefono", "whatsapp", "usando_celular"],
        "documentos": ["documentos", "documentación", "documentacion", "licencia", "soat", "tarjeta", "vencido"],
        "placa": ["placa", "matrícula", "matricula", "patente", "carro", "vehículo", "vehiculo"],
        "accidente": ["accidente", "chocar", "chocaron", "se_chocaron", "colision", "colisión", 
                     "accidente_de_transito", "carro_chocado", "auto_chocado", "vehículo_dañado"]
    }

    # Palabras clave para detección de intención
    INTENTION_KEYWORDS = {
        "obtener_agentes": [
            "agentes", "agente", "listar_agentes", "ver_agentes", "mostrar_agentes",
            "cuántos_agentes", "cuantos_agentes", "estado_agentes", "disponibles",
            "agentes_activos", "agente de tránsito", "agente de transito"
        ],
        "obtener_tareas": [
            "tareas", "tarea", "listar_tareas", "ver_tareas", "mostrar_tareas",
            "pendientes", "agenda", "calendario", "hoy", "mañana"
        ],
        "reportes_del_dia": [
            "reportes_hoy", "reportes_del_día", "reportes_de_hoy", "incidentes_hoy",
            "reportes_hoy", "hoy", "del_día"
        ],
        "reportes_por_estado": [
            "reportes_pendientes", "reportes_aprobados", "reportes_rechazados",
            "reportes_en_proceso", "reportes_finalizados", "por_estado"
        ],
        "estadisticas_reportes": [
            "estadísticas", "estadisticas", "métricas", "metricas", "resumen",
            "reporte_general", "overview", "dashboard"
        ],
        "system_overview": [
            "sistema", "overview", "resumen", "estado_general", "dashboard",
            "Resumen del sistema", "estado del sistema"
        ],
        "generar_reporte_pdf": [
            "pdf", "descargar", "exportar", "generar_reporte", "crear_pdf",
            "reporte_pdf", "imprimir"
        ],
        # ====== INTENCIONES DE CIUDADANO ======
        "crear_reporte": [
            # Variaciones de reportar
            "reportar", "reportar infraccion", "reportar infracción", "reportar incidente", "crear reporte",
            "nuevo reporte", "reportar transgresion", "reportar falta", "denunciar",
            "reportar vehiculo", "reportar vehículo", "reportar conductor", "reportar multa", "reportar",
            "quiero reportar", "necesito reportar", "como reporto", "reportar algo",
            # Variaciones de accidente
            "accidente", "hubo un accidente", "se chocaron", "chocar", "colision", "colisión",
            "se accidentaron", "carro chocado", "auto chocado", "vehículo dañado",
            # Variaciones de emergencia
            "emergencia", "urgencia", "auxilio", "ayuda",
            # Variaciones de infracción
            "infraccion", "infracción", "multa", "transgresion", "transgresión",
            # Variaciones de reportar problema
            "reportar problema", "reportar daño", "reportar incidente de transito"
        ],
        "mis_reportes": [
            "mis reportes", "mis reportajes", "mis incidentes", "mis denuncias",
            "ver reportes", "mostrar reportes", "consultar reportes", "que reportes tengo",
            "cuantos reportes", "reportes que he hecho", "mis reportes enviados",
            "historial de reportes", "tengo reportes", "mis cosas reportadas",
            "quiero ver mis reportes", "muestrame mis reportes", "dame mis reportes",
            "donde veo mis reportes", "acceder a mis reportes", "ver mis reportes",
            "consultar mis reportes", "mostrar mis reportes", "mis reportes",
            "mis casos", "mis reportes ciudadano"
        ],
        "estadisticas_mis_reportes": [
            "estadisticas de mis reportes", "mis estadisticas", "mis estadísticas", "cuantos reportes tengo",
            "como van mis reportes", "estado de mis reportes", "mis reportes pendientes",
            "mis reportes resueltos", "reporte de mis reportes", "resumen de mis reportes",
            "metricas de mis reportes", "cuenta de reportes", "total de reportes",
            "informe de mis reportes", "reporte de mis casos", "mis numeros de reportes"
        ]
    }

    # ======================================================
    # MÉTODOS DE NORMALIZACIÓN
    # ======================================================

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normaliza texto: minúsculas, elimina acentos, espacios extra.
        """
        if not text:
            return ""
        
        text = text.lower().strip()
        
        # Eliminar acentos
        text = unicodedata.normalize('NFD', text)
        text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        
        # Reemplazar caracteres especiales
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Eliminar espacios múltiples
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    @staticmethod
    def normalize_spanish(text: str) -> str:
        """
        Normaliza texto conservando caracteres españoles.
        """
        if not text:
            return ""
        
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    # ======================================================
    # DETECCIÓN DE ENTIDADES
    # ======================================================

    @staticmethod
    def detect_estado(text: str, tipo: str = "reporte") -> Optional[str]:
        """
        Detecta el estado mencionado en el texto.
        
        Args:
            text: Texto a analizar
            tipo: Tipo de entidad (reporte, tarea, agente)
        
        Returns:
            Estado normalizado o None
        """
        text_normalized = NLPParser.normalize_spanish(text)
        
        sinonimos_map = {
            "reporte": NLPParser.ESTADO_SINONIMOS,
            "tarea": NLPParser.ESTADO_TAREA_SINONIMOS,
            "agente": NLPParser.ESTADO_AGENTE_SINONIMOS
        }
        
        sinonimos = sinonimos_map.get(tipo, NLPParser.ESTADO_SINONIMOS)
        
        for estado, keywords in sinonimos.items():
            for keyword in keywords:
                if keyword in text_normalized:
                    # Verificar que no sea parte de otra palabra
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, text_normalized):
                        return estado
        
        return None

    @staticmethod
    def detect_prioridad(text: str) -> Optional[str]:
        """
        Detecta la prioridad mencionada en el texto.
        """
        text_normalized = NLPParser.normalize_spanish(text)
        
        for prioridad, keywords in NLPParser.PRIORIDAD_SINONIMOS.items():
            for keyword in keywords:
                if keyword in text_normalized:
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, text_normalized):
                        return prioridad
        
        return None

    @staticmethod
    def detect_tipo_infraccion(text: str) -> Optional[str]:
        """
        Detecta el tipo de infracción mencionado en el texto.
        """
        text_normalized = NLPParser.normalize_spanish(text)
        
        for tipo, keywords in NLPParser.INFRACCION_SINONIMOS.items():
            for keyword in keywords:
                if keyword in text_normalized:
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, text_normalized):
                        return tipo
        
        return None

    @staticmethod
    def extract_placa(text: str) -> Optional[str]:
        """
        Extrae una placa o matrícula del texto.
        Formatos soportados: ABC-123, ABC123, ABC 123
        """
        if not text:
            return None
        
        # Patrón para placas colombianas: 3 letras + guión/espacio + 3 números
        patterns = [
            r'\b([A-Za-z]{3}[-\s]\d{3})\b',  # ABC-123 o ABC 123
            r'\b([A-Za-z]{3}\d{3})\b',        # ABC123
            r'\b(placa[:\s]*([A-Za-z]{3}[-\s]?\d{0,3}))\b',  # placa ABC-123
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                placa = match.group(1) if match.lastindex == 1 else match.group(2)
                return placa.upper().replace(' ', '-')
        
        return None

    @staticmethod
    def extract_fecha(text: str) -> Optional[Dict[str, str]]:
        """
        Extrae referencias de fecha del texto.
        
        Returns:
            Dict con 'fecha_inicio' y 'fecha_fin' en formato YYYY-MM-DD
        """
        if not text:
            return None
        
        text_lower = text.lower()
        now = datetime.now()
        
        fecha_result = {}
        
        # Hoy
        if 'hoy' in text_lower:
            fecha_result['fecha_inicio'] = now.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = now.strftime('%Y-%m-%d')
            return fecha_result
        
        # Ayer
        if 'ayer' in text_lower:
            yesterday = now - timedelta(days=1)
            fecha_result['fecha_inicio'] = yesterday.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = yesterday.strftime('%Y-%m-%d')
            return fecha_result
        
        # Mañana
        if 'mañana' in text_lower or 'manana' in text_lower:
            tomorrow = now + timedelta(days=1)
            fecha_result['fecha_inicio'] = tomorrow.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = tomorrow.strftime('%Y-%m-%d')
            return fecha_result
        
        # Pasado mañana
        if 'pasado mañana' in text_lower or 'pasado manana' in text_lower:
            day_after = now + timedelta(days=2)
            fecha_result['fecha_inicio'] = day_after.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = day_after.strftime('%Y-%m-%d')
            return fecha_result
        
        # Esta semana
        if 'esta semana' in text_lower or 'semana actual' in text_lower:
            # Desde el lunes de esta semana
            monday = now - timedelta(days=now.weekday())
            fecha_result['fecha_inicio'] = monday.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = now.strftime('%Y-%m-%d')
            return fecha_result
        
        # Semana pasada
        if 'semana pasada' in text_lower or 'la semana pasada' in text_lower:
            monday = now - timedelta(days=now.weekday() + 7)
            sunday = monday + timedelta(days=6)
            fecha_result['fecha_inicio'] = monday.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = sunday.strftime('%Y-%m-%d')
            return fecha_result
        
        # Mes actual
        if 'este mes' in text_lower or 'mes actual' in text_lower:
            first_day = now.replace(day=1)
            fecha_result['fecha_inicio'] = first_day.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = now.strftime('%Y-%m-%d')
            return fecha_result
        
        # Mes pasado
        if 'mes pasado' in text_lower or 'el mes pasado' in text_lower:
            first_day = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
            last_day = now.replace(day=1) - timedelta(days=1)
            fecha_result['fecha_inicio'] = first_day.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = last_day.strftime('%Y-%m-%d')
            return fecha_result
        
        # Últimos X días
        match = re.search(r'ultimos?\s*(\d+)\s*d[ií]as?', text_lower)
        if match:
            days = int(match.group(1))
            start_date = now - timedelta(days=days)
            fecha_result['fecha_inicio'] = start_date.strftime('%Y-%m-%d')
            fecha_result['fecha_fin'] = now.strftime('%Y-%m-%d')
            return fecha_result
        
        # Fecha específica: DD de MES de AAAA
        meses = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
            'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        for mes_nombre, mes_num in meses.items():
            if mes_nombre in text_lower:
                # Buscar día
                match_dia = re.search(r'(\d{1,2})\s*de\s*' + mes_nombre, text_lower)
                if match_dia:
                    dia = int(match_dia.group(1))
                    # Buscar año
                    match_año = re.search(r'(\d{4})', text)
                    año = int(match_año.group(1)) if match_año else now.year
                    
                    try:
                        fecha = datetime(año, mes_num, dia)
                        fecha_result['fecha_inicio'] = fecha.strftime('%Y-%m-%d')
                        fecha_result['fecha_fin'] = fecha.strftime('%Y-%m-%d')
                        return fecha_result
                    except ValueError:
                        pass
        
        # Rango de fechas: del X al Y
        rango_match = re.search(
            r'desde\s*el?\s*(\d{1,2})\s*de?\s*(\w+)(?:\s*al\s*(\d{1,2})\s*de?\s*(\w+))?',
            text_lower
        )
        if rango_match:
            dia_inicio = int(rango_match.group(1))
            mes_inicio = rango_match.group(2)
            
            if mes_inicio in meses:
                try:
                    año = now.year
                    fecha_inicio = datetime(año, meses[mes_inicio], dia_inicio)
                    fecha_result['fecha_inicio'] = fecha_inicio.strftime('%Y-%m-%d')
                    
                    if rango_match.group(3) and rango_match.group(4):
                        dia_fin = int(rango_match.group(3))
                        mes_fin = rango_match.group(4)
                        if mes_fin in meses:
                            fecha_fin = datetime(año, meses[mes_fin], dia_fin)
                            fecha_result['fecha_fin'] = fecha_fin.strftime('%Y-%m-%d')
                    else:
                        fecha_result['fecha_fin'] = fecha_inicio.strftime('%Y-%m-%d')
                    
                    return fecha_result
                except ValueError:
                    pass
        
        return None

    @staticmethod
    def extract_telefono(text: str) -> Optional[str]:
        """
        Extrae un número de teléfono del texto.
        """
        if not text:
            return None
        
        # Patrones comunes de teléfono
        patterns = [
            r'\b(\d{10})\b',           # 3001234567
            r'\b(\d{3}[-\s]\d{3}[-\s]\d{4})\b',  # 300-123-4567
            r'\b\(\d{3}\)\s*\d{3}[-\s]?\d{4}\b',  # (300) 123-4567
            r'\b\+\d{1,3}\s*\d{3}\s*\d{3}\s*\d{4}\b',  # +57 300 123 4567
            r'tel[:\s]*(\d+)',  # tel: 3001234567
            r'cel[:\s]*(\d+)',  # cel: 3001234567
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1) if match.lastindex else match.group(0)
        
        return None

    # ======================================================
    # DETECCIÓN DE INTENCIÓN
    # ======================================================

    @staticmethod
    def detect_intention(text: str) -> str:
        """
        Detecta la intención del usuario basándose en palabras clave.
        
        Returns:
            Nombre de la tool a ejecutar
        """
        text_normalized = NLPParser.normalize_text(text)
        
        for tool_name, keywords in NLPParser.INTENTION_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_normalized:
                    return tool_name
        
        # Detección por contexto más específica
        text_lower = text.lower()
        
        # Si menciona agente, siempre usar tool de agentes
        if any(p in text_lower for p in ['agente', 'agentes', 'agente de transito']):
            return 'obtener_agentes'
        
        # Si menciona tareas
        if any(p in text_lower for p in ['tarea', 'tareas', 'pendientes', 'agenda']):
            return 'obtener_tareas'
        
        # Si menciona reportes
        if any(p in text_lower for p in ['reporte', 'reportes', 'incidencia', 'incidentes']):
            if 'pdf' in text_lower or 'descargar' in text_lower or 'exportar' in text_lower:
                return 'generar_reporte_pdf'
            if 'estadistica' in text_lower or 'métrica' in text_lower:
                return 'estadisticas_reportes'
            if 'hoy' in text_lower or 'día' in text_lower:
                return 'reportes_del_dia'
            return 'estadisticas_reportes'
        
        # Si menciona sistema
        if any(p in text_lower for p in ['sistema', 'overview', 'resumen']):
            return 'system_overview'
        
        # ====== DETECCIÓN DE INTENCIONES DE CIUDADANO ======
        # Si el usuario menciona "mis reportes" o palabras relacionadas
        if any(p in text_lower for p in ['mis reportes', 'mis reportajes', 'mis incidentes', 'mis denuncias',
            'ver reportes', 'mostrar reportes', 'consultar reportes', 'qué reportes tengo',
            'cuántos reportes', 'historial', 'tengo reportes']):
            return 'mis_reportes'
        
        # Si menciona estadísticas de sus propios reportes
        if any(p in text_lower for p in ['mis estadísticas', 'mis métricas', 'cuenta de mis reportes',
            'cuántos tengo', 'cómo van mis']):
            return 'estadisticas_mis_reportes'
        
        # Si quiere reportar/denunciar algo
        if any(p in text_lower for p in ['reportar', 'denunciar', 'crear reporte', 'nuevo reporte',
            'reportar vehículo', 'reportar conductor', 'reportar infracción']):
            return 'crear_reporte'
        
        return "NONE"

    # ======================================================
    # EXTRACCIÓN DE PARÁMETROS
    # ======================================================

    @staticmethod
    def extract_params(text: str) -> Dict[str, Any]:
        """
        Extrae todos los parámetros relevantes del texto.
        
        Returns:
            Dict con los parámetros detectados
        """
        params = {}
        
        # Estado
        estado = NLPParser.detect_estado(text, "reporte")
        if not estado:
            estado = NLPParser.detect_estado(text, "tarea")
        if not estado:
            estado = NLPParser.detect_estado(text, "agente")
        if estado:
            params['estado'] = estado
        
        # Prioridad
        prioridad = NLPParser.detect_prioridad(text)
        if prioridad:
            params['prioridad'] = prioridad
        
        # Placa
        placa = NLPParser.extract_placa(text)
        if placa:
            params['placa'] = placa
        
        # Teléfono
        telefono = NLPParser.extract_telefono(text)
        if telefono:
            params['telefono'] = telefono
        
        # Fecha
        fecha = NLPParser.extract_fecha(text)
        if fecha:
            params.update(fecha)
        
        # Tipo de infracción
        tipo_infraccion = NLPParser.detect_tipo_infraccion(text)
        if tipo_infraccion:
            params['tipo_infraccion'] = tipo_infraccion
        
        # Búsqueda de texto
        text_normalized = NLPParser.normalize_text(text)
        search_terms = []
        
        # Buscar nombres o direcciones mencionadas
        words = text_normalized.split()
        stop_words = {'el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'por', 'para',
                      'que', 'cual', 'donde', 'cuando', 'como', 'qué', 'cuál'}
        
        for word in words:
            if word not in stop_words and len(word) > 2:
                search_terms.append(word)
        
        if search_terms:
            params['busqueda'] = ' '.join(search_terms[:5])  # Máximo 5 términos
        
        return params

    # ======================================================
    # VALIDACIÓN
    # ======================================================

    @staticmethod
    def validate_estado(estado: str, tipo: str = "reporte") -> bool:
        """
        Valida que un estado sea válido para el tipo dado.
        """
        if not estado:
            return False
        
        estado_normalized = estado.lower().strip()
        
        if tipo == "reporte":
            return estado_normalized in [e.value for e in EstadoReporte]
        elif tipo == "tarea":
            return estado_normalized.upper() in [e.value for e in EstadoTarea]
        elif tipo == "agente":
            return estado_normalized.upper() in [e.value for e in EstadoAgente]
        
        return False

    @staticmethod
    def validate_prioridad(prioridad: str) -> bool:
        """
        Valida que una prioridad sea válida.
        """
        if not prioridad:
            return False
        
        return prioridad.lower() in [p.value for p in Prioridad]

    @staticmethod
    def validate_fecha(fecha_str: str) -> bool:
        """
        Valida que una fecha tenga formato correcto.
        """
        if not fecha_str:
            return False
        
        try:
            datetime.strptime(fecha_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False

    # ======================================================
    # FORMATEO DE RESPUESTAS
    # ======================================================

    @staticmethod
    def format_fecha_display(fecha_str: str) -> str:
        """
        Formatea una fecha para mostrar de forma amigable.
        """
        if not fecha_str:
            return "No especificada"
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d')
            meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                     'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
            return f"{fecha.day} de {meses[fecha.month - 1]} de {fecha.year}"
        except ValueError:
            return fecha_str

    @staticmethod
    def format_estado_display(estado: str) -> str:
        """
        Formatea un estado para mostrar de forma amigable.
        """
        if not estado:
            return "No especificado"
        
        estados_display = {
            'pendiente': 'Pendiente',
            'aprobado': 'Aprobado',
            'rechazado': 'Rechazado',
            'asignado': 'Asignado',
            'en_proceso': 'En Proceso',
            'finalizado': 'Finalizado',
            'resuelto': 'Resuelto',
            'cancelado': 'Cancelado',
            'PENDIENTE': 'Pendiente',
            'EN_PROCESO': 'En Proceso',
            'COMPLETADA': 'Completada',
            'CANCELADA': 'Cancelada',
            'DISPONIBLE': 'Disponible',
            'OCUPADO': 'Ocupado',
            'INACTIVO': 'Inactivo'
        }
        
        return estados_display.get(estado.lower(), estado.capitalize())

    @staticmethod
    def format_prioridad_display(prioridad: str) -> str:
        """
        Formatea una prioridad para mostrar de forma amigable.
        """
        if not prioridad:
            return "No especificada"
        
        prioridades_display = {
            'urgente': 'Urgente',
            'alta': 'Alta',
            'media': 'Media',
            'baja': 'Baja'
        }
        
        return prioridades_display.get(prioridad.lower(), prioridad.capitalize())


# Instancia global para uso rápido
nlp_parser = NLPParser()
