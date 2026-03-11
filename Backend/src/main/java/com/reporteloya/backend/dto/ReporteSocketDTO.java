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
    private String urlFoto;
    private String fechaIncidente;
    private String horaIncidente;

    // ✅ NUEVO: datos del agente principal
    private String placaAgente;
    private String nombreAgente;

    // ✅ NUEVO: datos del compañero
    private Boolean acompanado;
    private String placaCompanero;
    private String nombreCompanero;

    // ✅ NUEVO: fechas de gestión
    private String fechaAceptado;
    private String fechaFinalizado;
    private String fechaRechazado;
    private String resumenOperativo;
}
