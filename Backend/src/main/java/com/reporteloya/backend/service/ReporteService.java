package com.reporteloya.backend.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.reporteloya.backend.entity.Reporte;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.dto.ReporteSocketDTO;
import com.reporteloya.backend.dto.AgenteDisponibleDTO;
import com.reporteloya.backend.dto.EstadoAgenteDTO;
import com.reporteloya.backend.dto.EstadisticasDashboardDTO;
import com.reporteloya.backend.dto.EstadisticasCompletasDTO;
import com.reporteloya.backend.dto.AdminDashboardDTO;
import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Evidencia;
import com.reporteloya.backend.entity.Prioridad;
import com.reporteloya.backend.entity.EstadisticaAgente;
import com.reporteloya.backend.dto.EstadisticaGraficaDTO;
import com.reporteloya.backend.dto.ImageValidationResult;
import com.reporteloya.backend.repository.ReporteRepository;
import com.reporteloya.backend.repository.AgenteRepository;
import com.reporteloya.backend.repository.EvidenciaRepository;
import com.reporteloya.backend.repository.EstadisticaAgenteRepository;
import com.reporteloya.backend.dto.AdminDashboardDTO;






import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.io.IOException;


@Service
public class ReporteService {

    private final ImageValidationService imageValidationService;
    private final AgenteRepository agenteRepository;
    private final ReporteRepository reporteRepository;
    private final EvidenciaRepository evidenciaRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final EstadisticaAgenteRepository estadisticaAgenteRepository;
    private final NotificationService notificationService;

