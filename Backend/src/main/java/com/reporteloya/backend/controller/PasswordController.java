package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.RecuperarRequest;
import com.reporteloya.backend.dto.ResetPasswordRequest;
import com.reporteloya.backend.service.PasswordService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/password")
@RequiredArgsConstructor
public class PasswordController {

    private final PasswordService passwordService;

    // 🔐 Solicitar recuperación
    @PostMapping("/reset-request")
    public ResponseEntity<String> enviarEnlace(
            @RequestBody RecuperarRequest request,
            HttpServletRequest httpRequest) {

        String ip = obtenerIpCliente(httpRequest);

        passwordService.enviarEnlaceRecuperacion(request.getEmail(), ip);

        // 🛡 Siempre misma respuesta (anti-enumeración)
        return ResponseEntity.ok(
                "Si el correo está registrado, recibirás un enlace de recuperación."
        );
    }

    // 🔐 Resetear contraseña
    @PostMapping("/reset")
    public ResponseEntity<String> resetPassword(
            @RequestBody ResetPasswordRequest request) {

        boolean actualizado = passwordService.resetPassword(request);

        if (actualizado) {
            return ResponseEntity.ok("Contraseña actualizada correctamente.");
        } else {
            return ResponseEntity.badRequest()
                    .body("El token es inválido, expirado o la contraseña no cumple los requisitos.");
        }
    }

    // 🛡 Obtener IP real (por si usas proxy, nginx, etc.)
    private String obtenerIpCliente(HttpServletRequest request) {

        String xfHeader = request.getHeader("X-Forwarded-For");

        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }

        return xfHeader.split(",")[0];
    }
}