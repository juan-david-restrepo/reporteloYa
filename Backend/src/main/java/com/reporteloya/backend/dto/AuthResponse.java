package com.reporteloya.backend.dto;

import com.reporteloya.backend.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Respuesta que se envía al cliente tras un login/registro exitoso
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    // Token JWT para el acceso a recursos protegidos
    // private String token;

    // Datos del usuario
    private Long userId;
    private String email;
    private Role role;

    // Tipo de token
    @Builder.Default
    private String tokenType = "Bearer";
}
