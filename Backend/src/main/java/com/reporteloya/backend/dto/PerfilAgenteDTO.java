package com.reporteloya.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerfilAgenteDTO {

    private String nombreCompleto;
    private String numeroDocumento;
    private String email;
    private String placa;
    private String telefono;
    private String estado;
    private String foto;
    private String resumenProfesional1;
    private String resumenProfesional2;
    private String resumenProfesional3;
    private String resumenProfesional4;
}
