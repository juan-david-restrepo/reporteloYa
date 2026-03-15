package com.reporteloya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EstadisticasDashboardDTO {
    // Total de reportes pendientes (global)
    private int totalPendientes;
    
    // Total de reportes que llegaron en el día de hoy
    private int reportesHoy;
    
    // Total de reportes resueltos (finalizados) en el rango de fechas
    private int reportesResueltos;
    
    // Total de reportes rechazados en el rango de fechas
    private int reportesRechazados;
    
    // Rango de fechas usado para las estadísticas
    private String fechaInicio;
    private String fechaFin;
}
