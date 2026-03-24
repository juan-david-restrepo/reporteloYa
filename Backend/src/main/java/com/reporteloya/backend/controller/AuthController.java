package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.AuthResponse;
import com.reporteloya.backend.dto.LoginRequest;
import com.reporteloya.backend.dto.RegisterRequest;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.service.AuthResult;
import com.reporteloya.backend.service.AuthService;
import jakarta.servlet.http.Cookie;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // =========================
    // REGISTER
    // =========================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request,
                                      HttpServletResponse response) {
        try {
            AuthResult result = authService.register(request);
            Usuario usuario = result.usuario();

            // Solo cookie, sin header
            setJwtCookie(response, result.token());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(
                            AuthResponse.builder()
                                    .userId(usuario.getId())
                                    .email(usuario.getEmail())
                                    .role(usuario.getRole())
                                    .build()
                    );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error interno al registrar el usuario.");
        }
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request,
                                   HttpServletResponse response) {
        try {
            AuthResult result = authService.login(request);
            Usuario usuario = result.usuario();

            // Solo cookie HttpOnly
            setJwtCookie(response, result.token());

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .userId(usuario.getId())
                            .email(usuario.getEmail())
                            .role(usuario.getRole())
                            .build()
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error interno al procesar el login.");
        }
    }

    // =========================
    // LOGOUT
    // =========================
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {

        SecurityContextHolder.clearContext();

        ResponseCookie cookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(true) // true en producción
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }


            // =========================
        // GET CURRENT USER
        // =========================
        @GetMapping("/me")
        public ResponseEntity<?> getCurrentUser() {
            var authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Usuario usuario = (Usuario) authentication.getPrincipal();

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .userId(usuario.getId())
                            .email(usuario.getEmail())
                            .role(usuario.getRole())
                            .build()
            );
        }

    // =========================
    // COOKIE HELPER
    // =========================
    private void setJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("jwt", token)
                .httpOnly(true)
                .secure(true) // true en producción con HTTPS
                .path("/")
                .maxAge(20 * 60) // 20 minutos
                .sameSite("Lax")
                .build();

        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}