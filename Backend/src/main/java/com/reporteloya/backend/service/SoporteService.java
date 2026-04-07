package com.reporteloya.backend.service;

import com.reporteloya.backend.dto.*;
import com.reporteloya.backend.entity.*;
import com.reporteloya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SoporteService {

    private final TicketSoporteRepository ticketRepository;
    private final MensajeSoporteRepository mensajeRepository;
    private final UsuarioRepository usuarioRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Transactional
    public ResponseEntity<?> crearTicket(CrearTicketRequest request, Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        TicketSoporte ticket = new TicketSoporte();
        ticket.setUsuario(usuario);
        ticket.setTitulo(request.getTitulo());
        ticket.setDescripcion(request.getDescripcion());

        if (request.getPrioridad() != null && !request.getPrioridad().isEmpty()) {
            try {
                ticket.setPrioridad(PrioridadTicket.valueOf(request.getPrioridad().toUpperCase()));
            } catch (IllegalArgumentException e) {
                ticket.setPrioridad(PrioridadTicket.MEDIA);
            }
        }

        ticket = ticketRepository.save(ticket);

        MensajeSoporte mensajeInicial = new MensajeSoporte();
        mensajeInicial.setTicket(ticket);
        mensajeInicial.setEmisor(usuario);
        mensajeInicial.setContenido(request.getDescripcion());
        mensajeInicial.setEsAdmin(false);
        mensajeRepository.save(mensajeInicial);

        TicketSoporteDTO dto = convertirATicketDTO(ticket);

        messagingTemplate.convertAndSend("/topic/soporte/nuevos", dto);

        return ResponseEntity.ok(dto);
    }

    public ResponseEntity<?> obtenerTicketsPorUsuario(Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<TicketSoporte> tickets = ticketRepository.findByUsuarioIdOrderByFechaActualizacionDesc(usuario.getId());

        List<TicketSoporteDTO> dtos = tickets.stream()
                .map(this::convertirATicketDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    public ResponseEntity<?> obtenerTicketConMensajes(Long ticketId, Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        TicketSoporte ticket = ticketRepository.findByIdWithMensajes(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        if (!ticket.getUsuario().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes acceso a este ticket"));
        }

        return ResponseEntity.ok(convertirATicketDetalleDTO(ticket));
    }

    @Transactional
    public ResponseEntity<?> agregarMensaje(Long ticketId, ResponderTicketRequest request, Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        TicketSoporte ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        if (!ticket.getUsuario().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes acceso a este ticket"));
        }

        if (ticket.getEstado() == EstadoTicket.CERRADO) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes responder a un ticket cerrado"));
        }

        MensajeSoporte mensaje = new MensajeSoporte();
        mensaje.setTicket(ticket);
        mensaje.setEmisor(usuario);
        mensaje.setContenido(request.getContenido());
        mensaje.setEsAdmin(false);
        mensajeRepository.save(mensaje);

        return ResponseEntity.ok(convertirAMensajeDTO(mensaje));
    }

    public ResponseEntity<?> obtenerTodosLosTickets() {
        List<TicketSoporte> tickets = ticketRepository.findAllByOrderByFechaActualizacionDesc();

        List<TicketSoporteDTO> dtos = tickets.stream()
                .map(this::convertirATicketDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    public ResponseEntity<?> obtenerTicketAdmin(Long ticketId) {
        TicketSoporte ticket = ticketRepository.findByIdWithMensajes(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        return ResponseEntity.ok(convertirATicketDetalleDTO(ticket));
    }

    @Transactional
    public ResponseEntity<?> responderComoAdmin(Long ticketId, ResponderTicketRequest request, Authentication auth) {
        Usuario admin = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        TicketSoporte ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        if (ticket.getEstado() == EstadoTicket.CERRADO) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes responder a un ticket cerrado"));
        }

        if (ticket.getEstado() == EstadoTicket.ABIERTO) {
            ticket.setEstado(EstadoTicket.EN_PROCESO);
            ticketRepository.save(ticket);
        }

        MensajeSoporte mensaje = new MensajeSoporte();
        mensaje.setTicket(ticket);
        mensaje.setEmisor(admin);
        mensaje.setContenido(request.getContenido());
        mensaje.setEsAdmin(true);
        mensaje = mensajeRepository.save(mensaje);

        TicketSoporteDTO ticketDTO = convertirATicketDTO(ticket);
        messagingTemplate.convertAndSend("/topic/soporte/" + ticket.getId(), ticketDTO);

        notificationService.notifyTicketRespondido(ticket, request.getContenido());

        messagingTemplate.convertAndSend("/topic/soporte/nuevos", ticketDTO);

        return ResponseEntity.ok(convertirAMensajeDTO(mensaje));
    }

    @Transactional
    public ResponseEntity<?> cerrarTicket(Long ticketId) {
        TicketSoporte ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        ticket.setEstado(EstadoTicket.CERRADO);
        ticket.setFechaCierre(LocalDateTime.now());
        ticketRepository.save(ticket);

        TicketSoporteDTO ticketDTO = convertirATicketDTO(ticket);
        messagingTemplate.convertAndSend("/topic/soporte/" + ticket.getId(), ticketDTO);
        messagingTemplate.convertAndSend("/topic/soporte/nuevos", ticketDTO);

        notificationService.notifyTicketCerrado(ticket);

        return ResponseEntity.ok(ticketDTO);
    }

    public ResponseEntity<?> contarTickets() {
        long abiertos = ticketRepository.countByEstado(EstadoTicket.ABIERTO);
        long enProceso = ticketRepository.countByEstado(EstadoTicket.EN_PROCESO);
        long cerrados = ticketRepository.countByEstado(EstadoTicket.CERRADO);

        ContadorTicketsDTO contador = ContadorTicketsDTO.builder()
                .abiertos(abiertos)
                .enProceso(enProceso)
                .cerrados(cerrados)
                .build();

        return ResponseEntity.ok(contador);
    }

    private TicketSoporteDTO convertirATicketDTO(TicketSoporte ticket) {
        String ultimoMensaje = null;
        if (ticket.getMensajes() != null && !ticket.getMensajes().isEmpty()) {
            MensajeSoporte ultimo = ticket.getMensajes().get(ticket.getMensajes().size() - 1);
            String contenido = ultimo.getContenido();
            ultimoMensaje = contenido.length() > 80 ? contenido.substring(0, 80) + "..." : contenido;
        }

        return TicketSoporteDTO.builder()
                .id(ticket.getId())
                .titulo(ticket.getTitulo())
                .descripcion(ticket.getDescripcion())
                .prioridad(ticket.getPrioridad().name())
                .estado(ticket.getEstado().name())
                .nombreUsuario(ticket.getUsuario().getNombreCompleto())
                .usuarioId(ticket.getUsuario().getId())
                .cantidadMensajes(ticket.getMensajes() != null ? ticket.getMensajes().size() : 0)
                .ultimoMensaje(ultimoMensaje)
                .fechaCreacion(ticket.getFechaCreacion())
                .fechaActualizacion(ticket.getFechaActualizacion())
                .build();
    }

    private TicketDetalleDTO convertirATicketDetalleDTO(TicketSoporte ticket) {
        List<MensajeSoporteDTO> mensajesDTO = ticket.getMensajes().stream()
                .map(this::convertirAMensajeDTO)
                .collect(Collectors.toList());

        return TicketDetalleDTO.builder()
                .id(ticket.getId())
                .titulo(ticket.getTitulo())
                .descripcion(ticket.getDescripcion())
                .prioridad(ticket.getPrioridad().name())
                .estado(ticket.getEstado().name())
                .nombreUsuario(ticket.getUsuario().getNombreCompleto())
                .usuarioId(ticket.getUsuario().getId())
                .cantidadMensajes(ticket.getMensajes().size())
                .fechaCreacion(ticket.getFechaCreacion())
                .fechaActualizacion(ticket.getFechaActualizacion())
                .mensajes(mensajesDTO)
                .build();
    }

    private MensajeSoporteDTO convertirAMensajeDTO(MensajeSoporte mensaje) {
        return MensajeSoporteDTO.builder()
                .id(mensaje.getId())
                .ticketId(mensaje.getTicket().getId())
                .emisorNombre(mensaje.getEmisor().getNombreCompleto())
                .contenido(mensaje.getContenido())
                .esAdmin(mensaje.getEsAdmin())
                .leido(mensaje.getLeido())
                .fechaEnvio(mensaje.getFechaEnvio())
                .build();
    }
}
