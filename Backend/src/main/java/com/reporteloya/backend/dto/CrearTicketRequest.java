package com.reporteloya.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CrearTicketRequest {
    private String titulo;
    private String descripcion;
    private String prioridad;
}
