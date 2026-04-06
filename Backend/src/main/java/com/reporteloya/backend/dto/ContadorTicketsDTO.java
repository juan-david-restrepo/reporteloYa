package com.reporteloya.backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ContadorTicketsDTO {
    private long abiertos;
    private long enProceso;
    private long cerrados;
}
