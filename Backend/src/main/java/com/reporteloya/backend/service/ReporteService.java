package com.reporteloya.backend.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.dto.ReporteSocketDTO;
import com.reporteloya.backend.dto.AgenteDisponibleDTO;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Evidencia;
import com.reporteloya.backend.entity.Prioridad;

import com.reporteloya.backend.repository.ReporteRepository;
import com.reporteloya.backend.repository.AgenteRepository;
import com.reporteloya.backend.repository.EvidenciaRepository;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.io.IOException;
import java.util.Optional;

@Service
public class ReporteService {

    private final ImageValidationService imageValidationService;
    private final AgenteRepository agenteRepository;
    private final ReporteRepository reporteRepository;
    private final EvidenciaRepository evidenciaRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ReporteService(
            ReporteRepository reporteRepository,
            AgenteRepository agenteRepository,
            EvidenciaRepository evidenciaRepository,
            FileStorageService fileStorageService,
            ImageValidationService imageValidationService,
            SimpMessagingTemplate messagingTemplate) {

        this.reporteRepository = reporteRepository;
        this.agenteRepository = agenteRepository;
        this.evidenciaRepository = evidenciaRepository;
        this.fileStorageService = fileStorageService;
        this.imageValidationService = imageValidationService;
        this.messagingTemplate = messagingTemplate;
    }

    // ================================
    // CREAR REPORTE
    // ================================
    public Reporte crearReporte(
            String descripcion,
            String direccion,
            Double latitud,
            Double longitud,
            String placa,
            String fechaIncidente,
            String horaIncidente,
            String tipoInfraccion,
            List<MultipartFile> archivos) {

        if (archivos == null || archivos.isEmpty()) {
            throw new RuntimeException("Debe subir al menos una imagen");
        }

        boolean imagenValida = false;

        for (MultipartFile archivo : archivos) {
            if (archivo.getContentType() == null ||
                    !archivo.getContentType().startsWith("image")) {
                continue;
            }
            try {
                if (imageValidationService.esImagenDeTransito(archivo)) {
                    imagenValida = true;
                    break;
                }
            } catch (Exception e) {
                throw new RuntimeException("Error validando imagen con IA: " + e.getMessage());
            }
        }

        if (!imagenValida) {
            throw new RuntimeException("La imagen no parece estar relacionada con tránsito");
        }

        Reporte reporte = new Reporte();
        reporte.setDescripcion(descripcion);
        reporte.setDireccion(direccion);
        reporte.setLatitud(latitud);
        reporte.setLongitud(longitud);
        reporte.setEstado("PENDIENTE");
        reporte.setAcompanado(false);
        reporte.setTipoInfraccion(tipoInfraccion);
        reporte.setPrioridad(obtenerPrioridadPorTipo(tipoInfraccion));

        if (placa != null && !placa.isBlank()) {
            reporte.setPlaca(placa.trim().toUpperCase());
        }

        if (fechaIncidente != null && !fechaIncidente.isBlank()) {
            try {
                reporte.setFechaIncidente(LocalDate.parse(fechaIncidente.trim()));
            } catch (Exception e) {
                throw new RuntimeException("Formato de fecha inválido. Debe ser yyyy-MM-dd");
            }
        }

        if (horaIncidente != null && !horaIncidente.isBlank()) {
            try {
                reporte.setHoraIncidente(
                    LocalTime.parse(horaIncidente.trim().substring(0, 5))
                );
            } catch (Exception e) {
                throw new RuntimeException("Formato de hora inválido. Debe ser HH:mm");
            }
        }

        Reporte guardado = reporteRepository.save(reporte);
        guardarEvidencias(archivos, guardado);

        ReporteSocketDTO dto = convertirADTO(guardado);
        messagingTemplate.convertAndSend("/topic/reportes", dto);

        return guardado;
    }

    // ================================
    // GUARDAR EVIDENCIAS
    // ================================
    private void guardarEvidencias(List<MultipartFile> archivos, Reporte reporte) {
        if (archivos == null || archivos.isEmpty()) return;

        for (MultipartFile archivo : archivos) {
            try {
                String url = fileStorageService.guardarArchivo(archivo, reporte.getId());
                Evidencia evidencia = new Evidencia();
                evidencia.setTipo(archivo.getContentType());
                evidencia.setArchivo(url);
                evidencia.setReporte(reporte);
                evidenciaRepository.save(evidencia);
            } catch (IOException e) {
                throw new RuntimeException("Error al guardar archivo: " + e.getMessage(), e);
            }
        }
    }

    // ================================
    // PRIORIDAD AUTOMÁTICA
    // ================================
    private Prioridad obtenerPrioridadPorTipo(String tipo) {
        if (tipo == null) return Prioridad.BAJA;

        return switch (tipo) {
            case "Accidente de tránsito",
                 "Semáforo dañado",
                 "Conducción peligrosa" -> Prioridad.ALTA;

            case "Vehículo mal estacionado",
                 "Invasión de carril" -> Prioridad.MEDIA;

            default -> Prioridad.BAJA;
        };
    }

