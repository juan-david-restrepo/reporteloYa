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
public class MensajeSoporteDTO {
    private Long id;
    private Long ticketId;
    private String emisorNombre;
    private String contenido;
    private Boolean esAdmin;
    private Boolean leido;
    private LocalDateTime fechaEnvio;
}
