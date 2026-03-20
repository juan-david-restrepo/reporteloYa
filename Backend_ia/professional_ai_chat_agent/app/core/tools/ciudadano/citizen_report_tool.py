import json
import re
from sqlalchemy import text
from datetime import datetime
from app.utils.logger import logger
from app.core.tools.admin.base.nlp_parser import NLPParser


class CitizenReportTool:

    CAMPOS_REQUERIDOS = ["descripcion", "direccion"]
    CAMPOS_OPCIONALES = ["placa", "fecha_incidente", "hora_incidencia", "latitud", "longitud", "tipo_infraccion"]

    ESTADO_PENDIENTE_UBICACION = "PENDIENTE_UBICACION"
    ESTADO_FINALIZADO = "FINALIZADO"

    def __init__(self, db, llm_service):
        self.db = db
        self.llm = llm_service
        self.nlp = NLPParser()

    def iniciar_reporte(self, user_id: int, mensaje: str):
        """
        Inicia el flujo de reporte. Infiere el tipo de incidente del mensaje
        y pide permiso de ubicación.
        """
        tipo_infraccion = self._inferir_tipo_infraccion(mensaje)
        
        return {
            "status": self.ESTADO_PENDIENTE_UBICACION,
            "needs_location": True,
            "message": "📍 Para crear tu reporte necesito obtener tu ubicación.\n\n¿Me das permiso para acceder a tu ubicación GPS?\n\nEs necesario para que el reporte tenga las coordenadas exactas del incidente.",
            "tipo_infraccion": tipo_infraccion,
            "descripcion": self._extraer_descripcion(mensaje),
            "user_id": user_id
        }

    def _inferir_tipo_infraccion(self, mensaje: str) -> str:
        """Infiere el tipo de infracción del mensaje."""
        msg_lower = mensaje.lower()
        
        if any(p in msg_lower for p in ["accidente", "choc", "colisión", "impacto", "carambola", 
                                          "crash", "crashear", "crashearon", "me crashearon",
                                          "se estrelló", "se estrellaron", "estrelló"]):
            return "accidente"
        elif any(p in msg_lower for p in ["estacion", "parque", "mal parque", "bloqueando", 
                                           "bloquea", "obstruye", "aparcado"]):
            return "estacionamiento"
        elif any(p in msg_lower for p in ["velocidad", "rapido", "rápido", "exceso", "velocid"]):
            return "exceso_velocidad"
        elif any(p in msg_lower for p in ["semáforo", "semaforo", "luz roja", "luz verde", "semáforo"]):
            return "semaforo"
        elif any(p in msg_lower for p in ["peatón", "peaton", "cruzar", "paspea", "pasarela",
                                           "atropello", "atropell", "arrolló", "arrollar",
                                           "cruzando", "cruce", "peatonal"]):
            return "peaton"
        elif any(p in msg_lower for p in ["doble línea", "doble linea", "giro prohibido", "contravía"]):
            return "doble_linea"
        elif any(p in msg_lower for p in ["cinturón", "cinturon", "seguro"]):
            return "no_cinturon"
        elif any(p in msg_lower for p in ["celular", "teléfono", "telefono"]):
            return "celular"
        elif any(p in msg_lower for p in ["documentos", "licencia", "soat", "tecnomecánica"]):
            return "documentos"
        elif any(p in msg_lower for p in ["placa", "matrícula"]):
            return "placa"
        
        return "otro"

    def _extraer_descripcion(self, mensaje: str) -> str:
        """Extrae una descripción del mensaje."""
        palabras_quitar = [
            "quiero reportar", "necesito reportar", "vengo a reportar",
            "reportar", "denunciar", "un", "una", "de", "en", "por",
            "accidente", "incidente", "infracción", "infraccion"
        ]
        
        descripcion = mensaje.lower()
        for palabra in palabras_quitar:
            descripcion = descripcion.replace(palabra, "")
        
        descripcion = descripcion.strip()
        return descripcion if descripcion else "Incidente reportado desde la aplicación móvil"

    def crear_reporte_con_ubicacion(self, user_id: int, latitud: float, longitud: float, 
                                     direccion: str, tipo_infraccion: str, descripcion: str):
        """
        Crea el reporte directamente con la ubicación GPS.
        """
        try:
            prioridad = self._determinar_prioridad(tipo_infraccion)
            fecha_actual = datetime.now().strftime("%Y-%m-%d")
            hora_actual = datetime.now().strftime("%H:%M")

            query = text("""
                INSERT INTO reporte
                (id_usuario, tipo_infraccion, descripcion, direccion, latitud, longitud, 
                 placa, fecha_incidente, hora_incidente, prioridad, estado, created_at)
                VALUES (:id_usuario, :tipo_infraccion, :descripcion, :direccion, :latitud, :longitud,
                        :placa, :fecha_incidente, :hora_incidente, :prioridad, 'PENDIENTE', NOW())
            """)

            self.db.execute(query, {
                "id_usuario": user_id,
                "tipo_infraccion": tipo_infraccion,
                "descripcion": descripcion or "Incidente reportado desde la aplicación móvil",
                "direccion": direccion or "Ubicación enviada desde app móvil",
                "latitud": latitud,
                "longitud": longitud,
                "placa": None,
                "fecha_incidente": fecha_actual,
                "hora_incidente": hora_actual,
                "prioridad": prioridad
            })

            self.db.commit()

            return {
                "status": "success",
                "needs_more_info": False,
                "message": f"✅ ¡Reporte creado exitosamente! 🎉\n\n📋 Resumen:\n• Tipo: {self._formatear_tipo(tipo_infraccion)}\n• Fecha: {fecha_actual}\n• Hora: {hora_actual}\n• Ubicación: {direccion}\n\n📎 Podrás subir fotos y más detalles desde 'Mis Reportes'.",
                "tipo_infraccion": tipo_infraccion
            }

        except Exception as e:
            logger.exception(f"[REPORTE] Error creando con ubicación: {str(e)}")
            self.db.rollback()
            return {
                "status": "error",
                "needs_more_info": False,
                "message": f"Error al crear reporte: {str(e)}"
            }

    def _formatear_tipo(self, tipo: str) -> str:
        """Formatea el tipo de infracción para mostrar."""
        tipos_formato = {
            "accidente": "Accidente de tránsito",
            "estacionamiento": "Estacionamiento indebido",
            "exceso_velocidad": "Exceso de velocidad",
            "semaforo": "Semáforo dañado",
            "peaton": "Cruce indebido de peatón",
            "doble_linea": "Giro en doble línea",
            "no_cinturon": "Conductor sin cinturón",
            "celular": "Uso de celular al conducir",
            "documentos": "Falta de documentos",
            "placa": "Problema con placa",
            "otro": "Otro"
        }
        return tipos_formato.get(tipo, tipo.title())

    def _extraer_datos_inteligente(self, mensaje_completo: str, datos_previos: dict = None) -> dict:
        """
        Extrae datos de TODA la conversación de forma inteligente.
        """
        # Contexto de datos previos
        contexto = ""
        if datos_previos and any(datos_previos.values()):
            contexto = "\n📋 DATOS YA RECOLECTADOS:\n"
            for k, v in datos_previos.items():
                if v:
                    contexto += f"  • {k}: {v}\n"

        prompt = f"""
Eres un asistente de IA especializado en crear reportes de infracciones de tránsito.

🎯 TAREA: Analiza TODA la conversación del usuario y extrae/completa los datos del reporte.

{contexto}

💬 CONVERSACIÓN COMPLETA DEL USUARIO:
---
{mensaje_completo}
---

📝 INSTRUCCIONES:
1. Analiza TODOS los mensajes de la conversación
2. Combina toda la información disponible
3. Si el usuario dice "accidente", "se chocaron", "colisión" → tipo_infraccion = "accidente"
4. Si dice "mal parqueado", "estacionado mal", "bloqueando" → tipo_infraccion = "estacionamiento"
5. Si dice "exceso de velocidad", "rápido", "velocidad" → tipo_infraccion = "exceso_velocidad"
6. Si no puede inferir el tipo, usa "otro"

📋 CAMPOS A EXTRAER:
- tipo_infraccion: accidente, estacionamiento, exceso_velocidad, semaforo, peaton, doble_linea, zona_residencial, no_cinturon, celular, documentos, placa, otro
- descripcion: qué pasó (requerido)
- direccion: dónde ocurrió (requerido) - puede ser "mi casa", "cerca de...", etc.
- placa: si el usuario la mencionó
- fecha_incidente: HOY si no la menciona → {datetime.now().strftime('%Y-%m-%d')}
- hora_incidente: AHORA si no la menciona → {datetime.now().strftime('%H:%M')}

🔍 EJEMPLOS DE INFERENCIA:
- "se chocaron" + "accidente automovilstico" → descripcion: "accidente de tránsito entre vehículos"
- "calle de mi casa" → direccion: "calle de mi casa" (es válida)
- "el placa es ABC123" → placa: "ABC123"

⚠️ IMPORTANTE: 
- La descripcion NO puede estar vacía
- La direccion puede ser aproximada
- Si tienes descripcion Y direccion, el reporte está LISTO

Responde SOLO JSON:
{{"tipo_infraccion": "...", "descripcion": "...", "direccion": "...", "placa": "...", "fecha_incidente": "...", "hora_incidente": "..."}}
"""

        try:
            response = self.llm.generate_response(
                message=prompt,
                history=[],
                role="CIUDADANO"
            )

            match = re.search(r"\{[\s\S]*?\}", response)

            if match:
                datos_extraidos = json.loads(match.group())
                
                # Combinar con datos previos
                resultado = {}
                if datos_previos:
                    resultado = {k: v for k, v in datos_previos.items() if v}
                
                for key, value in datos_extraidos.items():
                    if value and str(value).strip():
                        resultado[key] = str(value).strip()
                
                logger.info(f"[REPORTE] Datos extraídos: {resultado}")
                return resultado

        except Exception as e:
            logger.warning(f"[REPORTE] LLM error: {str(e)}")

        return datos_previos or {}

    def _validar_datos(self, datos: dict) -> tuple:
        """
        Valida los datos. Retorna (es_valido, campos_faltantes, datos_validados).
        """
        campos_faltantes = []
        
        for campo in self.CAMPOS_REQUERIDOS:
            if not datos.get(campo) or not str(datos.get(campo)).strip():
                campos_faltantes.append(campo)

        # Normalizar tipo de infracción
        if datos.get("tipo_infraccion"):
            tipo_norm = self.nlp.normalize_text(datos["tipo_infraccion"])
            for tipo_val, sinonimos in NLPParser.INFRACCION_SINONIMOS.items():
                if tipo_norm in sinonimos:
                    datos["tipo_infraccion"] = tipo_val
                    break
            else:
                # Inferir del contenido
                tipo_lower = datos.get("tipo_infraccion", "").lower()
                if "accidente" in tipo_lower or "choc" in tipo_lower or "colisión" in tipo_lower:
                    datos["tipo_infraccion"] = "accidente"
                elif "estacion" in tipo_lower or "parking" in tipo_lower or "parque" in tipo_lower:
                    datos["tipo_infraccion"] = "estacionamiento"
                elif "velocidad" in tipo_lower or "rapido" in tipo_lower:
                    datos["tipo_infraccion"] = "exceso_velocidad"
                else:
                    datos["tipo_infraccion"] = "otro"

        # Valores por defecto
        if not datos.get("tipo_infraccion"):
            datos["tipo_infraccion"] = "otro"
        
        if not datos.get("fecha_incidente"):
            datos["fecha_incidente"] = datetime.now().strftime("%Y-%m-%d")
        
        if not datos.get("hora_incidente"):
            datos["hora_incidente"] = datetime.now().strftime("%H:%M")

        # Validar coordenadas
        for coord in ["latitud", "longitud"]:
            if datos.get(coord):
                try:
                    val = float(datos[coord])
                    if coord == "latitud" and (val < -90 or val > 90):
                        datos[coord] = None
                    elif coord == "longitud" and (val < -180 or val > 180):
                        datos[coord] = None
                except:
                    datos[coord] = None

        if campos_faltantes:
            return False, campos_faltantes, datos

        return True, [], datos

    def _generar_pregunta_inteligente(self, campos_faltantes: list, datos_actuales: dict) -> str:
        """
        Genera preguntas específicas según el contexto.
        """
        if "descripcion" in campos_faltantes and "direccion" in campos_faltantes:
            return "¿Podrías decirme qué pasó y en qué dirección?"
        
        if "descripcion" in campos_faltantes:
            return "¿Qué pasó exactamente? Por ejemplo: 'un carro chocó a otro' o 'un vehículo mal estacionado'"
        
        if "direccion" in campos_faltantes:
            # Ver si ya tenemos descripción para dar contexto
            desc = datos_actuales.get("descripcion", "")
            return f"¿En qué dirección o lugar ocurrió? Por ejemplo: 'en la calle {desc.split()[-1] if desc else 'principal'} de tu casa'"
        
        return f"¿Podrías darme más información sobre: {', '.join(campos_faltantes)}?"

    async def crear_reporte(self, user_id: int, mensaje: str, datos_previos: dict = None):
        """
        Crea reporte de forma conversacional e inteligente.
        
        Si es la primera llamada (sin datos_previos), inicia el flujo de ubicación.
        Si ya tiene datos previos, usa el flujo conversacional completo.
        """
        # NUEVO: Si es la primera llamada, iniciar flujo de ubicación
        if datos_previos is None:
            # Detectar si es un mensaje relacionado con incidentes/reportes
            msg_lower = mensaje.lower()
            
            # Keywords que indican reporte/incidente
            reporte_keywords = [
                "reportar", "denunciar", "crear reporte", "reporte", "denuncia",
                "accidente", "choc", "colisión", "impacto", "carambola",
                "estacion", "parque", "bloqueando", "bloquea",
                "semáforo", "semaforo", "velocidad", "rapido", "rápido",
                "peatón", "peaton", "atropello", "conductor",
                "hay un", "hay una", "vi un", "vi una", "veo un", "veo una",
                "me chocaron", "nos chocamos", "se chocaron", "chocaron",
                "hubo", "pasó", "sucedió", "ocurrió",
                "incident", "infracción", "infraccion", "falta", "multa",
                "violación", "violacion", "ilegal", "peligroso",
                "en esta", "aquí hay", "aquí esta", "frente a",
                "necesito", "quiero", "vengo", "traigo",
                "conduce mal", "manejando", "pilotando"
            ]
            
            es_mensaje_de_reporte = any(kw in msg_lower for kw in reporte_keywords)
            
            if es_mensaje_de_reporte:
                # Extraer datos del mensaje y luego pedir ubicación
                return self.iniciar_reporte(user_id, mensaje)
            
            # Si no detecta nada, aún así iniciar reporte con ubicación
            return self.iniciar_reporte(user_id, mensaje)
        
        # SI TIENE datos_previos, USAR EL FLUJO CONVERSACIONAL ANTERIOR
        datos = self._extraer_datos_inteligente(mensaje, datos_previos)
        es_valido, campos_faltantes, datos_validados = self._validar_datos(datos)
        
        if not es_valido:
            pregunta = self._generar_pregunta_inteligente(campos_faltantes, datos_validados)
            
            return {
                "status": "missing_data",
                "needs_more_info": True,
                "question": pregunta,
                "campos_faltantes": campos_faltantes,
                "datos_actuales": datos_validados,
                "message": pregunta
            }

        try:
            prioridad = self._determinar_prioridad(datos_validados.get("tipo_infraccion", ""))

            query = text("""
                INSERT INTO reporte
                (id_usuario, tipo_infraccion, descripcion, direccion, latitud, longitud, placa, fecha_incidente, hora_incidente, prioridad, estado, created_at)
                VALUES (:id_usuario, :tipo_infraccion, :descripcion, :direccion, :latitud, :longitud, :placa, :fecha_incidente, :hora_incidente, :prioridad, 'PENDIENTE', NOW())
            """)

            self.db.execute(query, {
                "id_usuario": user_id,
                "tipo_infraccion": datos_validados.get("tipo_infraccion", "otro"),
                "descripcion": datos_validados.get("descripcion", ""),
                "direccion": datos_validados.get("direccion", ""),
                "latitud": datos_validados.get("latitud"),
                "longitud": datos_validados.get("longitud"),
                "placa": datos_validados.get("placa"),
                "fecha_incidente": datos_validados.get("fecha_incidente"),
                "hora_incidente": datos_validados.get("hora_incidente"),
                "prioridad": prioridad
            })

            self.db.commit()

            return {
                "status": "success",
                "needs_more_info": False,
                "message": "✅ ¡Reporte creado exitosamente! 🎉\n\n📋 Resumen:\n" +
                          f"• Tipo: {datos_validados.get('tipo_infraccion', 'otro')}\n" +
                          f"• Descripción: {datos_validados.get('descripcion', '')}\n" +
                          f"• Dirección: {datos_validados.get('direccion', '')}\n" +
                          (f"• Placa: {datos_validados.get('placa', '')}\n" if datos_validados.get('placa') else "") +
                          "\nPodrás subir fotos desde 'Mis Reportes'.",
                "reporte": datos_validados
            }

        except Exception as e:
            logger.exception(f"[REPORTE] Error creando: {str(e)}")
            self.db.rollback()
            return {
                "status": "error",
                "needs_more_info": False,
                "message": f"Error al crear reporte: {str(e)}"
            }

    def _determinar_prioridad(self, tipo_infraccion: str) -> str:
        """Determina prioridad basada en tipo."""
        alta_prioridad = ["accidente", "exceso_velocidad", "semaforo", "peaton", "doble_linea"]
        return "alta" if tipo_infraccion in alta_prioridad else "media"