    public ReporteService(
            ReporteRepository reporteRepository,
            AgenteRepository agenteRepository,
            EvidenciaRepository evidenciaRepository,
            FileStorageService fileStorageService,
            ImageValidationService imageValidationService,
            SimpMessagingTemplate messagingTemplate,
            EstadisticaAgenteRepository estadisticaAgenteRepository,
            NotificationService notificationService) {

        this.reporteRepository = reporteRepository;
        this.agenteRepository = agenteRepository;
        this.evidenciaRepository = evidenciaRepository;
        this.fileStorageService = fileStorageService;
        this.imageValidationService = imageValidationService;
        this.messagingTemplate = messagingTemplate;
        this.estadisticaAgenteRepository = estadisticaAgenteRepository;
        this.notificationService = notificationService;
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
            List<MultipartFile> archivos,
            Usuario usuario) {

        if (archivos == null || archivos.isEmpty()) {
            throw new RuntimeException("Debe subir al menos una imagen");
        }

        boolean imagenValida = false;
        String placaDetectadaIA = null;
        String motivoRechazo = null;

        for (MultipartFile archivo : archivos) {
            if (archivo.getContentType() == null ||
                    !archivo.getContentType().startsWith("image")) {
                continue;
            }
            try {
                ImageValidationResult validationResult = imageValidationService.validarImagen(archivo, tipoInfraccion);
                if (validationResult.isValida()) {
                    imagenValida = true;
                    if (validationResult.getPlacaDetectada() != null && 
                        (placa == null || placa.isBlank())) {
                        placaDetectadaIA = validationResult.getPlacaDetectada();
                        System.out.println("PLACA DETECTADA POR IA: " + placaDetectadaIA);
                    }
                    break;
                } else {
                    motivoRechazo = validationResult.getMotivoRechazo();
                    System.out.println("Imagen rechazada: " + motivoRechazo);
                }
            } catch (Exception e) {
                throw new RuntimeException("Error validando imagen con IA: " + e.getMessage());
            }
        }

        if (!imagenValida) {
            throw new RuntimeException(motivoRechazo != null ? motivoRechazo : "La imagen no parece estar relacionada con tránsito");
        }

        Reporte reporte = new Reporte();
        reporte.setUsuario(usuario);
        reporte.setDescripcion(descripcion);
        reporte.setDireccion(direccion);
        reporte.setLatitud(latitud);
        reporte.setLongitud(longitud);
        reporte.setEstado("PENDIENTE");
        reporte.setAcompanado(false);
        reporte.setTipoInfraccion(tipoInfraccion);
        reporte.setPrioridad(obtenerPrioridadPorTipo(tipoInfraccion));

        // Usar placa del formulario, o la detectada por IA
        if (placa != null && !placa.isBlank()) {
            reporte.setPlaca(placa.trim().toUpperCase());
        } else if (placaDetectadaIA != null) {
            reporte.setPlaca(placaDetectadaIA);
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

        System.out.println("=== REPORTE CREADO ===");
        System.out.println("Reporte ID: " + guardado.getId());
        System.out.println("Usuario ID: " + (usuario != null ? usuario.getId() : "NULL"));
        System.out.println("======================");

        Reporte reporteCompleto = reporteRepository.findById(guardado.getId()).orElse(guardado);
        ReporteSocketDTO dto = convertirADTO(reporteCompleto);
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
            dto.setNombreAgente(reporte.getAgente().getNombreCompleto());
        }

        // Agente compañero
        if (reporte.getAgenteCompanero() != null) {
            dto.setPlacaCompanero(reporte.getAgenteCompanero().getPlaca());
            dto.setNombreCompanero(reporte.getAgenteCompanero().getNombreCompleto());
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
    public Reporte tomarReporte(Long reporteId, String emailAgente, Long userId) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte ya fue tomado");
        }

        System.out.println("=== TOMAR REPORTE SERVICE ===");
        System.out.println("Email: " + emailAgente);
        System.out.println("User ID: " + userId);
        
        // Buscar por ID (más confiable con herencia JPA)
        Agentes agentePorId = agenteRepository.findById(userId).orElse(null);
        // También buscar por email para comparar (temporal, para debugging)
        Agentes agentePorEmail = agenteRepository.findByEmail(emailAgente).orElse(null);
        
        System.out.println("Agente por ID: " + (agentePorId != null ? agentePorId.getNombre() + " (placa: " + agentePorId.getPlaca() + ")" : "NULL"));
        System.out.println("Agente por Email: " + (agentePorEmail != null ? agentePorEmail.getNombre() + " (placa: " + agentePorEmail.getPlaca() + ")" : "NULL"));
        System.out.println("==============================");

        // Usar el agente encontrado por ID (más confiable)
        Agentes agente = agentePorId;
        
        if (agente == null) {
            throw new RuntimeException("Agente no encontrado con ID: " + userId);
        }

        reporte.setAgente(agente);
        reporte.setEstado("EN_PROCESO");
        reporte.setFechaAceptado(LocalDateTime.now());
        reporte.setAcompanado(false);

        // Poner agente en OCUPADO
        agente.setEstado("OCUPADO");
        agenteRepository.save(agente);
        messagingTemplate.convertAndSend("/topic/estado-agentes", 
            new EstadoAgenteDTO(agente.getPlaca(), "OCUPADO"));

        Reporte actualizado = reporteRepository.save(reporte);

        System.out.println("=== ANTES DE NOTIFICAR ===");
        System.out.println("Reporte actualizado ID: " + actualizado.getId());
        System.out.println("Reporte usuario: " + (actualizado.getUsuario() != null ? actualizado.getUsuario().getId() : "NULL"));
        
        // Notificar al ciudadano que su reporte fue aceptado
        notificationService.notifyReporteAceptado(actualizado, agente);

        // Notificar a todos por WebSocket
        messagingTemplate.convertAndSend("/topic/reportes", convertirADTO(actualizado));

        return actualizado;
    }

