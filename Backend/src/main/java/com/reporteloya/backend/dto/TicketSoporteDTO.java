package com.reporteloya.backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TicketSoporteDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private String prioridad;
    private String estado;
    private String nombreUsuario;
    private Long usuarioId;
    private int cantidadMensajes;
    private String ultimoMensaje;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}
