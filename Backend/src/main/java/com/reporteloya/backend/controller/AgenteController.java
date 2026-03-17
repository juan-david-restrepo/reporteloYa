package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.EstadoAgenteDTO;
import com.reporteloya.backend.dto.PerfilAgenteDTO;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Tarea;
import com.reporteloya.backend.repository.TareaRepository;
import com.reporteloya.backend.service.AgenteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional; // IMPORTANTE PARA EL BORRADO
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/agente")
@CrossOrigin(origins = {"http://localhost:4200"})
public class AgenteController {

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private AgenteService agenteService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/perfil")
    public ResponseEntity<PerfilAgenteDTO> obtenerPerfilAgente(Authentication authentication) {

        String email = authentication.getName();

        return agenteService.buscarPorEmail(email)
                .map(agente -> {
                    PerfilAgenteDTO dto = new PerfilAgenteDTO(
                            agente.getNombreCompleto(),
                            agente.getNumeroDocumento(),
                            agente.getEmail(),
                            agente.getPlaca(),
                            agente.getTelefono(),
                            agente.getEstado(),
                            agente.getFoto()
                    );
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/tareas")
    public ResponseEntity<List<Tarea>> obtenerTareasAgente(Authentication authentication){

        String email = authentication.getName();

        return agenteService.buscarPorEmail(email)
            .map(agente -> ResponseEntity.ok(agente.getListaTareas()))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/estado")
    public ResponseEntity<?> actualizarEstado(
            Authentication authentication,
            @RequestBody Map<String, String> body) {

        String email = authentication.getName();
        String nuevoEstado = body.get("estado");

        return agenteService.buscarPorEmail(email).map(agente -> {

            agente.setEstado(nuevoEstado);
            agenteService.guardar(agente);

            EstadoAgenteDTO dto =
                    new EstadoAgenteDTO(agente.getPlaca(), nuevoEstado);

            messagingTemplate.convertAndSend("/topic/estado-agentes", dto);

            return ResponseEntity.ok(dto);

        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tareas/{id}/estado")
    public ResponseEntity<?> actualizarEstadoTarea(
            @PathVariable Long id,
            @RequestBody Map<String,String> body){

        String nuevoEstado = body.get("estado");
        String resumenOperativo = body.get("resumenOperativo");
        
        System.out.println("=== ACTUALIZAR TAREA ===");
        System.out.println("ID: " + id);
        System.out.println("Estado: " + nuevoEstado);
        System.out.println("Resumen Operativo: " + resumenOperativo);
        System.out.println("========================");

        return tareaRepository.findById(id).map(tarea -> {

            tarea.setEstado(nuevoEstado);
            
            if (resumenOperativo != null && !resumenOperativo.isEmpty()) {
                System.out.println("Guardando resumen: " + resumenOperativo);
                tarea.setResumenOperativo(resumenOperativo);
            }

            tareaRepository.save(tarea);

            // enviar websocket
            messagingTemplate.convertAndSend(
                "/topic/tarea-estado",
                tarea
            );

            return ResponseEntity.ok(tarea);

        }).orElse(ResponseEntity.notFound().build());
    }
 
}