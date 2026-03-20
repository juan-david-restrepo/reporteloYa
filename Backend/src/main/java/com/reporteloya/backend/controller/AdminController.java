package com.reporteloya.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional; // IMPORTANTE PARA EL BORRADO
import java.util.List;          //  ESTE IMPORT FALTABA
import java.util.Optional;
import java.util.stream.Collectors;
import com.reporteloya.backend.entity.Tarea;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.entity.Notification;
import com.reporteloya.backend.dto.AdminAgenteDTO;
import com.reporteloya.backend.dto.ReporteSocketDTO;
import com.reporteloya.backend.dto.TareaSocketDTO;
import com.reporteloya.backend.service.AgenteService;
import com.reporteloya.backend.service.ReporteService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.reporteloya.backend.repository.TareaRepository;
import com.reporteloya.backend.repository.NotificationRepository;
import com.reporteloya.backend.repository.AgenteRepository;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/admin")
public class AdminController {

    /* constructor para enviar tareas */

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AgenteService agenteService;

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AgenteRepository agenteRepository;

    @Autowired
    private ReporteService reporteService;

    // =========================
    // LISTAR TODOS LOS AGENTES
    // =========================
    @GetMapping("/agentes")
    public List<AdminAgenteDTO> obtenerTodos() {
        return agenteService.listarTodos().stream()
                .map(this::toAdminDTO)
                .collect(Collectors.toList());
    }

    // =========================
    // BUSCAR POR PLACA
    // =========================
    @GetMapping("/agentes/{placa}")
    public ResponseEntity<AdminAgenteDTO> obtenerAgentePorPlaca(@PathVariable String placa) {

        Optional<Agentes> agente = agenteService.buscarPorPlaca(placa);

        if (agente.isPresent()) {
            return ResponseEntity.ok(toAdminDTO(agente.get()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    private AdminAgenteDTO toAdminDTO(Agentes a) {
        String nombre = a.getNombre();
        if (nombre == null || nombre.isBlank()) {
            nombre = a.getNombreCompleto();
        }

        String estado = a.getEstado();
        if (estado != null) {
            estado = estado.trim().toUpperCase();
        }

        return new AdminAgenteDTO(
                a.getId(),
                a.getPlaca(),
                nombre,
                estado,
                a.getTelefono(),
                a.getDocumento() != null ? a.getDocumento() : a.getNumeroDocumento(),
                a.getFoto(),
                0.0
        );
    }

    // =========================
    // AGREGAR TAREA (Múltiples)
    // =========================
    @PostMapping("/{placa}/tareas")
    @Transactional
    public ResponseEntity<?> agregarTarea(@PathVariable String placa, @RequestBody Tarea nuevaTarea) {

        Optional<Agentes> agenteOpt = agenteService.buscarPorPlaca(placa);

        if (agenteOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Agentes agente = agenteOpt.get();

        nuevaTarea.setAgente(agente);
        nuevaTarea.setEstado("PENDIENTE");

        Tarea tareaGuardada = tareaRepository.save(nuevaTarea);

        Agentes agenteActualizado = agenteRepository.findById(agente.getId()).orElse(agente);

        Notification notificacion = new Notification();
        notificacion.setAgente(agenteActualizado);
        notificacion.setTipo("TAREA");
        notificacion.setTitulo("Nueva tarea: " + tareaGuardada.getTitulo());
        notificacion.setMensaje(tareaGuardada.getDescripcion());
        notificacion.setLeida(false);
        notificacion.setFechaCreacion(LocalDateTime.now());
        notificacion.setIdReferencia(tareaGuardada.getId());
        notificationRepository.save(notificacion);

        TareaSocketDTO tareaSocket = new TareaSocketDTO(
            tareaGuardada.getId(),
            tareaGuardada.getTitulo(),
            tareaGuardada.getDescripcion(),
            tareaGuardada.getResumenOperativo(),
            tareaGuardada.getFecha(),
            tareaGuardada.getHora(),
            tareaGuardada.getPrioridad(),
            tareaGuardada.getEstado(),
            tareaGuardada.getFechaInicio(),
            tareaGuardada.getFechaFin(),
            agenteActualizado.getPlaca()
        );

        messagingTemplate.convertAndSend("/topic/tareas/" + placa, tareaSocket);

        return ResponseEntity.ok("Tarea asignada con éxito");
    }


    // ==========================================
    // ELIMINAR TAREA (CORRECCIÓN DEFINITIVA)
    // ==========================================
    @DeleteMapping("/tareas/{id}")

    @Transactional // Garantiza que los cambios se apliquen en la BD
    public ResponseEntity<Void> eliminarTarea(@PathVariable Long id) {
        return tareaRepository.findById(id).map(tarea -> {
            // 1. Rompemos el vínculo en Java para evitar conflictos de Foreign Key
            Agentes agente = tarea.getAgente();
            if (agente != null) {
                agente.getListaTareas().remove(tarea); // Se quita de la lista del Agente
            }
            
            // 2. Ejecutamos el borrado físico en MySQL
            tareaRepository.delete(tarea);
            
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // =========================
    // OBTENER TAREAS DE AGENTE
    // =========================
    @GetMapping("/{placa}")
    public ResponseEntity<?> obtenerTareasPorAgente(@PathVariable String placa) {

        Optional<Agentes> agenteOpt = agenteService.buscarPorPlaca(placa);

        if (agenteOpt.isPresent()) {
            Agentes agente = agenteOpt.get();
            List<Tarea> tareas = agente.getListaTareas();
            System.out.println("=== TAREAS DEBUG ===");
            System.out.println("Placa: " + placa);
            System.out.println("Cantidad tareas: " + tareas.size());
            for (Tarea t : tareas) {
                System.out.println("Tarea ID: " + t.getId() + " - Resumen: " + t.getResumenOperativo());
            }
            System.out.println("=====================");
            return ResponseEntity.ok(tareas);
        }

        return ResponseEntity.notFound().build();
    }

    // =========================
    // OBTENER REPORTES (HISTORIAL) DE AGENTE
    // =========================
    @GetMapping("/{placa}/reportes")
    public ResponseEntity<?> obtenerReportesPorAgente(@PathVariable String placa) {
        try {
            List<ReporteSocketDTO> reportes = reporteService.obtenerHistorialParaAdmin(placa);
            return ResponseEntity.ok(reportes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }



}