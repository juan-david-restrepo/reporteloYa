package com.reporteloya.backend.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.reporteloya.backend.dto.NotificacionDTO;
import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.service.ReporteService;
import com.reporteloya.backend.service.NotificationService;
import com.reporteloya.backend.entity.Notification;
import com.reporteloya.backend.repository.NotificationRepository;

@RestController
@RequestMapping("/api/ciudadano")
public class CiudadanoController {

    private final ReporteService reporteService;
    private final NotificationRepository notificationRepository;

    public CiudadanoController(ReporteService reporteService, NotificationRepository notificationRepository) {
        this.reporteService = reporteService;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Acceso CIUDADANO permitido");
    }

    private Long getUsuarioId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Usuario usuario = (Usuario) authentication.getPrincipal();
        return usuario.getId();
    }

    @GetMapping("/mis-reportes")
    public ResponseEntity<?> misReportes() {
        try {
            Long usuarioId = getUsuarioId();
            List<Reporte> reportes = reporteService.obtenerReportesPorUsuario(usuarioId);
            return ResponseEntity.ok(reportes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/mis-reportes/estadisticas")
    public ResponseEntity<?> misReportesEstadisticas() {
        try {
            Long usuarioId = getUsuarioId();
            var stats = reporteService.obtenerEstadisticas(usuarioId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/mis-reportes/{id}")
    public ResponseEntity<?> eliminarReporte(@PathVariable Long id) {
        try {
            Long usuarioId = getUsuarioId();
            reporteService.eliminarReporte(id, usuarioId);
            return ResponseEntity.ok("Reporte eliminado");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/mis-reportes/{id}")
    public ResponseEntity<?> actualizarReporte(
            @PathVariable Long id,
            @RequestParam(required = false) String descripcion,
            @RequestParam(required = false) String direccion,
            @RequestParam(required = false) Double latitud,
            @RequestParam(required = false) Double longitud,
            @RequestParam(required = false) String placa,
            @RequestParam(required = false) String fechaIncidente,
            @RequestParam(required = false) String horaIncidente,
            @RequestParam(required = false) String tipoInfraccion) {
        try {
            Long usuarioId = getUsuarioId();
            Reporte reporte = reporteService.actualizarReporte(id, usuarioId, descripcion, direccion, 
                    latitud, longitud, placa, fechaIncidente, horaIncidente, tipoInfraccion);
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/notificaciones")
    public ResponseEntity<?> getNotificaciones() {
        try {
            Long usuarioId = getUsuarioId();
            List<Notification> notificaciones = notificationRepository.findUltimas50PorUsuarioId(usuarioId);
            List<NotificacionDTO> dtoList = new ArrayList<>();
            for (Notification n : notificaciones) {
                NotificacionDTO dto = new NotificacionDTO();
                dto.setId(n.getId());
                dto.setTipo(n.getTipo());
                dto.setTitulo(n.getTitulo());
                dto.setMensaje(n.getMensaje());
                dto.setLeida(n.getLeida());
                dto.setFechaCreacion(n.getFechaCreacion());
                dto.setIdReferencia(n.getIdReferencia());
                dto.setDatosAdicionales(n.getDatosAdicionales());
                dtoList.add(dto);
            }
            return ResponseEntity.ok(dtoList);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/notificaciones/no-leidas")
    public ResponseEntity<?> getNotificacionesNoLeidas() {
        try {
            Long usuarioId = getUsuarioId();
            List<Notification> notificaciones = notificationRepository.findNoLeidasPorUsuarioId(usuarioId);
            List<NotificacionDTO> dtoList = new ArrayList<>();
            for (Notification n : notificaciones) {
                NotificacionDTO dto = new NotificacionDTO();
                dto.setId(n.getId());
                dto.setTipo(n.getTipo());
                dto.setTitulo(n.getTitulo());
                dto.setMensaje(n.getMensaje());
                dto.setLeida(n.getLeida());
                dto.setFechaCreacion(n.getFechaCreacion());
                dto.setIdReferencia(n.getIdReferencia());
                dto.setDatosAdicionales(n.getDatosAdicionales());
                dtoList.add(dto);
            }
            return ResponseEntity.ok(dtoList);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/notificaciones/{id}/leida")
    public ResponseEntity<?> marcarNotificacionLeida(@PathVariable Long id) {
        try {
            Notification notificacion = notificationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Notificación no encontrada"));
            notificacion.setLeida(true);
            notificationRepository.save(notificacion);
            return ResponseEntity.ok("Notificación marcada como leída");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/notificaciones/leer-todas")
    public ResponseEntity<?> marcarTodasLeidas() {
        try {
            Long usuarioId = getUsuarioId();
            List<Notification> notificaciones = notificationRepository.findNoLeidasPorUsuarioId(usuarioId);
            for (Notification n : notificaciones) {
                n.setLeida(true);
                notificationRepository.save(n);
            }
            return ResponseEntity.ok("Todas las notificaciones marcadas como leídas");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
