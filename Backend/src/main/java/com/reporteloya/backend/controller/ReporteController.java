package com.reporteloya.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.reporteloya.backend.dto.AgenteDisponibleDTO;
import com.reporteloya.backend.dto.ReporteSocketDTO;
import com.reporteloya.backend.dto.EstadisticasDashboardDTO;
import com.reporteloya.backend.dto.EstadisticasCompletasDTO;
import com.reporteloya.backend.dto.AdminDashboardDTO;
import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.service.ReporteService;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    // ================================
    // CREAR REPORTE (ciudadano)
    // ================================
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
            return ResponseEntity.status(403).body(Map.of("error", "No autenticado"));
        }

        try {
            Usuario usuario = (Usuario) authentication.getPrincipal();
            
            System.out.println("=== CREAR REPORTE ===");
            System.out.println("Usuario ID: " + usuario.getId());
            System.out.println("Usuario Email: " + usuario.getEmail());
            System.out.println("Usuario Nombre: " + usuario.getNombreCompleto());
            System.out.println("====================");
            
            Reporte reporte = reporteService.crearReporte(
                    descripcion, direccion, latitud, longitud,
                    placa, fechaIncidente, horaIncidente,
                    tipoInfraccion, archivos, usuario);

            return ResponseEntity.ok(reporte);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ================================
    // ACEPTAR REPORTE (ir SOLO)
    // ================================
    @PostMapping("/aceptar/{id}")
    public ResponseEntity<?> tomarReporte(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            System.out.println("=== ACEPTAR REPORTE (SOLO) ===");
            System.out.println("Reporte ID: " + id);
            System.out.println("Email del token: " + email);
            System.out.println("User ID: " + userId);
            System.out.println("User Nombre: " + usuario.getNombreCompleto());
            System.out.println("===============================");
            
            Reporte actualizado = reporteService.tomarReporte(id, email, userId);
            return ResponseEntity.ok(reporteService.convertirADTO(actualizado));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // ACEPTAR REPORTE (ir ACOMPAÑADO)
    // ================================
    @PostMapping("/aceptar/{id}/acompanado")
    public ResponseEntity<?> tomarReporteAcompanado(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        String placaCompanero = body.get("placaCompanero");

        if (placaCompanero == null || placaCompanero.isBlank()) {
            return ResponseEntity.badRequest().body("Debes indicar la placa del compañero");
        }

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            System.out.println("=== ACEPTAR REPORTE (ACOMPAÑADO) ===");
            System.out.println("Reporte ID: " + id);
            System.out.println("Email: " + email);
            System.out.println("User ID: " + userId);
            System.out.println("Placa Compañero: " + placaCompanero);
            System.out.println("==================================");
            
            Reporte actualizado = reporteService.tomarReporteConCompanero(
                    id, email, placaCompanero, userId);
            return ResponseEntity.ok(reporteService.convertirADTO(actualizado));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // RECHAZAR REPORTE
    // ================================
    @PostMapping("/rechazar/{id}")
    public ResponseEntity<?> rechazarReporte(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            Reporte actualizado = reporteService.rechazarReporte(id, email, userId);
            return ResponseEntity.ok(reporteService.convertirADTO(actualizado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // FINALIZAR REPORTE
    // ================================
    @PostMapping("/finalizar/{id}")
    public ResponseEntity<?> finalizarReporte(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        String resumen = body.get("resumen");

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            Reporte actualizado = reporteService.finalizarReporte(
                    id, email, resumen, userId);
            return ResponseEntity.ok(reporteService.convertirADTO(actualizado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // REPORTES ACTIVOS DEL AGENTE
    // (pendientes globales + su EN_PROCESO)
    // ================================
    @GetMapping("/agente")
    public ResponseEntity<List<ReporteSocketDTO>> obtenerReportesAgente(
            Authentication authentication) {

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            return ResponseEntity.ok(
                reporteService.obtenerReportesDTOParaAgente(email, userId)
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ================================
    // HISTORIAL DEL AGENTE
    // (finalizados donde participó)
    // ================================
    @GetMapping("/agente/historial")
    public ResponseEntity<List<ReporteSocketDTO>> historialAgente(
            Authentication authentication) {

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            return ResponseEntity.ok(
                reporteService.obtenerHistorialAgente(email, userId)
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ================================
    // BUSCAR AGENTE DISPONIBLE POR PLACA
    // (para el modal de acompañado)
    // ================================
    @GetMapping("/buscar-agente/{placa}")
    public ResponseEntity<?> buscarAgenteDisponible(
            @PathVariable String placa,
            Authentication authentication) {

        try {
            AgenteDisponibleDTO dto = reporteService.buscarAgenteDisponible(
                    placa, authentication.getName());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // REPORTES PENDIENTES (admin)
    // ================================
    @GetMapping("/pendientes")
    public ResponseEntity<List<Reporte>> obtenerPendientes() {
        return ResponseEntity.ok(reporteService.obtenerPendientes());
    }

    // ================================
    // SCROLL PAGINADO (admin / general)
    // ================================
    @GetMapping
    public Page<Reporte> listarReportes(
            @RequestParam(required = false) String prioridad,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {

        return reporteService.obtenerReportes(prioridad, page, size);
    }

    // ================================
    // OBTENER TODOS LOS REPORTES (dashboard admin)
    // ================================
    @GetMapping("/todos")
    public Page<ReporteSocketDTO> obtenerTodosLosReportes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        return reporteService.obtenerTodosLosReportesDTO(page, size);
    }

    // ================================
    // ESTADÍSTICAS PARA DASHBOARD DEL AGENTE
    // ================================
    @GetMapping("/estadisticas")
    public ResponseEntity<?> obtenerEstadisticasDashboard(
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {

        try {
            return ResponseEntity.ok(
                reporteService.obtenerEstadisticasDashboard(fechaInicio, fechaFin)
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // ESTADÍSTICAS GLOBALES ADMIN
    // ================================
    @GetMapping("/estadisticas-admin")
    public ResponseEntity<?> obtenerEstadisticasAdmin() {
        try {
            return ResponseEntity.ok(reporteService.obtenerEstadisticasAdmin());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================================
    // ESTADÍSTICAS COMPLETAS (TARJETAS + GRÁFICAS)
    // ================================
    @GetMapping("/estadisticas-completas")
    public ResponseEntity<?> obtenerEstadisticasCompletas(
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            Authentication authentication) {

        try {
            String email = authentication.getName();
            Usuario usuario = (Usuario) authentication.getPrincipal();
            Long userId = usuario.getId();
            
            return ResponseEntity.ok(
                reporteService.obtenerEstadisticasCompletas(email, userId, fechaInicio, fechaFin)
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/debug")
    public ResponseEntity<?> debug(Authentication auth) {
        return ResponseEntity.ok(auth.getName());
    }
    
}
