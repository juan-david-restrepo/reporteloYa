package com.reporteloya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgenteDisponibleDTO {
    private String placa;
    private String nombre;
    private String estado;
}
