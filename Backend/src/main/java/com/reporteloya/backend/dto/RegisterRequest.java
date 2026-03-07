package com.reporteloya.backend.dto;

import com.reporteloya.backend.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    private String tipoDocumento;
    private String numeroDocumento;
    private String nombreCompleto;

    private String email;
    private String password;
    private Role role;
}