    // ================================
    // AGENTE TOMA REPORTE (ACOMPAÑADO)
    // ================================
    public Reporte tomarReporteConCompanero(Long reporteId, String emailAgente, String placaCompanero, Long userId) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte ya fue tomado");
        }

        System.out.println("=== TOMAR REPORTE ACOMPAÑADO SERVICE ===");
        System.out.println("Email: " + emailAgente);
        System.out.println("User ID: " + userId);
        System.out.println("Placa Compañero: " + placaCompanero);
        
        // Agente principal (por ID, más confiable)
        Agentes agente = agenteRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Agente principal no encontrado con ID: " + userId));
        System.out.println("Agente principal: " + agente.getNombre() + " (placa: " + agente.getPlaca() + ")");

        // Agente compañero (por placa)
        Agentes companero = agenteRepository.findByPlacaIgnoreCase(placaCompanero)
                .orElseThrow(() -> new RuntimeException("Agente compañero no encontrado con placa: " + placaCompanero));
        System.out.println("Agente compañero: " + companero.getNombre() + " (placa: " + companero.getPlaca() + ")");
        System.out.println("=======================================");

        // Validar que el compañero esté libre (case-insensitive)
        if (companero.getEstado() == null || !"DISPONIBLE".equalsIgnoreCase(companero.getEstado())) {
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
        
        messagingTemplate.convertAndSend("/topic/estado-agentes", 
            new EstadoAgenteDTO(agente.getPlaca(), "OCUPADO"));
        messagingTemplate.convertAndSend("/topic/estado-agentes", 
            new EstadoAgenteDTO(companero.getPlaca(), "OCUPADO"));

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
    public Reporte rechazarReporte(Long reporteId, String emailAgente, Long userId) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("Solo se pueden rechazar reportes pendientes");
        }

        Agentes agente = agenteRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado con ID: " + userId));

        reporte.setAgente(agente);
        reporte.setEstado("RECHAZADO");
        reporte.setFechaRechazado(LocalDateTime.now());
        reporte.setResumenOperativo(null);

        Reporte actualizado = reporteRepository.save(reporte);

        // Notificar al ciudadano que su reporte fue rechazado
        notificationService.notifyReporteRechazado(actualizado, agente);

        // Guardar estadísticas de rechazo
        guardarEstadisticasReporte(actualizado);

        messagingTemplate.convertAndSend("/topic/reportes", convertirADTO(actualizado));

        return actualizado;
    }

    // ================================
    // FINALIZAR REPORTE
    // ================================
    public Reporte finalizarReporte(Long reporteId, String emailAgente, String resumen, Long userId) {

        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));

        if (!"EN_PROCESO".equals(reporte.getEstado())) {
            throw new RuntimeException("El reporte no está en proceso");
        }

        System.out.println("=== FINALIZAR REPORTE SERVICE ===");
        System.out.println("Reporte ID: " + reporteId);
        System.out.println("Email: " + emailAgente);
        System.out.println("User ID: " + userId);
        System.out.println("================================");

        reporte.setEstado("FINALIZADO");
        reporte.setResumenOperativo(resumen);
        reporte.setFechaFinalizado(LocalDateTime.now());

        Reporte finalizado = reporteRepository.save(reporte);

        // Guardar estadísticas para las gráficas
        guardarEstadisticasReporte(finalizado);

        // ✅ Liberar al agente principal
        if (reporte.getAgente() != null) {
            Agentes agente = reporte.getAgente();
            agente.setEstado("DISPONIBLE");
            agenteRepository.save(agente);
            messagingTemplate.convertAndSend("/topic/estado-agentes", 
                new EstadoAgenteDTO(agente.getPlaca(), "DISPONIBLE"));
        }

        // ✅ Liberar también al compañero si había uno
        if (reporte.getAgenteCompanero() != null) {
            Agentes companero = reporte.getAgenteCompanero();
            companero.setEstado("DISPONIBLE");
            agenteRepository.save(companero);
            messagingTemplate.convertAndSend("/topic/estado-agentes", 
                new EstadoAgenteDTO(companero.getPlaca(), "DISPONIBLE"));
        }

        ReporteSocketDTO dto = convertirADTO(finalizado);

        // Notificar al ciudadano que su reporte fue finalizado
        notificationService.notifyReporteFinalizado(finalizado);

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
    public List<ReporteSocketDTO> obtenerReportesDTOParaAgente(String emailAgente, Long userId) {

        Agentes agente = agenteRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado con ID: " + userId));

        String placa = agente.getPlaca();
        
        System.out.println("=== OBTENER REPORTES AGENTE ===");
        System.out.println("Email: " + emailAgente);
        System.out.println("User ID: " + userId);
        System.out.println("Agente: " + agente.getNombre() + " (placa: " + placa + ")");
        System.out.println("==============================");

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
    public List<ReporteSocketDTO> obtenerHistorialAgente(String emailAgente, Long userId) {

        Agentes agente = agenteRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado con ID: " + userId));

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
            agente.getEstado() != null ? agente.getEstado().toUpperCase() : "DISPONIBLE"
        );
    }

    // ================================
    // HISTORIAL DE REPORTES PARA ADMIN (por placa)
    // ================================
    public List<ReporteSocketDTO> obtenerHistorialParaAdmin(String placa) {
        List<Reporte> historial = reporteRepository.findHistorialParaAgente(placa);
        return historial.stream()
                .map(this::convertirADTO)
                .toList();
    }

    // ================================
    // SCROLL PAGINADO (admin / general)
    // Solo devuelve PENDIENTES para agentes
    // ================================
    public Page<Reporte> obtenerReportes(String prioridad, int page, int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (prioridad != null && !prioridad.isEmpty()) {
            return reporteRepository.findByPrioridad(Prioridad.valueOf(prioridad.toUpperCase()), pageable);
        }

        return reporteRepository.findByEstado("PENDIENTE", pageable);
    }

    // ================================
    // OBTENER TODOS LOS REPORTES (para dashboard admin)
    // ================================
    public Page<Reporte> obtenerTodosLosReportes(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reporteRepository.findAll(pageable);
    }

    public Page<ReporteSocketDTO> obtenerTodosLosReportesDTO(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Reporte> reportesPage = reporteRepository.findAll(pageable);
        return reportesPage.map(this::convertirADTO);
    }
 
    // ================================
    // ESTADÍSTICAS PARA DASHBOARD DEL AGENTE
    // ================================
    public EstadisticasDashboardDTO obtenerEstadisticasDashboard(String fechaInicio, String fechaFin) {
        
        LocalDateTime inicio;
        LocalDateTime fin;
        
        // Si no hay fechas, usar el día de hoy por defecto
        if (fechaInicio == null || fechaInicio.isEmpty() || fechaFin == null || fechaFin.isEmpty()) {
            LocalDate hoy = LocalDate.now();
            inicio = hoy.atStartOfDay();    
            fin = hoy.plusDays(1).atStartOfDay().minusSeconds(1);
        } else {
            inicio = LocalDate.parse(fechaInicio).atStartOfDay();
            fin = LocalDate.parse(fechaFin).plusDays(1).atStartOfDay().minusSeconds(1);
        }

        // Contar pendientes (todos los reportes en estado PENDIENTE)
        int totalPendientes = reporteRepository.countByEstado("PENDIENTE");

        // Contar reportes de hoy (creados entre inicio y fin del día)
        LocalDate hoy = LocalDate.now();
        LocalDateTime inicioDia = hoy.atStartOfDay();
        LocalDateTime finDia = hoy.plusDays(1).atStartOfDay().minusSeconds(1);
        int reportesHoy = reporteRepository.countReportesCreadosEntre(inicioDia, finDia);

        // Contar resueltos en el rango de fechas
        int reportesResueltos = reporteRepository.countFinalizadosEntre(inicio, fin);

        // Contar rechazados en el rango de fechas
        int reportesRechazados = reporteRepository.countRechazadosEntre(inicio, fin);

        return new EstadisticasDashboardDTO(
            totalPendientes,
            reportesHoy,
            reportesResueltos,
            reportesRechazados,
            fechaInicio != null ? fechaInicio : LocalDate.now().toString(),
            fechaFin != null ? fechaFin : LocalDate.now().toString()
        );
    }

    // ================================
    // GUARDAR ESTADÍSTICAS AL FINALIZAR REPORTE
    // ================================
    public void guardarEstadisticasReporte(Reporte reporte) {
        String tipo = "FINALIZADO";
        LocalDateTime fecha = reporte.getFechaFinalizado();
        if (fecha == null) {
            fecha = reporte.getFechaRechazado();
            tipo = "RECHAZADO";
        }
        if (fecha == null) return;

        int anio = fecha.getYear();
        int mes = fecha.getMonthValue();
        int diaSemana = fecha.getDayOfWeek().getValue();
        int hora = fecha.getHour();

        // Guardar estadísticas para el agente principal
        if (reporte.getAgente() != null) {
            String placa = reporte.getAgente().getPlaca();
            guardarStat(placa, "SEMANA", getEtiquetaDiaSemana(diaSemana), anio, mes, diaSemana, null, tipo);
            guardarStat(placa, "ANIO", getEtiquetaMes(mes), anio, mes, null, null, tipo);
            guardarStat(placa, "DIA", getEtiquetaFranjaHoraria(hora), anio, mes, diaSemana, hora, tipo);
        }

        // Guardar estadísticas para el agente compañero si existe (solo para FINALIZADO)
        if (reporte.getAgenteCompanero() != null && "FINALIZADO".equals(tipo)) {
            String placaCompanero = reporte.getAgenteCompanero().getPlaca();
            guardarStat(placaCompanero, "SEMANA", getEtiquetaDiaSemana(diaSemana), anio, mes, diaSemana, null, tipo);
            guardarStat(placaCompanero, "ANIO", getEtiquetaMes(mes), anio, mes, null, null, tipo);
            guardarStat(placaCompanero, "DIA", getEtiquetaFranjaHoraria(hora), anio, mes, diaSemana, hora, tipo);
        }
    }

    private void guardarStat(String placa, String periodo, String etiqueta, Integer anio, Integer mes, Integer diaSemana, Integer hora, String tipo) {
        Agentes agente = agenteRepository.findByPlacaIgnoreCase(placa).orElse(null);
        if (agente == null) return;

        EstadisticaAgente stat = new EstadisticaAgente();
        stat.setAgente(agente);
        stat.setPeriodo(periodo);
        stat.setEtiqueta(etiqueta);
        stat.setCantidad(1);
        stat.setAnio(anio);
        stat.setMes(mes);
        stat.setDiaSemana(diaSemana);
        stat.setHoraDia(hora);
        stat.setTipo(tipo);

        estadisticaAgenteRepository.save(stat);
    }

    private String getEtiquetaDiaSemana(int diaSemana) {
        return switch (diaSemana) {
            case 1 -> "Lun";
            case 2 -> "Mar";
            case 3 -> "Mie";
            case 4 -> "Jue";
            case 5 -> "Vie";
            case 6 -> "Sab";
            case 7 -> "Dom";
            default -> "";
        };
    }

    private String getEtiquetaMes(int mes) {
        return switch (mes) {
            case 1 -> "Ene";
            case 2 -> "Feb";
            case 3 -> "Mar";
            case 4 -> "Abr";
            case 5 -> "May";
            case 6 -> "Jun";
            case 7 -> "Jul";
            case 8 -> "Ago";
            case 9 -> "Sep";
            case 10 -> "Oct";
            case 11 -> "Nov";
            case 12 -> "Dic";
            default -> "";
        };
    }

    private String getEtiquetaFranjaHoraria(int hora) {
        if (hora >= 0 && hora < 6) return "00-06";
        if (hora >= 6 && hora < 12) return "06-12";
        if (hora >= 12 && hora < 18) return "12-18";
        return "18-24";
    }

    // ================================
    // OBTENER ESTADÍSTICAS COMPLETAS (TARJETAS + GRÁFICAS)
    // ================================
    public EstadisticasCompletasDTO obtenerEstadisticasCompletas(String emailAgente, Long userId, String fechaInicio, String fechaFin) {
        Agentes agente = agenteRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Agente no encontrado con ID: " + userId));

        String placa = agente.getPlaca();

        // Obtener reportes pendientes (global)
        int totalPendientes = reporteRepository.countByEstado("PENDIENTE");

        // Determinar rango de fechas para filtrar
        LocalDate fechaIni = (fechaInicio != null && !fechaInicio.isBlank()) 
            ? LocalDate.parse(fechaInicio) 
            : LocalDate.now();
        LocalDate fechaF = (fechaFin != null && !fechaFin.isBlank()) 
            ? LocalDate.parse(fechaFin) 
            : LocalDate.now();
        
        LocalDateTime fechaInicioDateTime = fechaIni.atStartOfDay();
        LocalDateTime fechaFinDateTime = fechaF.plusDays(1).atStartOfDay().minusSeconds(1);

        // Contar reportes en el rango de fechas seleccionado (para filtros)
        int reportesEnRango = reporteRepository.countReportesCreadosEntre(fechaInicioDateTime, fechaFinDateTime);

        // Obtener resueltos y rechazados en el rango de fechas seleccionado
        int reportesResueltos = reporteRepository.countByAgentePlacaAndEstadoAndFechaFinalizadoBetween(
            placa, "FINALIZADO", fechaInicioDateTime, fechaFinDateTime);
        int reportesRechazados = reporteRepository.countByAgentePlacaAndEstadoAndFechaRechazadoBetween(
            placa, "RECHAZADO", fechaInicioDateTime, fechaFinDateTime);

        // Obtener estadísticas de gráficas filtradas por rango de fechas
        List<EstadisticaGraficaDTO.StatItem> statsSemana = obtenerStatsDesdeBDPorFechas(
            placa, "SEMANA", 
            new String[]{"Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"},
            fechaInicioDateTime, fechaFinDateTime);
        List<EstadisticaGraficaDTO.StatItem> statsAnio = obtenerStatsDesdeBDPorFechas(
            placa, "ANIO",
            new String[]{"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"},
            fechaInicioDateTime, fechaFinDateTime);
        List<EstadisticaGraficaDTO.StatItem> statsDia = obtenerStatsDesdeBDPorFechas(
            placa, "DIA",
            new String[]{"00-06", "06-12", "12-18", "18-24"},
            fechaInicioDateTime, fechaFinDateTime);

        return new EstadisticasCompletasDTO(
            totalPendientes,
            reportesEnRango,
            reportesResueltos,
            reportesRechazados,
            fechaIni.toString(),
            fechaF.toString(),
            statsSemana,
            statsAnio,
            statsDia
        );
    }

    // ================================
    // ESTADÍSTICAS GLOBALES PARA ADMIN
    // ================================
    public AdminDashboardDTO obtenerEstadisticasAdmin() {
        LocalDate hoy = LocalDate.now();
        LocalDateTime inicioDia = hoy.atStartOfDay();
        LocalDateTime finDia = hoy.plusDays(1).atStartOfDay().minusSeconds(1);
        
        int totalReportes = (int) reporteRepository.count();
        int pendientes = reporteRepository.countByEstado("PENDIENTE");
        int enProceso = reporteRepository.countByEstado("EN_PROCESO");
        int finalizados = reporteRepository.countByEstado("FINALIZADO");
        int rechazados = reporteRepository.countByEstado("RECHAZADO");
        int reportesHoy = reporteRepository.countReportesCreadosEntre(inicioDia, finDia);

        List<EstadisticaGraficaDTO.StatItem> statsSemana = obtenerStatsGlobales("SEMANA", 
            new String[]{"Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"});
        List<EstadisticaGraficaDTO.StatItem> statsMes = obtenerStatsGlobales("ANIO", 
            new String[]{"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"});
        
        AdminDashboardDTO dto = new AdminDashboardDTO();
        dto.setTotalReportes(totalReportes);
        dto.setPendientes(pendientes);
        dto.setEnProceso(enProceso);
        dto.setFinalizados(finalizados);
        dto.setRechazados(rechazados);
        dto.setReportesHoy(reportesHoy);
        dto.setEstadisticasSemana(statsSemana);
        dto.setEstadisticasMes(statsMes);
        
        return dto;
    }

    private List<EstadisticaGraficaDTO.StatItem> obtenerStatsGlobales(String periodo, String[] etiquetasDefault) {
        List<EstadisticaAgente> statsBD = estadisticaAgenteRepository.buscarPorPeriodo(periodo);

        Map<String, Integer> mapa = new HashMap<>();
        for (EstadisticaAgente stat : statsBD) {
            String key = stat.getEtiqueta();
            mapa.put(key, mapa.getOrDefault(key, 0) + stat.getCantidad());
        }

        List<EstadisticaGraficaDTO.StatItem> result = new ArrayList<>();
        for (String etiqueta : etiquetasDefault) {
            result.add(new EstadisticaGraficaDTO.StatItem(etiqueta, mapa.getOrDefault(etiqueta, 0)));
        }
        return result;
    }

    private List<EstadisticaGraficaDTO.StatItem> obtenerStatsDesdeBDPorFechas(String placa, String periodo, String[] etiquetasDefault, LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        List<EstadisticaAgente> statsBD = estadisticaAgenteRepository.buscarPorPlacaPeriodoYFechaBetween(placa, periodo, fechaInicio, fechaFin);

        Map<String, Integer> mapa = new HashMap<>();
        for (EstadisticaAgente stat : statsBD) {
            String key = stat.getEtiqueta();
            mapa.put(key, mapa.getOrDefault(key, 0) + stat.getCantidad());
        }

        List<EstadisticaGraficaDTO.StatItem> result = new ArrayList<>();
        for (String etiqueta : etiquetasDefault) {
            result.add(new EstadisticaGraficaDTO.StatItem(etiqueta, mapa.getOrDefault(etiqueta, 0)));
        }
        return result;
    }

    private List<EstadisticaGraficaDTO.StatItem> obtenerStatsDesdeBD(String placa, String periodo, String[] etiquetasDefault) {
        List<EstadisticaAgente> statsBD = estadisticaAgenteRepository.buscarPorPlacaYPeriodo(placa, periodo);

        Map<String, Integer> mapa = new HashMap<>();
        for (EstadisticaAgente stat : statsBD) {
            String key = stat.getEtiqueta();
            mapa.put(key, mapa.getOrDefault(key, 0) + stat.getCantidad());
        }

        List<EstadisticaGraficaDTO.StatItem> result = new ArrayList<>();
        for (String etiqueta : etiquetasDefault) {
            result.add(new EstadisticaGraficaDTO.StatItem(etiqueta, mapa.getOrDefault(etiqueta, 0)));
        }
        return result;
    }


    public void eliminarReporte(Long reporteId, Long usuarioId) {
        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));
        
        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("Solo puede eliminar reportes pendientes");
        }
        
        if (reporte.getUsuario() == null || !reporte.getUsuario().getId().equals(usuarioId)) {
            throw new RuntimeException("No tiene permiso para eliminar este reporte");
        }
        
        reporteRepository.delete(reporte);
    }


    public List<Reporte> obtenerReportesPorUsuario(Long usuarioId) {
        return reporteRepository.findByUsuario_IdOrderByCreatedAtDesc(usuarioId);
    }



    public Reporte actualizarReporte(Long reporteId, Long usuarioId, String descripcion, String direccion, 
            Double latitud, Double longitud, String placa, String fechaIncidente, String horaIncidente,
            String tipoInfraccion) {
        Reporte reporte = reporteRepository.findById(reporteId)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));
        
        if (!"PENDIENTE".equals(reporte.getEstado())) {
            throw new RuntimeException("Solo puede editar reportes pendientes");
        }
        
        if (reporte.getUsuario() == null || !reporte.getUsuario().getId().equals(usuarioId)) {
            throw new RuntimeException("No tiene permiso para editar este reporte");
        }
        
        if (descripcion != null) reporte.setDescripcion(descripcion);
        if (direccion != null) reporte.setDireccion(direccion);
        if (latitud != null) reporte.setLatitud(latitud);
        if (longitud != null) reporte.setLongitud(longitud);
        if (placa != null) reporte.setPlaca(placa.trim().toUpperCase());
        if (tipoInfraccion != null) reporte.setTipoInfraccion(tipoInfraccion);
        
        if (fechaIncidente != null && !fechaIncidente.isBlank()) {
            try {
                reporte.setFechaIncidente(LocalDate.parse(fechaIncidente.trim()));
            } catch (Exception e) {
                throw new RuntimeException("Formato de fecha inválido");
            }
        }
        
        if (horaIncidente != null && !horaIncidente.isBlank()) {
            try {
                reporte.setHoraIncidente(LocalTime.parse(horaIncidente.trim().substring(0,5)));
            } catch (Exception e) {
                throw new RuntimeException("Formato de hora inválido");
            }
        }
        
        return reporteRepository.save(reporte);
    }

    public ReporteReportesDTO obtenerEstadisticas(Long usuarioId) {
        int total = reporteRepository.countByUsuarioId(usuarioId);
        int pendientes = reporteRepository.countByUsuarioIdAndEstado(usuarioId, "PENDIENTE");
        int enProceso = reporteRepository.countByUsuarioIdAndEstado(usuarioId, "EN_PROCESO");
        int finalizados = reporteRepository.countByUsuarioIdAndEstado(usuarioId, "FINALIZADO");
        
        return new ReporteReportesDTO(total, pendientes, enProceso, finalizados);
    }

        // DTO for statistics
    public static class ReporteReportesDTO {
        private int total;
        private int pendientes;
        private int enProceso;
        private int finalizados;

        public ReporteReportesDTO(int total, int pendientes, int enProceso, int finalizados) {
            this.total = total;
            this.pendientes = pendientes;
            this.enProceso = enProceso;
            this.finalizados = finalizados;
        }

        public int getTotal() { return total; }
        public int getPendientes() { return pendientes; }
        public int getEnProceso() { return enProceso; }
        public int getFinalizados() { return finalizados; }
    }


}