    // ================================
    // CONVERTIR A DTO
    // ================================
    public ReporteSocketDTO convertirADTO(Reporte reporte) {
        ReporteSocketDTO dto = new ReporteSocketDTO();

        dto.setId(reporte.getId());
        dto.setTipoInfraccion(reporte.getTipoInfraccion());
        dto.setDescripcion(reporte.getDescripcion());
        dto.setDireccion(reporte.getDireccion());
        dto.setLatitud(reporte.getLatitud());
        dto.setLongitud(reporte.getLongitud());
        dto.setEstado(reporte.getEstado());
        dto.setPrioridad(reporte.getPrioridad() != null ? reporte.getPrioridad().name() : null);
        dto.setAcompanado(reporte.getAcompanado() != null ? reporte.getAcompanado() : false);
        dto.setResumenOperativo(reporte.getResumenOperativo());

        dto.setHoraIncidente(
            reporte.getHoraIncidente() != null
                ? reporte.getHoraIncidente().toString().substring(0, 5)
                : null
        );

        dto.setFechaIncidente(
            reporte.getFechaIncidente() != null
                ? reporte.getFechaIncidente().toString()
                : null
        );

        dto.setFechaAceptado(
            reporte.getFechaAceptado() != null
                ? reporte.getFechaAceptado().toString()
                : null
        );

        dto.setFechaFinalizado(
            reporte.getFechaFinalizado() != null
                ? reporte.getFechaFinalizado().toString()
                : null
        );

        dto.setFechaRechazado(
            reporte.getFechaRechazado() != null
                ? reporte.getFechaRechazado().toString()
                : null
        );

        // Agente principal
        if (reporte.getAgente() != null) {
            dto.setPlacaAgente(reporte.getAgente().getPlaca());
            dto.setNombreAgente(reporte.getAgente().getNombre());
        }

        // Agente compañero
        if (reporte.getAgenteCompanero() != null) {
            dto.setPlacaCompanero(reporte.getAgenteCompanero().getPlaca());
            dto.setNombreCompanero(reporte.getAgenteCompanero().getNombre());
        }

        // Primera evidencia
        if (reporte.getEvidencias() != null && !reporte.getEvidencias().isEmpty()) {
            dto.setUrlFoto(reporte.getEvidencias().get(0).getArchivo());
        }

        return dto;
    }

    // ================================
    // OBTENER PENDIENTES
    // ================================
    public List<Reporte> obtenerPendientes() {
        return reporteRepository.findByEstado("PENDIENTE");
    }

