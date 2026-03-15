package com.reporteloya.backend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EstadisticaGraficaDTO {
    
    private List<StatItem> statsSemana;
    private List<StatItem> statsAnio;
    private List<StatItem> statsDia;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StatItem {
        private String label;
        private Integer valor;
    }
}
