package com.reporteloya.backend.dto;

public class EstadoAgenteDTO {

    private String placa;
    private String estado;

    public EstadoAgenteDTO(String placa, String estado) {
        this.placa = placa;
        this.estado = estado;
    }

    public String getPlaca() {
        return placa;
    }

    public String getEstado() {
        return estado;
    }
    
}
