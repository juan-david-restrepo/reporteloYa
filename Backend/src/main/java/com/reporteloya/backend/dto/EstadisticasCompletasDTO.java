package com.reporteloya.backend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EstadisticasCompletasDTO {
    
    private int totalPendientes;
    private int reportesHoy;
    private int reportesResueltos;
    private int reportesRechazados;
    private String fechaInicio;
    private String fechaFin;
    
    private List<EstadisticaGraficaDTO.StatItem> statsSemana;
    private List<EstadisticaGraficaDTO.StatItem> statsAnio;
    private List<EstadisticaGraficaDTO.StatItem> statsDia;
}
