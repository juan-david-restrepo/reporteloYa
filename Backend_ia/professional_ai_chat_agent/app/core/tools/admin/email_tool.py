"""
Tool de Envío de Correos Electrónicos para Administrador.
Proporciona funcionalidades robustas para enviar correos
con validación, manejo de errores y logging.
"""

from typing import Union, List, Dict, Any, Optional
import re

from app.services.email_service import EmailService
from app.core.tools.admin.base.nlp_parser import NLPParser
from app.utils.logger import logger


class EmailTool:
    """
    Tool profesional para envío de correos electrónicos.
    
    Funcionalidades:
    - Validación de direcciones de correo
    - Envío a uno o múltiples destinatarios
    - Manejo robusto de errores
    - Logging detallado
    - Extracción de emails desde texto
    """
    
    def __init__(self):
        """Inicializa el tool de email."""
        self.email_service = EmailService()
        self.nlp = NLPParser()
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """
        Valida si una dirección de correo es válida.
        
        Args:
            email: Dirección de correo a validar
        
        Returns:
            True si el correo es válido
        """
        if not email or not isinstance(email, str):
            return False
        
        email = email.strip()
        
        # Patrón básico de validación de email
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, email) is not None
    
    @staticmethod
    def _extract_emails(text: str) -> List[str]:
        """
        Extrae direcciones de correo de un texto.
        
        Args:
            text: Texto que puede contener emails
        
        Returns:
            Lista de emails válidos encontrados
        """
        if not text:
            return []
        
        # Patrón para buscar emails en texto
        pattern = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
        matches = re.findall(pattern, text)
        
        # Filtrar solo emails válidos
        return [EmailTool._normalize_email(email) for email in matches if EmailTool._is_valid_email(email)]
    
    @staticmethod
    def _normalize_email(email: str) -> str:
        """Normaliza un email a minúsculas y elimina espacios."""
        return email.strip().lower()
    
    @staticmethod
    def _sanitize_subject(subject: str) -> str:
        """Sanitiza el asunto del correo."""
        if not subject:
            return "Sin asunto"
        
        # Eliminar caracteres problemáticos
        subject = subject.strip()
        
        # Limitar longitud
        if len(subject) > 200:
            subject = subject[:197] + "..."
        
        return subject
    
    @staticmethod
    def _sanitize_content(content: str) -> str:
        """Sanitiza el contenido del correo."""
        if not content:
            raise ValueError("El contenido del correo está vacío")
        
        content = content.strip()
        
        if len(content) < 1:
            raise ValueError("El contenido del correo está vacío")
        
        return content
    
    def _validate_recipients(
        self,
        recipients: Union[str, List[str]]
    ) -> tuple:
        """
        Valida y normaliza los destinatarios.
        
        Returns:
            Tupla (es_válido, lista_emails, error_mensaje)
        """
        valid_emails = []
        
        if isinstance(recipients, str):
            # Es un solo email o texto con emails
            # Primero intentar extraer del texto
            extracted = self._extract_emails(recipients)
            if extracted:
                valid_emails = extracted
            elif self._is_valid_email(recipients):
                valid_emails = [self._normalize_email(recipients)]
            else:
                return False, [], f"Correo inválido: {recipients}"
        
        elif isinstance(recipients, list):
            # Es una lista
            for email in recipients:
                if self._is_valid_email(email):
                    valid_emails.append(self._normalize_email(email))
                else:
                    logger.warning(f"Email inválido omitido: {email}")
        
        else:
            return False, [], "Tipo de destinatario no válido"
        
        if not valid_emails:
            return False, [], "No se proporcionaron destinatarios válidos"
        
        return True, valid_emails, None
    
    async def send_email(
        self,
        to: Union[str, List[str]],
        subject: str,
        content: str,
        cc: Optional[Union[str, List[str]]] = None,
        bcc: Optional[Union[str, List[str]]] = None,
        es_html: bool = False
    ) -> Dict[str, Any]:
        """
        Envía un correo electrónico.
        
        Args:
            to: Destinatario(s)
            subject: Asunto del correo
            content: Contenido del correo
            cc: Copia (opcional)
            bcc: Copia oculta (opcional)
            es_html: Si True, el contenido es HTML
        
        Returns:
            Dict con resultado del envío
        """
        try:
            # Validar y sanitizar inputs
            subject = self._sanitize_subject(subject)
            content = self._sanitize_content(content)
            
            # Validar destinatarios
            valid, emails, error = self._validate_recipients(to)
            if not valid:
                logger.warning(f"Destinatarios inválidos: {error}")
                return {
                    "success": False,
                    "status": "validation_error",
                    "message": error,
                    "timestamp": self._get_timestamp()
                }
            
            # Validar CC si se proporciona
            cc_emails = []
            if cc:
                cc_valid, cc_emails, cc_error = self._validate_recipients(cc)
                if not cc_valid:
                    logger.warning(f"CC inválido: {cc_error}")
            
            # Validar BCC si se proporciona
            bcc_emails = []
            if bcc:
                bcc_valid, bcc_emails, bcc_error = self._validate_recipients(bcc)
                if not bcc_valid:
                    logger.warning(f"BCC inválido: {bcc_error}")
            
            # Enviar a cada destinatario
            resultados = []
            errores = []
            
            for email in emails:
                try:
                    logger.info(f"Enviando correo a: {email}")
                    
                    result = self.email_service.send_email(
                        to_email=email,
                        subject=subject,
                        content=content,
                        html=es_html
                    )
                    
                    if result:
                        resultados.append({
                            "email": email,
                            "status": "sent",
                            "result": result
                        })
                        logger.info(f"Correo enviado exitosamente a {email}")
                    else:
                        errores.append({
                            "email": email,
                            "status": "failed",
                            "error": "El servicio no devolvió resultado"
                        })
                        logger.warning(f"Error al enviar a {email}: sin resultado")
                        
                except Exception as e:
                    errores.append({
                        "email": email,
                        "status": "error",
                        "error": str(e)
                    })
                    logger.exception(f"Excepción enviando a {email}: {str(e)}")
            
            # Preparar respuesta
            if resultados and not errores:
                return {
                    "success": True,
                    "status": "sent",
                    "sent_count": len(resultados),
                    "recipients": emails,
                    "cc": cc_emails if cc_emails else None,
                    "subject": subject,
                    "results": resultados,
                    "timestamp": self._get_timestamp()
                }
            
            elif resultados and errores:
                return {
                    "success": True,
                    "status": "partial",
                    "sent_count": len(resultados),
                    "failed_count": len(errores),
                    "recipients": emails,
                    "results": resultados,
                    "errors": errores,
                    "timestamp": self._get_timestamp()
                }
            
            else:
                return {
                    "success": False,
                    "status": "failed",
                    "sent_count": 0,
                    "recipients": emails,
                    "errors": errores if errores else ["No se pudo enviar a ningún destinatario"],
                    "timestamp": self._get_timestamp()
                }
                
        except ValueError as ve:
            logger.warning(f"Error de validación: {str(ve)}")
            return {
                "success": False,
                "status": "validation_error",
                "message": str(ve),
                "timestamp": self._get_timestamp()
            }
            
        except Exception as e:
            logger.exception(f"Error enviando correo: {str(e)}")
            return {
                "success": False,
                "status": "error",
                "message": f"Error inesperado: {str(e)}",
                "timestamp": self._get_timestamp()
            }
    
    async def send_email_with_template(
        self,
        to: Union[str, List[str]],
        template: str,
        variables: Dict[str, Any],
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envía un correo usando una plantilla.
        
        Args:
            to: Destinatario(s)
            template: Nombre de la plantilla
            variables: Variables para la plantilla
            subject: Asunto (opcional)
        
        Returns:
            Dict con resultado
        """
        try:
            # Cargar plantilla
            content = self._load_template(template, variables)
            
            if not subject:
                subject = f"Información - {template}"
            
            return await self.send_email(to, subject, content)
            
        except Exception as e:
            logger.exception(f"Error con plantilla: {str(e)}")
            return {
                "success": False,
                "status": "template_error",
                "message": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _load_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Carga y procesa una plantilla."""
        templates = {
            "bienvenida": "Hola {nombre}, bienvenido al sistema de reportes de tránsito.",
            "recordatorio": "Hola {nombre}, tienes {cantidad} reportes pendientes de revisión.",
            "notificacion": "Hola {nombre}, se ha generado un nuevo reporte: {reporte}.",
            "resumen": "Hola {nombre}, aquí está el resumen de tu actividad: {resumen}."
        }
        
        content = templates.get(template.lower(), template)
        
        # Reemplazar variables
        for key, value in variables.items():
            content = content.replace(f"{{{key}}}", str(value))
        
        return content
    
    def _get_timestamp(self) -> str:
        """Obtiene timestamp actual."""
        from datetime import datetime
        return datetime.now().isoformat()


# Instancia global
_email_tool = None


def get_email_tool() -> EmailTool:
    """Factory para obtener instancia de EmailTool."""
    global _email_tool
    if _email_tool is None:
        _email_tool = EmailTool()
    return _email_tool


# ======================================================
# FUNCIONES DE COMPATIBILIDAD (mantienen API anterior)
# ======================================================

def send_email(
    to: Union[str, List[str]],
    subject: str,
    content: str
) -> Dict[str, Any]:
    """
    Función de compatibilidad para enviar correos.
    Mantiene la firma original: send_email(to, subject, content)
    """
    import asyncio
    
    async def _send():
        tool = get_email_tool()
        return await tool.send_email(to, subject, content)
    
    try:
        return asyncio.run(_send())
    except Exception as e:
        logger.exception(f"Error en send_email: {str(e)}")
        return {
            "success": False,
            "status": "error",
            "message": str(e)
        }


async def send_email_async(
    to: Union[str, List[str]],
    subject: str,
    content: str
) -> Dict[str, Any]:
    """
    Función asíncrona para enviar correos.
    """
    tool = get_email_tool()
    return await tool.send_email(to, subject, content)
