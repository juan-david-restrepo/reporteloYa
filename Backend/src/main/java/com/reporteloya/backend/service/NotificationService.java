package com.reporteloya.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reporteloya.backend.dto.NotificacionDTO;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Notification;
import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.reporteloya.backend.entity.TicketSoporte;

import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

    

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationService(SimpMessagingTemplate messagingTemplate, 
                               NotificationRepository notificationRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationRepository = notificationRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.findAndRegisterModules();
    }

    public void notifyNewReport(Reporte reporte) {
        messagingTemplate.convertAndSend("/topic/admins", reporte);
        messagingTemplate.convertAndSend("/topic/agentes", reporte);
        messagingTemplate.convertAndSend("/topic/reportes", reporte);
    }

    public void notifyReporteAceptado(Reporte reporte, Agentes agente) {
        System.out.println("=== NOTIFY REPORTE ACEPTADO ===");
        System.out.println("Reporte ID: " + reporte.getId());
        System.out.println("Reporte usuario: " + (reporte.getUsuario() != null ? reporte.getUsuario().getId() + " - " + reporte.getUsuario().getEmail() : "NULL"));
        
        if (reporte.getUsuario() == null) {
            System.out.println("ERROR: reporte.getUsuario() es NULL");
            return;
        }

        Usuario usuario = reporte.getUsuario();
        String titulo = "Reporte aceptado";
        String mensaje = "Tu reporte ha sido aceptado - Agente en camino";
        
        Map<String, Object> datosAdicionales = new HashMap<>();
        datosAdicionales.put("reporteId", reporte.getId());
        datosAdicionales.put("direccion", reporte.getDireccion());
        datosAdicionales.put("tipoInfraccion", reporte.getTipoInfraccion());
        datosAdicionales.put("agenteNombre", agente.getNombre());
        datosAdicionales.put("agentePlaca", agente.getPlaca());
        
        Notification notificacion = crearNotificacion(
            "REPORTE_ACEPTADO",
            titulo,
            mensaje,
            usuario,
            null,
            reporte.getId(),
            datosAdicionales
        );
        
        System.out.println("Notificación creada con ID: " + notificacion.getId());
        System.out.println("Enviando a usuario email: " + usuario.getEmail());
        
        enviarNotificacionCiudadano(notificacion, usuario.getEmail());
        System.out.println("=== FIN NOTIFY ===");
    }

    public void notifyReporteRechazado(Reporte reporte, Agentes agente) {
        System.out.println("=== NOTIFY REPORTE RECHAZADO ===");
        System.out.println("Reporte ID: " + reporte.getId());
        System.out.println("Reporte usuario: " + (reporte.getUsuario() != null ? reporte.getUsuario().getId() + " - " + reporte.getUsuario().getEmail() : "NULL"));
        
        if (reporte.getUsuario() == null) {
            System.out.println("ERROR: reporte.getUsuario() es NULL");
            return;
        }

        Usuario usuario = reporte.getUsuario();
        String titulo = "Reporte no aceptado";
        String mensaje = "Tu reporte no ha sido aceptado en esta ocasión";
        
        Map<String, Object> datosAdicionales = new HashMap<>();
        datosAdicionales.put("reporteId", reporte.getId());
        datosAdicionales.put("direccion", reporte.getDireccion());
        datosAdicionales.put("tipoInfraccion", reporte.getTipoInfraccion());
        
        Notification notificacion = crearNotificacion(
            "REPORTE_RECHAZADO",
            titulo,
            mensaje,
            usuario,
            null,
            reporte.getId(),
            datosAdicionales
        );
        
        System.out.println("Notificación creada con ID: " + notificacion.getId());
        System.out.println("Enviando a usuario email: " + usuario.getEmail());
        
        enviarNotificacionCiudadano(notificacion, usuario.getEmail());
    }

    public void notifyReporteFinalizado(Reporte reporte) {
        if (reporte.getUsuario() == null) {
            return;
        }

        Usuario usuario = reporte.getUsuario();
        String titulo = "Reporte finalizado";
        String mensaje = "Tu reporte ha sido atendido y cerrado";
        
        Map<String, Object> datosAdicionales = new HashMap<>();
        datosAdicionales.put("reporteId", reporte.getId());
        datosAdicionales.put("direccion", reporte.getDireccion());
        
        Notification notificacion = crearNotificacion(
            "REPORTE_FINALIZADO",
            titulo,
            mensaje,
            usuario,
            null,
            reporte.getId(),
            datosAdicionales
        );
        
        System.out.println("Enviando notificación FINALIZADO a email: " + usuario.getEmail());
        enviarNotificacionCiudadano(notificacion, usuario.getEmail());
    }

    private Notification crearNotificacion(String tipo, String titulo, String mensaje, 
                                             Usuario usuario, Agentes agente,
                                             Long idReferencia, 
                                             Map<String, Object> datosAdicionales) {
        Notification notificacion = new Notification();
        notificacion.setTipo(tipo);
        notificacion.setTitulo(titulo);
        notificacion.setMensaje(mensaje);
        notificacion.setUsuario(usuario);
        notificacion.setAgente(agente);
        notificacion.setIdReferencia(idReferencia);
        notificacion.setLeida(false);
        
        if (datosAdicionales != null && !datosAdicionales.isEmpty()) {
            try {
                notificacion.setDatosAdicionales(objectMapper.writeValueAsString(datosAdicionales));
            } catch (Exception e) {
                System.err.println("Error serializando datos adicionales: " + e.getMessage());
            }
        }
        
        notificationRepository.save(notificacion);
        
        return notificacion;
    }

    private void enviarNotificacionCiudadano(Notification notificacion, String userEmail) {
        NotificacionDTO dto = new NotificacionDTO(
            notificacion.getId(),
            notificacion.getTipo(),
            notificacion.getTitulo(),
            notificacion.getMensaje(),
            notificacion.getLeida(),
            notificacion.getFechaCreacion(),
            notificacion.getIdReferencia(),
            notificacion.getDatosAdicionales()
        );
        
        String userDestination = "/user/" + userEmail + "/queue/notifications";
        System.out.println("📨 WS: Enviando notificación a: " + userDestination);
        
        messagingTemplate.convertAndSend(userDestination, dto);
        
        // También enviar al topic público por si el usuario no tiene sesión activa
        if (notificacion.getUsuario() != null && notificacion.getUsuario().getId() != null) {
            String topicDestination = "/topic/ciudadano/" + notificacion.getUsuario().getId();
            System.out.println("📨 WS: Enviando también a topic público: " + topicDestination);
            messagingTemplate.convertAndSend(topicDestination, dto);
        }
    }

    @Transactional
    public void cleanupNotificacionesAntiguas(Long usuarioId) {
        notificationRepository.eliminarExtrasParaUsuario(usuarioId);
    }

    public void notifyTicketRespondido(TicketSoporte ticket, String contenidoRespuesta) {
        if (ticket.getUsuario() == null) {
            return;
        }

        Usuario usuario = ticket.getUsuario();
        String titulo = "Tu ticket de soporte ha sido respondido";
        String mensaje = "El administrador ha respondido tu ticket: " + ticket.getTitulo();
        
        String preview = contenidoRespuesta != null && contenidoRespuesta.length() > 50 
            ? contenidoRespuesta.substring(0, 50) + "..." 
            : contenidoRespuesta;
        
        Map<String, Object> datosAdicionales = new HashMap<>();
        datosAdicionales.put("ticketId", ticket.getId());
        datosAdicionales.put("preview", preview);
        datosAdicionales.put("estado", ticket.getEstado().toString());
        
        Notification notificacion = crearNotificacion(
            "TICKET_RESPONDIDO",
            titulo,
            mensaje,
            usuario,
            null,
            ticket.getId(),
            datosAdicionales
        );
        
        enviarNotificacionCiudadano(notificacion, usuario.getEmail());
    }

    public void notifyTicketCerrado(TicketSoporte ticket) {
        if (ticket.getUsuario() == null) {
            return;
        }

        Usuario usuario = ticket.getUsuario();
        String titulo = "Tu ticket de soporte ha sido cerrado";
        String mensaje = "El ticket \"" + ticket.getTitulo() + "\" ha sido marcado como resuelto";
        
        Map<String, Object> datosAdicionales = new HashMap<>();
        datosAdicionales.put("ticketId", ticket.getId());
        datosAdicionales.put("estado", ticket.getEstado().toString());
        
        Notification notificacion = crearNotificacion(
            "TICKET_CERRADO",
            titulo,
            mensaje,
            usuario,
            null,
            ticket.getId(),
            datosAdicionales
        );
        
        enviarNotificacionCiudadano(notificacion, usuario.getEmail());
    }
}
