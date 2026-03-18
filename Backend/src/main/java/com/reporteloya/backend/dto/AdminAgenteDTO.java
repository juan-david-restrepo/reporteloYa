package com.reporteloya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAgenteDTO {

    private Long id;
    private String placa;
    private String nombre;
    private String estado;
    private String telefono;
    private String documento;
    private String foto;
    private Double promedioResenas;
}

