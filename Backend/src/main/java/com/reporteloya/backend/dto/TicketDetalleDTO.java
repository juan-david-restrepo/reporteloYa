package com.reporteloya.backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TicketDetalleDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private String prioridad;
    private String estado;
    private String nombreUsuario;
    private Long usuarioId;
    private int cantidadMensajes;
    private String ultimoMensaje;
    private java.time.LocalDateTime fechaCreacion;
    private java.time.LocalDateTime fechaActualizacion;
    private List<MensajeSoporteDTO> mensajes;
}
