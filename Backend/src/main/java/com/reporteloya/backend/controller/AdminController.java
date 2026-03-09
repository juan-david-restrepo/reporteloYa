package com.reporteloya.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
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
import com.reporteloya.backend.entity.Tarea;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.service.AgenteService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.reporteloya.backend.repository.TareaRepository;

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

    // =========================
    // LISTAR TODOS LOS AGENTES
    // =========================
    @GetMapping("/agentes")
    public List<Agentes> obtenerTodos() {
        return agenteService.listarTodos();
    }

    // =========================
    // BUSCAR POR PLACA
    // =========================
    @GetMapping("/agentes/{placa}")
    public ResponseEntity<?> obtenerAgentePorPlaca(@PathVariable String placa) {

        Optional<Agentes> agente = agenteService.buscarPorPlaca(placa);

        if (agente.isPresent()) {
            return ResponseEntity.ok(agente.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // =========================
    // AGREGAR TAREA (Múltiples)
    // =========================
    @PostMapping("/{placa}/tareas")
    public ResponseEntity<Agentes> agregarTarea(@PathVariable String placa, @RequestBody Tarea nuevaTarea) {

        return agenteService.buscarPorPlaca(placa).map(agente -> {

            nuevaTarea.setAgente(agente);
            agente.getListaTareas().add(nuevaTarea);
            agente.setEstado("PENDIENTE");

            Agentes actualizado = agenteService.guardar(agente);

            // 🔥 ENVIAR TAREA POR WEBSOCKET
            messagingTemplate.convertAndSend("/topic/tareas/" + placa, nuevaTarea);

            return ResponseEntity.ok(actualizado);

        }).orElse(ResponseEntity.notFound().build());
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
            return ResponseEntity.ok(agente.getListaTareas());
        }

        return ResponseEntity.notFound().build();
    }


}