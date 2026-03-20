package com.reporteloya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TareaSocketDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private String resumenOperativo;
    private String fecha;
    private String hora;
    private String prioridad;
    private String estado;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
    private String placaAgente;
}
