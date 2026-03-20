import requests
import re
import json
import dateparser
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.services.llm_service import LLMService
from app.utils.logger import logger


ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/26766525/uxipdqf/"


class AgendaTool:
    """
    Tool profesional de agendamiento para agentes IA.
    Compatible con Brain + LLMService + sistema de tools.
    """

    def __init__(self, llm_service: LLMService, webhook_url: str = ZAPIER_WEBHOOK_URL):
        self.llm = llm_service
        self.webhook_url = webhook_url
        self._user_id_temp = None  # FIX: Para flujo conversacional

    # ---------------------------------------------------------
    # UTILIDADES
    # ---------------------------------------------------------

    @staticmethod
    def _parse_fecha_hora(texto: str):
        """
        Parser mejorado de fecha y hora usando dateparser.
        Soporta: "16 de marzo", "mañana a las 9", "viernes a las 3",
        "en 2 horas", "hoy en la tarde", "pasado mañana", "el 16 de marzo", etc.
        
        IMPORTANTE: Si no se encuentra fecha/hora, retorna None para pedir al usuario.
        """
        if not texto:
            return None, None
            
        texto_lower = texto.lower().strip()
        
        # Extraer hora explícita primero usando regex
        hora_explicita = None
        minuto_explicito = 0
        
        # Buscar patrones de hora: HH:MM, HHam/pm, a las HH
        match_hhmm = re.search(r'(\d{1,2}):(\d{2})', texto_lower)
        if match_hhmm:
            hora_explicita = int(match_hhmm.group(1))
            minuto_explicito = int(match_hhmm.group(2))
        
        if not hora_explicita:
            match_ampm = re.search(r'(\d{1,2})\s*(am|pm)', texto_lower)
            if match_ampm:
                hora_explicita = int(match_ampm.group(1))
                sufijo = match_ampm.group(2)
                if sufijo == 'pm' and hora_explicita < 12:
                    hora_explicita += 12
                elif sufijo == 'am' and hora_explicita == 12:
                    hora_explicita = 0
        
        if not hora_explicita:
            match_a_las = re.search(r'a\s*las\s*(\d{1,2})(?::(\d{2}))?', texto_lower)
            if match_a_las:
                hora_explicita = int(match_a_las.group(1))
                if match_a_las.group(2):
                    minuto_explicito = int(match_a_las.group(2))
                if 'tarde' in texto_lower and hora_explicita < 12:
                    hora_explicita += 12
                elif 'noche' in texto_lower and hora_explicita < 12:
                    hora_explicita += 12
        
        # Preprocesar: eliminar "el" al inicio para dateparser
        texto_procesado = texto_lower
        if texto_lower.startswith('el '):
            texto_procesado = texto_lower[3:]
        
        ahora = datetime.now()

        fecha = None
        hora = None
        minuto = 0

        # --- Intentar primero con dateparser ---
        try:
            parsed = dateparser.parse(
                texto_procesado,
                languages=['es'],
                settings={
                    'PREFER_DAY_OF_MONTH': 'first',
                    'RETURN_AS_TIMEZONE_AWARE': False,
                    'STRICT_PARSING': False
                }
            )
            
            if parsed and parsed >= ahora.replace(hour=0, minute=0, second=0):
                fecha = parsed
                
                # Si extrajimos hora explícita via regex, usarla
                if hora_explicita is not None:
                    hora = hora_explicita
                    minuto = minuto_explicito
                else:
                    hora = parsed.hour
                    minuto = parsed.minute
                
                # Si NO hay hora explícita y la hora es medianoche (00:00),
                # no retornar hora - el sistema la pedirá
                if hora_explicita is None and hora == 0 and minuto == 0:
                    return fecha.strftime("%Y-%m-%d"), None
                    
                return fecha.strftime("%Y-%m-%d"), f"{hora:02d}:{minuto:02d}"
        except Exception as e:
            logger.debug(f"dateparser parse error: {e}")

        # --- Fallback: regex para fechas específicas ---
        # Buscar "16 de marzo", "16 de marzo a las 9", etc.
        match_fecha_especifica = re.search(r'(\d{1,2})\s*de\s*(\w+)(?:\s*a\s*las\s*(\d{1,2})(?::(\d{2}))?)?', texto_lower)
        if match_fecha_especifica:
            dia = int(match_fecha_especifica.group(1))
            mes_nombre = match_fecha_especifica.group(2)
            
            meses = {
                'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
            }
            
            if mes_nombre in meses:
                mes = meses[mes_nombre]
                try:
                    # Primero intentar con año actual
                    año = ahora.year
                    fecha_candidata = datetime(año, mes, dia)
                    # Comparar solo fecha (sin hora), normalizando ahora a medianoche
                    ahora_midnight = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
                    # Solo usar próximo año si la fecha ya pasó completamente
                    if fecha_candidata < ahora_midnight:
                        if mes >= ahora.month:
                            fecha_candidata = datetime(año, mes, dia)
                        else:
                            fecha_candidata = datetime(año + 1, mes, dia)
                    fecha = fecha_candidata
                    
                    # Buscar hora en el mismo match o en el texto
                    if match_fecha_especifica.group(3):
                        hora = int(match_fecha_especifica.group(3))
                        if match_fecha_especifica.group(4):
                            minuto = int(match_fecha_especifica.group(4))
                        # Ajustar PM
                        if 'tarde' in texto_lower or 'noche' in texto_lower:
                            if hora < 12:
                                hora += 12
                    
                    return fecha.strftime("%Y-%m-%d"), f"{hora:02d}:{minuto:02d}" if hora is not None else None
                except:
                    pass

        # --- Fallback: regex para días de la semana ---
        dias_semana = {
            'lunes': 0, 'martes': 1, 'miercoles': 2, 'miércoles': 2, 'jueves': 3, 'viernes': 4, 'sabado': 5, 'sábado': 5, 'domingo': 6
        }
        
        for dia_nombre, dia_idx in dias_semana.items():
            if dia_nombre in texto_lower:
                # Calcular días hasta el próximo día de la semana
                dias_hasta = (dia_idx - ahora.weekday()) % 7
                if dias_hasta == 0:
                    dias_hasta = 7  # Si es hoy, tomar la próxima semana
                fecha = ahora + timedelta(days=dias_hasta)
                
                # Buscar hora
                match_hora = re.search(r'(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?', texto_lower)
                if match_hora:
                    hora = int(match_hora.group(1))
                    if match_hora.group(2):
                        minuto = int(match_hora.group(2))
                    sufijo = match_hora.group(3)
                    if sufijo == 'pm' and hora < 12:
                        hora += 12
                    elif sufijo == 'am' and hora == 12:
                        hora = 0
                    elif 'tarde' in texto_lower and hora < 7:
                        hora += 12
                    elif 'noche' in texto_lower and hora < 12:
                        hora += 12
                
                return fecha.strftime("%Y-%m-%d"), f"{hora:02d}:{minuto:02d}" if hora is not None else None

        # --- Fallback: regex originales ---
        
        # Detectar referencias relativas de fecha
        if "pasado manana" in texto_lower or "pasado mañana" in texto_lower:
            fecha = ahora + timedelta(days=2)
        elif "manana" in texto_lower or "mañana" in texto_lower:
            fecha = ahora + timedelta(days=1)
        elif "hoy" in texto_lower:
            fecha = ahora
        
        # Buscar fecha específica YYYY-MM-DD
        match_fecha = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", texto_lower)
        if match_fecha:
            try:
                fecha = datetime(int(match_fecha.group(1)), int(match_fecha.group(2)), int(match_fecha.group(3)))
            except:
                pass

        # Buscar patrones de hora en orden de prioridad
        
        # Patrón 1: HH:MM (8:30)
        match = re.search(r"(\d{1,2})\s*:\s*(\d{2})", texto_lower)
        if match:
            hora = int(match.group(1))
            minuto = int(match.group(2))
            if hora > 23:
                hora = hora % 24
        
        # Patrón 2: HHam o HHpm (8am, 8pm)
        elif re.search(r"(\d{1,2})\s*(am|pm)", texto_lower):
            match = re.search(r"(\d{1,2})\s*(am|pm)", texto_lower)
            hora = int(match.group(1))
            sufijo = match.group(2)
            if sufijo == "pm" and hora < 12:
                hora += 12
            elif sufijo == "am" and hora == 12:
                hora = 0
        
        # Patrón 3: HH de la mañana / de la noche / de la tarde
        elif re.search(r"(\d{1,2})\s*de\s*(?:la\s*)?(manana|tarde|noche)", texto_lower):
            match = re.search(r"(\d{1,2})\s*de\s*(?:la\s*)?(manana|tarde|noche)", texto_lower)
            hora = int(match.group(1))
            momento = match.group(2)
            if momento == "noche" and hora < 12:
                hora += 12
            elif momento == "tarde" and hora < 12:
                hora += 12
            elif momento == "manana" and hora == 12:
                hora = 0
        
        # Patrón 4: a las HH / a las X de la tarde
        elif re.search(r"a\s*las\s*(\d{1,2})(?:\s*de\s*(?:la\s*)?(tarde|noche))?", texto_lower):
            match = re.search(r"a\s*las\s*(\d{1,2})(?:\s*de\s*(?:la\s*)?(tarde|noche))?", texto_lower)
            hora = int(match.group(1))
            momento = match.group(2)
            if momento == "tarde" or momento == "noche":
                if hora < 12:
                    hora += 12
            elif hora < 7:
                pass
            elif hora < 12:
                pass
        
        # Patrón 5: solo número (8) - solo si hay contexto de hora (manana/tarde/noche)
        elif re.search(r"\b(\d{1,2})\b", texto_lower):
            match = re.search(r"\b(\d{1,2})\b", texto_lower)
            hora_candidato = int(match.group(1))
            if "manana" in texto_lower or "tarde" in texto_lower or "noche" in texto_lower or "a las" in texto_lower or "a la" in texto_lower:
                hora = hora_candidato
                if "tarde" in texto_lower and hora < 7:
                    hora += 12
                elif "noche" in texto_lower and hora < 12:
                    hora += 12

        # Si no se encontró fecha, retornar None
        if fecha is None:
            return None, None
        
        # Si no se encontró hora, retornar None para pedirla
        if hora is None:
            return fecha.strftime("%Y-%m-%d"), None
        
        return fecha.strftime("%Y-%m-%d"), f"{hora:02d}:{minuto:02d}"

    @staticmethod
    def _validar_duracion(duracion):
        # Manejar None - retornar None para pedir al usuario
        if duracion is None:
            return None
        
        if duracion <= 0:
            return None  # Pedir al usuario en lugar de usar默认值
        
        if duracion > 480:
            return 480
        
        return duracion

    @staticmethod
    def _validar_asistentes(asistentes: List[str]):

        if not asistentes:
            return []

        validos = []

        for email in asistentes:

            if re.match(r"[^@]+@[^@]+\.[^@]+", email):
                validos.append(email)

        return validos

    @staticmethod
    def _parse_duracion(texto: str) -> Optional[int]:
        """
        Parser de duración en lenguaje natural.
        Soporta: "1 hora", "45 minutos", "1 hora 45 minutos", "2h", "90 min", etc.
        """
        if not texto:
            return None

        texto_lower = str(texto).lower().strip()

        horas = 0
        minutos = 0

        # Buscar indicadores de duración explícitos
        tiene_indicador_duracion = any(
            x in texto_lower for x in 
            ['hora', 'minuto', 'min', 'h ', 'h$', ' por ', 'durante ', 'duracion', 'duración']
        )
        
        # Buscar horas primero: "1 hora", "2 horas", "1h", "2h"
        match_horas = re.search(r'(\d+)\s*(?:hora|horas|h)\b', texto_lower)
        if match_horas:
            horas = int(match_horas.group(1))

        # Buscar minutos: "30 minutos", "45 min", "30m"
        match_minutos = re.search(r'(\d+)\s*(?:minuto|minutos|min|m)\b', texto_lower)
        if match_minutos:
            minutos = int(match_minutos.group(1))

        # Si no se encontró mediante regex, solo buscar números si hay indicador de duración
        if horas == 0 and minutos == 0:
            if tiene_indicador_duracion:
                numeros = re.findall(r'\d+', texto_lower)
                if numeros:
                    if len(numeros) >= 2:
                        horas = int(numeros[0])
                        minutos = int(numeros[1])
                    else:
                        valor = int(numeros[0])
                        if valor > 10:
                            minutos = valor
                        else:
                            horas = valor

        total_minutos = (horas * 60) + minutos

        if total_minutos == 0:
            return None

        return total_minutos

    # ---------------------------------------------------------
    # GENERAR EVENTO
    # ---------------------------------------------------------

    def _generar_evento(
        self,
        titulo: str,
        fecha_hora: str,
        duracion: int = 30,
        asistentes: List[str] = None,
        descripcion: str = ""
    ) -> Dict[str, Any]:

        fecha, hora = self._parse_fecha_hora(fecha_hora)

        # Si no se pudo parsear, retornar evento con datos incompletos
        # El método agendar_reunion se encargará de pedir los datos faltantes
        if fecha is None:
            return {
                "title": titulo,
                "date": None,
                "time": None,
                "duration": self._validar_duracion(duracion),
                "attendees": self._validar_asistentes(asistentes or []),
                "description": descripcion,
                "fecha_hora_original": fecha_hora
            }

        duracion_validada = self._validar_duracion(duracion)
        asistentes = self._validar_asistentes(asistentes or [])

        return {
            "title": titulo,
            "date": fecha,
            "time": hora,
            "duration": duracion_validada,
            "attendees": asistentes,
            "description": descripcion
        }

    # ---------------------------------------------------------
    # ENVIAR A ZAPIER
    # ---------------------------------------------------------

    def _enviar_evento(self, evento: Dict[str, Any]):

        try:

            response = requests.post(
                self.webhook_url,
                json=evento,
                timeout=10
            )

            if response.status_code == 200:
                return True

            logger.warning(f"Zapier error: {response.status_code}")

            return False

        except Exception as e:

            logger.exception(f"Error enviando evento: {str(e)}")

            return False

    # ---------------------------------------------------------
    # EXTRAER DATOS CON LLM
    # ---------------------------------------------------------

    def _extraer_datos_llm(self, mensaje_usuario: str):

        prompt = f"""
Extrae los datos de agendamiento del siguiente mensaje.

Mensaje:
"{mensaje_usuario}"

Devuelve SOLO JSON válido.

Campos:
titulo (el título real de la reunión que el usuario mencione)
fecha_hora
duracion
attendees
descripcion

REGLAS IMPORTANTES:
- El campo "titulo" debe ser el NOMBRE real que el usuario da a la reunión
- NO uses placeholders como "titulo", "reunión", "evento" como valor
- Si el usuario no especifica título, usa "Reunión de coordinación"
- Si el usuario dice "reunión de directivas", el título debe ser "Reunión de directivas"

Ejemplo correcto:
{{"titulo": "Reunión de directivas", "fecha_hora": "mañana a las 3", "duracion": 60}}

Ejemplo INCORRECTO (no hacer esto):
{{"titulo": "titulo", "fecha_hora": "mañana a las 3"}}
"""

        try:

            respuesta = self.llm.generate_response(
                message=prompt,
                history=[],
                role="ADMIN"
            )

            match = re.search(r"\{[\s\S]*?\}", respuesta)

            if match:
                datos = json.loads(match.group())
                
                # VALIDACIÓN: Verificar que el título no sea un placeholder
                titulo = datos.get("titulo", "")
                if titulo and titulo.lower() in ["titulo", "reunion", "reunión", "evento", "none", ""]:
                    # Usar valor por defecto si es un placeholder
                    datos["titulo"] = "Reunión de coordinación"
                
                return datos

        except Exception as e:

            logger.warning(f"LLM agenda parsing error: {str(e)}")

        return {}

    # ---------------------------------------------------------
    # FASE 4: TOOL PRINCIPAL CON PARSING FLEXIBLE
    # Ahora puede recibir parámetros O extraerlos del mensaje
    # ---------------------------------------------------------

    async def agendar_reunion(self, mensaje_usuario: str = "", user_id: int = None) -> Dict[str, Any]:
        """
        Agenda una reunión. 
        IMPORTANTE: Si no tiene todos los datos, los pide al usuario.
        Nunca inventa valores por defecto.
        """

        logger.info(f"Tool agenda activada con mensaje: {mensaje_usuario}")

        # Intentar extraer datos del mensaje si no se recibieron parámetros
        datos = None
        
        if mensaje_usuario and mensaje_usuario.strip():
            # Usar LLM para extraer datos del mensaje
            datos = self._extraer_datos_llm(mensaje_usuario)
        
        # Si aún no hay datos, intentar inferirlos directamente del mensaje
        if not datos or not datos.get("titulo"):
            datos = self._inferir_datos_simple(mensaje_usuario or "")

        titulo = datos.get("titulo")
        fecha_hora = datos.get("fecha_hora")
        
        # Parsear duración usando el parser de lenguaje natural
        duracion_raw = datos.get("duracion")
        if duracion_raw:
            if isinstance(duracion_raw, str):
                duracion = self._parse_duracion(duracion_raw)
            else:
                duracion = duracion_raw
        else:
            duracion = None
            
        asistentes = datos.get("attendees", [])
        descripcion = datos.get("descripcion", "")

        # Validar que tenemos fecha y hora
        # _parse_fecha_hora retorna (None, None) si no puede parsear
        from datetime import datetime, timedelta
        
        # Intentar parsear fecha_hora
        fecha_parseada = None
        hora_parseada = None
        
        if fecha_hora:
            fecha_parseada, hora_parseada = self._parse_fecha_hora(fecha_hora)

        # Si no se pudo parsear la fecha, pedirla
        if not fecha_parseada:
            return {
                "status": "missing_data",
                "message": "¿Para qué fecha quieres agendar la reunión? (hoy, mañana, pasado mañana, o fecha específica)",
                "falta": "fecha"
            }
        
        # Si no se pudo parsear la hora, pedirla
        if hora_parseada is None:
            return {
                "status": "missing_data",
                "message": f"¿A qué hora quieres la reunión el {fecha_parseada}?",
                "falta": "hora",
                "fecha": fecha_parseada
            }

        evento = self._generar_evento(
            titulo or "Reunión de coordinación",
            fecha_hora,
            duracion,
            asistentes,
            descripcion
        )

        # Guardar en estado conversacional
        from app.core.brain import Brain
        
        uid = user_id or self._user_id_temp or 0
        
        Brain.agenda_drafts[uid] = {
            "etapa": "recolectar",
            "evento": evento,
            "mensaje_original": mensaje_usuario
        }
        
        # Construir mensaje de respuesta según campos faltantes
        # Solo pedir datos OPCIONALES (invitados, descripción)
        # Los datos OBLIGATORIOS (título, fecha, hora) ya fueron validados
        campos_faltantes = []
        if not titulo:
            campos_faltantes.append("título de la reunión")
        if not duracion:
            campos_faltantes.append("duración (en minutos)")
        if not asistentes:
            campos_faltantes.append("correos de invitados (opcional)")
        if not descripcion:
            campos_faltantes.append("descripción (opcional)")
        
        if campos_faltantes:
            return {
                "status": "collecting",
                "message": f"Entendido. La reunión sería el {fecha_parseada} a las {hora_parseada}.\n\n¿Me puedes proporcionar?\n• " + "\n• ".join(campos_faltantes),
                "evento": evento,
                "fecha": fecha_parseada,
                "hora": hora_parseada
            }
        
        # Tiene todos los datos obligatorios, mostrar borrador para confirmación
        return {
            "status": "draft",
            "message": self._formatear_borrador(evento) + "\n\n¿Quieres que agende la reunión así o deseas cambiar algo?",
            "evento": evento
        }

    def _formatear_borrador(self, evento: Dict) -> str:
        """Formatea el borrador de la reunión."""
        titulo = evento.get("title", "Sin título")
        fecha = evento.get("date", "Sin fecha")
        hora = evento.get("time", "Sin hora")
        duracion = evento.get("duration", 30)
        attendees = evento.get("attendees", [])
        descripcion = evento.get("description", "Sin descripción")
        
        invites = ", ".join(attendees) if attendees else "Nadie"
        
        return f"""📋 Así quedaría la reunión:

Título: {titulo}
Fecha: {fecha}
Hora: {hora}
Duración: {duracion} minutos
Invitados: {invites}
Descripción: {descripcion}"""

    def set_user_id(self, user_id: int):
        """FIX: Necesario para guardar el estado en Brain"""
        self._user_id_temp = user_id

    # ---------------------------------------------------------
    # FASE 4: INFERENCIA SIMPLE DE DATOS
    # Método auxiliar para inferir datos sin usar LLM
    # ---------------------------------------------------------

    def _inferir_datos_simple(self, mensaje: str) -> Dict[str, Any]:
        """
        Infiere datos básicos de la reunión del mensaje sin usar LLM.
        IMPORTANTE: Si no puede inferir fecha/hora, retorna valores que
        hará que el sistema pida los datos al usuario.
        """
        
        msg = mensaje.lower()
        
        # Inferir título solo si es muy explícito
        titulo = None
        
        if "directiva" in msg or "directivas" in msg:
            titulo = "Reunión de directivas"
        elif "equipo" in msg:
            titulo = "Reunión de equipo"
        elif "seguimiento" in msg:
            titulo = "Reunión de seguimiento"
        elif "informes" in msg or "informe" in msg:
            titulo = "Revisión de informes"
        elif "estrategica" in msg or "estratégica" in msg:
            titulo = "Reunión Estratégica"
        
        # Buscar fecha y hora usando dateparser
        fecha_hora = None
        fecha_parseada = None
        hora_parseada = None
        
        # Intentar con dateparser primero
        try:
            parsed = dateparser.parse(
                msg,
                languages=['es'],
                settings={
                    'PREFER_DAY_OF_MONTH': 'first',
                    'RETURN_AS_TIMEZONE_AWARE': False
                }
            )
            
            ahora = datetime.now()
            if parsed and parsed >= ahora.replace(hour=0, minute=0):
                fecha_parseada = parsed.strftime('%Y-%m-%d')
                hora_explicita = any(x in msg for x in ['las', 'a las', 'am', 'pm', 'hora'])
                if parsed.hour > 0 or parsed.minute > 0 or hora_explicita:
                    hora_parseada = f"{parsed.hour:02d}:{parsed.minute:02d}"
        except Exception:
            pass
        
        # Fallback: regex originales si dateparser no funcionó
        if not fecha_parseada:
            from datetime import datetime, timedelta
            ahora = datetime.now()
            
            hora = None
            minuto = 0
            hora_encontrada = False
            
            # Buscar hora con más prioridad: primero HH:MM, luego HHam/HHpm, luego "a las HH"
            hora_match = re.search(r'(\d{1,2}):(\d{2})', msg)  # HH:MM
            if hora_match:
                hora = int(hora_match.group(1))
                minuto = int(hora_match.group(2))
                hora_encontrada = True
            
            if not hora_encontrada:
                hora_match = re.search(r'(\d{1,2})\s*(am|pm)', msg)  # HHam/HHpm
                if hora_match:
                    hora = int(hora_match.group(1))
                    sufijo = hora_match.group(2)
                    if sufijo == 'pm' and hora < 12:
                        hora += 12
                    elif sufijo == 'am' and hora == 12:
                        hora = 0
                    hora_encontrada = True
            
            if not hora_encontrada:
                hora_match = re.search(r'a\s*las\s*(\d{1,2})(?::(\d{2}))?', msg)  # a las HH
                if hora_match:
                    hora = int(hora_match.group(1))
                    if hora_match.group(2):
                        minuto = int(hora_match.group(2))
                    if "tarde" in msg and hora < 7:
                        hora += 12
                    elif "noche" in msg and hora < 12:
                        hora += 12
                    hora_encontrada = True
            
            if not hora_encontrada:
                # Último intento: buscar solo números cerca de indicadores de tiempo
                hora_match = re.search(r'(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?', msg)
                if hora_match and hora_match.group(1):
                    hora = int(hora_match.group(1))
                    if hora_match.group(2):
                        minuto = int(hora_match.group(2))
                    sufijo = hora_match.group(3)
                    
                    if sufijo == "pm" and hora < 12:
                        hora += 12
                    elif sufijo == "am" and hora == 12:
                        hora = 0
                    elif "tarde" in msg and hora < 7:
                        hora += 12
                    elif "noche" in msg and hora < 12:
                        hora += 12
                    hora_encontrada = True
            
            fecha_str = None
            
            # Buscar día de la semana específico (lunes, martes, etc.)
            dias_semana = {
                'lunes': 0, 'martes': 1, 'miercoles': 2, 'miércoles': 2, 'jueves': 3, 'viernes': 4, 'sabado': 5, 'sábado': 5, 'domingo': 6
            }
            
            dia_encontrado = None
            for dia_nombre, dia_idx in dias_semana.items():
                if dia_nombre in msg:
                    dias_hasta = (dia_idx - ahora.weekday()) % 7
                    if dias_hasta == 0:
                        dias_hasta = 7
                    fecha = ahora + timedelta(days=dias_hasta)
                    fecha_str = fecha.strftime('%Y-%m-%d')
                    dia_encontrado = True
                    break
            
            # Buscar fecha específica "16 de marzo"
            if not fecha_str:
                match_fecha = re.search(r'(\d{1,2})\s*de\s*(\w+)', msg)
                if match_fecha:
                    dia = int(match_fecha.group(1))
                    mes_nombre = match_fecha.group(2)
                    meses = {
                        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
                    }
                    if mes_nombre in meses:
                        mes = meses[mes_nombre]
                        año = ahora.year
                        fecha_candidata = datetime(año, mes, dia)
                        ahora_midnight = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
                        if fecha_candidata < ahora_midnight:
                            if mes >= ahora.month:
                                fecha_candidata = datetime(año, mes, dia)
                            else:
                                fecha_candidata = datetime(año + 1, mes, dia)
                        fecha_str = fecha_candidata.strftime('%Y-%m-%d')
            
            if not fecha_str:
                if "pasado manana" in msg or "pasado mañana" in msg:
                    fecha = ahora + timedelta(days=2)
                    fecha_str = fecha.strftime('%Y-%m-%d')
                elif "manana" in msg or "mañana" in msg:
                    fecha = ahora + timedelta(days=1)
                    fecha_str = fecha.strftime('%Y-%m-%d')
                elif "hoy" in msg:
                    fecha_str = ahora.strftime('%Y-%m-%d')
            
            if fecha_str and hora_encontrada and hora is not None:
                fecha_parseada = fecha_str
                hora_parseada = f"{hora:02d}:{minuto:02d}"
        
        if fecha_parseada:
            fecha_hora = f"{fecha_parseada} {hora_parseada}" if hora_parseada else fecha_parseada
        
        # Buscar duración usando _parse_duracion
        duracion = self._parse_duracion(mensaje)
        
        # IMPORTANTE: No inventar valores por defecto
        # Si no se encontró fecha o hora, retornar lo que se tenga
        # El sistema principal pedira lo que falte
        
        return {
            "titulo": titulo,
            "fecha_hora": fecha_hora,
            "duracion": duracion,
            "attendees": [],
            "descripcion": ""
        }