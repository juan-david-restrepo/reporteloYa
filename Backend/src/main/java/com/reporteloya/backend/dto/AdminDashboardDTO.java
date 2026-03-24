package com.reporteloya.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminDashboardDTO {
    private int totalReportes;
    private int pendientes;
    private int enProceso;
    private int finalizados;
    private int rechazados;
    private int reportesHoy;
    private List<EstadisticaGraficaDTO.StatItem> estadisticasTipo;
    private List<EstadisticaGraficaDTO.StatItem> estadisticasMes;
    private List<EstadisticaGraficaDTO.StatItem> estadisticasSemana;
}
