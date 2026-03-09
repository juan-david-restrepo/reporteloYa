package com.reporteloya.backend.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.reporteloya.backend.dto.ReporteSocketDTO;
import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.service.ReporteService;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    // ✅ Inyección correcta
    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @PostMapping(value = "/crear", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> crearReporte(

            @RequestParam String descripcion,
            @RequestParam String direccion,
            @RequestParam Double latitud,
            @RequestParam Double longitud,
            @RequestParam(name = "placa", required = false) String placa,
            @RequestParam String tipoInfraccion,
            @RequestParam(required = false) String fechaIncidente,
            @RequestParam(required = false) String horaIncidente,

            @RequestParam("archivos") List<MultipartFile> archivos,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(403).body("No autenticado");
        }

        try {
            Reporte reporte = reporteService.crearReporte(
                    descripcion,
                    direccion,
                    latitud,
                    longitud,
                    placa,
                    fechaIncidente,
                    horaIncidente,
                    tipoInfraccion,
                    archivos);

            return ResponseEntity.ok(reporte);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/pendientes")
    public ResponseEntity<List<Reporte>> obtenerPendientes() {
        return ResponseEntity.ok(reporteService.obtenerPendientes());
    }

    // 🔹 Tomar reporte
    @PostMapping("/aceptar/{id}")
    public ResponseEntity<?> tomarReporte(
            @PathVariable Long id,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(403).body("No autenticado");
        }

        String placaAgente = authentication.getName();

        Reporte actualizado = reporteService.tomarReporte(id, placaAgente);

        return ResponseEntity.ok(actualizado);
    }

    @PostMapping("/rechazar/{id}")
    public ResponseEntity<?> rechazarReporte(
            @PathVariable Long id,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(403).body("No autenticado");
        }

        String placaAgente = authentication.getName();

        Reporte actualizado = reporteService.tomarReporte(id, placaAgente);

        return ResponseEntity.ok(actualizado);
    }

    @PostMapping("/finalizar/{id}")
    public ResponseEntity<?> finalizarReporte(
            @PathVariable Long id,
            Authentication authentication) {

        String placaAgente = authentication.getName();
        Reporte actualizado = reporteService.finalizarReporte(id, placaAgente);

        return ResponseEntity.ok(actualizado);
    }

    @GetMapping("/agente")
    public ResponseEntity<List<ReporteSocketDTO>> obtenerReportesAgente(Authentication authentication) {

        String placaAgente = authentication.getName();

        return ResponseEntity.ok(
                reporteService.obtenerReportesDTOParaAgente(placaAgente)
        );
    }

    @GetMapping("/agente/historial")
    public ResponseEntity<?> historialAgente(Authentication authentication) {

        String placaAgente = authentication.getName();

        return ResponseEntity.ok(
                reporteService.obtenerHistorialAgente(placaAgente));
    }

    @GetMapping("/debug")
    public ResponseEntity<?> debug(Authentication auth) {
        return ResponseEntity.ok(auth.getName());
    }

    @GetMapping
    public Page<Reporte> listarReportes(
            @RequestParam(required = false) String prioridad,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {

        return reporteService.obtenerReportes(prioridad, page, size);
    }

    
}