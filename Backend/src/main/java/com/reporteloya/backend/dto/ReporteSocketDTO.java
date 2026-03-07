package com.reporteloya.backend.dto;

import lombok.Data;

@Data
public class ReporteSocketDTO {

    private Long id;
    private String tipoInfraccion;
    private String descripcion;
    private String direccion;
    private Double latitud;
    private Double longitud;
    private String estado;
    private String prioridad;
    private String urlFoto; // solo una evidencia (la primera)
    private String fechaIncidente;
    private String horaIncidente;
}