    // ================================
    // AGENTE TOMA REPORTE (SOLO)
    // ================================
    public Reporte tomarReporte(Long reporteId, String emailAgente) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte ya fue tomado");
        }

        // ✅ Buscar por email (no por placa)
        Agentes agente = agenteRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado"));

        reporte.setAgente(agente);
        reporte.setEstado("EN_PROCESO");
        reporte.setFechaAceptado(LocalDateTime.now());
        reporte.setAcompanado(false);

        // Poner agente en OCUPADO
        agente.setEstado("OCUPADO");
        agenteRepository.save(agente);

        Reporte actualizado = reporteRepository.save(reporte);

        // Notificar a todos por WebSocket
        messagingTemplate.convertAndSend("/topic/reportes", convertirADTO(actualizado));

        return actualizado;
    }

    // ================================
    // AGENTE TOMA REPORTE (ACOMPAÑADO)
    // ================================
    public Reporte tomarReporteConCompanero(Long reporteId, String emailAgente, String placaCompanero) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte ya fue tomado");
        }

        // Agente principal (por email del token)
        Agentes agente = agenteRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new RuntimeException("Agente principal no encontrado"));

        // Agente compañero (por placa)
        Agentes companero = agenteRepository.findByPlacaIgnoreCase(placaCompanero)
                .orElseThrow(() -> new RuntimeException("Agente compañero no encontrado con placa: " + placaCompanero));

        // Validar que el compañero esté libre
        if (!"LIBRE".equals(companero.getEstado())) {
            throw new RuntimeException("El agente compañero no está disponible (estado: " + companero.getEstado() + ")");
        }

        reporte.setAgente(agente);
        reporte.setAgenteCompanero(companero);
        reporte.setEstado("EN_PROCESO");
        reporte.setFechaAceptado(LocalDateTime.now());
        reporte.setAcompanado(true);

        // Poner ambos agentes en OCUPADO
        agente.setEstado("OCUPADO");
        companero.setEstado("OCUPADO");
        agenteRepository.save(agente);
        agenteRepository.save(companero);

        Reporte actualizado = reporteRepository.save(reporte);
        ReporteSocketDTO dto = convertirADTO(actualizado);

        // Notificar a todos por WebSocket (topic general)
        messagingTemplate.convertAndSend("/topic/reportes", dto);

        // ✅ Notificar al compañero por su topic personal para que le aparezca el reporte
        messagingTemplate.convertAndSend(
            "/topic/reporte-asignado/" + companero.getPlaca(),
            dto
        );

        return actualizado;
    }

    // ================================
    // RECHAZAR REPORTE
    // Se guarda en historial con estado RECHAZADO (sin resumen).
    // ================================
    public Reporte rechazarReporte(Long reporteId, String emailAgente) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("Solo se pueden rechazar reportes pendientes");
        }

        Agentes agente = agenteRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado"));

        reporte.setAgente(agente);
        reporte.setEstado("RECHAZADO");
        reporte.setFechaRechazado(LocalDateTime.now());
        reporte.setResumenOperativo(null);

        Reporte actualizado = reporteRepository.save(reporte);
        messagingTemplate.convertAndSend("/topic/reportes", convertirADTO(actualizado));

        return actualizado;
    }

    // ================================
    // FINALIZAR REPORTE
    // ================================
    public Reporte finalizarReporte(Long reporteId, String emailAgente, String resumen) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"EN_PROCESO".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte no está en proceso");
        }

        reporte.setEstado("FINALIZADO");
        reporte.setResumenOperativo(resumen);
        reporte.setFechaFinalizado(LocalDateTime.now());

        Reporte finalizado = reporteRepository.save(reporte);

        // ✅ Liberar al agente principal
        if (reporte.getAgente() != null) {
            Agentes agente = reporte.getAgente();
            agente.setEstado("LIBRE");
            agenteRepository.save(agente);
        }

        // ✅ Liberar también al compañero si había uno
        if (reporte.getAgenteCompanero() != null) {
            Agentes companero = reporte.getAgenteCompanero();
            companero.setEstado("LIBRE");
            agenteRepository.save(companero);
        }

        ReporteSocketDTO dto = convertirADTO(finalizado);

        // Notificar a todos
        messagingTemplate.convertAndSend("/topic/reportes", dto);

        // ✅ Notificar al compañero que el reporte finalizó
        if (reporte.getAgenteCompanero() != null) {
            messagingTemplate.convertAndSend(
                "/topic/reporte-asignado/" + reporte.getAgenteCompanero().getPlaca(),
                dto
            );
        }

        return finalizado;
    }

    // ================================
    // REPORTES ACTIVOS DEL AGENTE
    // (PENDIENTES GLOBALES + SUS EN_PROCESO)
    // ================================
    public List<ReporteSocketDTO> obtenerReportesDTOParaAgente(String emailAgente) {

        Agentes agente = agenteRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado"));

        String placa = agente.getPlaca();

        List<Reporte> pendientes = reporteRepository.findByEstado("PENDIENTE");

        // Reportes en proceso donde es agente principal O compañero
        List<Reporte> enProceso = reporteRepository
                .findEnProcesoParaAgente(placa);

        pendientes.addAll(enProceso);

        return pendientes.stream()
                .map(this::convertirADTO)
                .toList();
    }

    // ================================
    // HISTORIAL DEL AGENTE
    // (Reportes FINALIZADOS donde participó)
    // ================================
    public List<ReporteSocketDTO> obtenerHistorialAgente(String emailAgente) {

        Agentes agente = agenteRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado"));

        String placa = agente.getPlaca();

        List<Reporte> historial = reporteRepository.findHistorialParaAgente(placa);

        return historial.stream()
                .map(this::convertirADTO)
                .toList();
    }

    // ================================
    // BUSCAR AGENTE DISPONIBLE POR PLACA
    // ================================
    public AgenteDisponibleDTO buscarAgenteDisponible(String placa, String emailSolicitante) {

        Agentes agente = agenteRepository.findByPlacaIgnoreCase(placa)
                .orElseThrow(() -> new RuntimeException("No existe un agente con placa: " + placa));

        // No puede buscarse a sí mismo
        if (agente.getEmail().equalsIgnoreCase(emailSolicitante)) {
            throw new RuntimeException("No puedes seleccionarte a ti mismo como compañero");
        }

        return new AgenteDisponibleDTO(
            agente.getPlaca(),
            agente.getNombreCompleto(),
            agente.getEstado()
        );
    }

    // ================================
    // SCROLL PAGINADO (admin / general)
    // ================================
    public Page<Reporte> obtenerReportes(String prioridad, int page, int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (prioridad != null) {
            return reporteRepository.findByPrioridad(Prioridad.valueOf(prioridad.toUpperCase()), pageable);
        }

        return reporteRepository.findAll(pageable);
    }
}
