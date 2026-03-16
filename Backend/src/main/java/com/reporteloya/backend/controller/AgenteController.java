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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.Map;
import java.util.List;
import java.util.Base64;
import java.io.File;
import java.util.UUID;

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
                            agente.getFoto(),
                            agente.getResumenProfesional1(),
                            agente.getResumenProfesional2(),
                            agente.getResumenProfesional3(),
                            agente.getResumenProfesional4()
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

        return tareaRepository.findById(id).map(tarea -> {

            tarea.setEstado(nuevoEstado);

            tareaRepository.save(tarea);

            // enviar websocket
            messagingTemplate.convertAndSend(
                "/topic/tarea-estado",
                tarea
            );

            return ResponseEntity.ok(tarea);

        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/perfil")
    public ResponseEntity<PerfilAgenteDTO> actualizarPerfilAgente(
            Authentication authentication,
            @RequestBody Map<String, String> body) {

        String email = authentication.getName();

        return agenteService.buscarPorEmail(email)
                .map(agente -> {
                    if (body.containsKey("placa") && body.get("placa") != null && !body.get("placa").isBlank()) {
                        agente.setPlaca(body.get("placa"));
                    }
                    if (body.containsKey("telefono") && body.get("telefono") != null && !body.get("telefono").isBlank()) {
                        agente.setTelefono(body.get("telefono"));
                    }
                    if (body.containsKey("nombre") && body.get("nombre") != null && !body.get("nombre").isBlank()) {
                        agente.setNombre(body.get("nombre"));
                    }
                    if (body.containsKey("documento") && body.get("documento") != null && !body.get("documento").isBlank()) {
                        agente.setDocumento(body.get("documento"));
                    }
                    if (body.containsKey("correo") && body.get("correo") != null && !body.get("correo").isBlank()) {
                        agente.setEmail(body.get("correo"));
                    }
                    
                    // Resumen profesional 1
                    if (body.containsKey("resumenProfesional1") && body.get("resumenProfesional1") != null) {
                        String resumen = body.get("resumenProfesional1");
                        if (resumen.length() > 40) resumen = resumen.substring(0, 40);
                        agente.setResumenProfesional1(resumen.isBlank() ? null : resumen);
                    }
                    // Resumen profesional 2
                    if (body.containsKey("resumenProfesional2") && body.get("resumenProfesional2") != null) {
                        String resumen = body.get("resumenProfesional2");
                        if (resumen.length() > 40) resumen = resumen.substring(0, 40);
                        agente.setResumenProfesional2(resumen.isBlank() ? null : resumen);
                    }
                    // Resumen profesional 3
                    if (body.containsKey("resumenProfesional3") && body.get("resumenProfesional3") != null) {
                        String resumen = body.get("resumenProfesional3");
                        if (resumen.length() > 40) resumen = resumen.substring(0, 40);
                        agente.setResumenProfesional3(resumen.isBlank() ? null : resumen);
                    }
                    // Resumen profesional 4
                    if (body.containsKey("resumenProfesional4") && body.get("resumenProfesional4") != null) {
                        String resumen = body.get("resumenProfesional4");
                        if (resumen.length() > 40) resumen = resumen.substring(0, 40);
                        agente.setResumenProfesional4(resumen.isBlank() ? null : resumen);
                    }

                    agenteService.guardar(agente);

                    PerfilAgenteDTO dto = new PerfilAgenteDTO(
                            agente.getNombreCompleto(),
                            agente.getNumeroDocumento(),
                            agente.getEmail(),
                            agente.getPlaca(),
                            agente.getTelefono(),
                            agente.getEstado(),
                            agente.getFoto(),
                            agente.getResumenProfesional1(),
                            agente.getResumenProfesional2(),
                            agente.getResumenProfesional3(),
                            agente.getResumenProfesional4()
                    );
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/perfil/foto")
    public ResponseEntity<PerfilAgenteDTO> actualizarFotoPerfil(
            Authentication authentication,
            @RequestBody Map<String, String> body) {

        String email = authentication.getName();
        String fotoBase64 = body.get("foto");

        if (fotoBase64 == null || fotoBase64.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return agenteService.buscarPorEmail(email)
                .map(agente -> {
                    try {
                        String extension = ".png";
                        if (fotoBase64.contains("image/jpeg")) {
                            extension = ".jpg";
                        } else if (fotoBase64.contains("image/webp")) {
                            extension = ".webp";
                        }

                        String base64Data = fotoBase64.contains(",") 
                            ? fotoBase64.split(",")[1] 
                            : fotoBase64;

                        byte[] imageBytes = Base64.getDecoder().decode(base64Data);

                        String fileName = "perfil_" + agente.getId() + "_" + UUID.randomUUID() + extension;
                        
                        String uploadDir = System.getProperty("user.dir") + "/uploads/perfiles/";
                        File dir = new File(uploadDir);
                        if (!dir.exists()) {
                            dir.mkdirs();
                        }

                        File file = new File(uploadDir + fileName);
                        java.nio.file.Files.write(file.toPath(), imageBytes);

                        String baseUrl = "http://localhost:8080";
                        agente.setFoto(baseUrl + "/uploads/perfiles/" + fileName);

                        agenteService.guardar(agente);

                        PerfilAgenteDTO dto = new PerfilAgenteDTO(
                                agente.getNombreCompleto(),
                                agente.getNumeroDocumento(),
                                agente.getEmail(),
                                agente.getPlaca(),
                                agente.getTelefono(),
                                agente.getEstado(),
                                agente.getFoto(),
                                agente.getResumenProfesional1(),
                                agente.getResumenProfesional2(),
                                agente.getResumenProfesional3(),
                                agente.getResumenProfesional4()
                        );
                        return ResponseEntity.ok(dto);
                    } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.internalServerError().build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
   
}