package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.AuthResponse;
import com.reporteloya.backend.dto.LoginRequest;
import com.reporteloya.backend.dto.RegisterRequest;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.entity.Role;
import com.reporteloya.backend.service.AuthResult;
import com.reporteloya.backend.service.AuthService;
import com.reporteloya.backend.service.ChatAISyncService;
import com.reporteloya.backend.service.JwtService;
import jakarta.servlet.http.Cookie;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final ChatAISyncService chatAISyncService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request,
                                      HttpServletResponse response) {
        try {
            Map<String, Object> result = authService.register(request);

            // 🔄 Sincronizar nuevo usuario con Chat AI
            if (result.containsKey("user")) {
                Map<String, Object> userData = (Map<String, Object>) result.get("user");
                Long userId = ((Number) userData.get("id")).longValue();
                String email = (String) userData.get("email");
                String nombreCompleto = (String) userData.get("nombreCompleto");
                
                chatAISyncService.syncUser(
                    userId,
                    email,
                    nombreCompleto,
                    "CIUDADANO",
                    (String) userData.get("tipoDocumento"),
                    (String) userData.get("numeroDocumento")
                );
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Error interno al registrar el usuario: " + e.getMessage());
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token, HttpServletResponse response) {
        try {
            AuthResult result = authService.verifyEmail(token);
            Usuario usuario = result.usuario();

            Role role = usuario.getRole();
            long maxAgeSeconds = jwtService.getExpirationSecondsByRole(role);
            setJwtCookie(response, result.token(), maxAgeSeconds);

            // 🔄 Sincronizar usuario con Chat AI tras verificar email
            chatAISyncService.syncUser(
                usuario.getId(),
                usuario.getEmail(),
                usuario.getNombreCompleto(),
                role.name(),
                usuario.getTipoDocumento(),
                usuario.getNumeroDocumento()
            );

            return ResponseEntity.ok(Map.of(
                    "message", "Correo electrónico verificado exitosamente.",
                    "verified", true,
                    "userId", usuario.getId(),
                    "email", usuario.getEmail(),
                    "role", role.name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", e.getMessage(),
                    "verified", false
            ));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body("El correo electrónico es requerido.");
            }
            authService.resendVerification(email);
            return ResponseEntity.ok(Map.of(
                    "message", "Correo de verificación enviado exitosamente."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request,
                                   HttpServletResponse response) {
        try {
            AuthResult result = authService.login(request);
            Usuario usuario = result.usuario();

            Role role = usuario.getRole();
            long maxAgeSeconds = jwtService.getExpirationSecondsByRole(role);
            setJwtCookie(response, result.token(), maxAgeSeconds);

            // 🔄 Sincronizar usuario con Chat AI
            chatAISyncService.syncUser(
                usuario.getId(),
                usuario.getEmail(),
                usuario.getNombreCompleto(),
                role.name(),
                usuario.getTipoDocumento(),
                usuario.getNumeroDocumento()
            );

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .userId(usuario.getId())
                            .email(usuario.getEmail())
                            .role(role)
                            .build()
            );

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error interno al procesar el login.");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {

        SecurityContextHolder.clearContext();

        ResponseCookie cookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = (Usuario) authentication.getPrincipal();

        // 🔄 Sincronizar usuario con Chat AI si no existe
        chatAISyncService.syncUser(
            usuario.getId(),
            usuario.getEmail(),
            usuario.getNombreCompleto(),
            usuario.getRole().name(),
            usuario.getTipoDocumento(),
            usuario.getNumeroDocumento()
        );

        return ResponseEntity.ok(
                AuthResponse.builder()
                        .userId(usuario.getId())
                        .email(usuario.getEmail())
                        .role(usuario.getRole())
                        .build()
        );
    }

    private void setJwtCookie(HttpServletResponse response, String token, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("jwt", token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();

        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}