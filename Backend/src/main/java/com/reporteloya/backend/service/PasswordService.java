package com.reporteloya.backend.service;

import com.reporteloya.backend.dto.ResetPasswordRequest;
import com.reporteloya.backend.entity.PasswordResetToken;
import com.reporteloya.backend.repository.TokenRepository;
import com.reporteloya.backend.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class PasswordService {

    private final UsuarioRepository usuarioRepository;
    private final TokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    // 🛡 Control de intentos por IP
    private final ConcurrentHashMap<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 5;

    /**
     * 🔐 Enviar enlace de recuperación
     * Respuesta genérica para evitar enumeración de emails.
     */
    @Transactional
    public void enviarEnlaceRecuperacion(String email, String ip) {

        // 🛡 Límite por IP para prevenir abuso
        requestCounts.putIfAbsent(ip, new AtomicInteger(0));
        if (requestCounts.get(ip).incrementAndGet() > MAX_REQUESTS) {
            return; // No hacemos nada y no revelamos información
        }

        // Buscar usuario por email
        usuarioRepository.findByEmail(email).ifPresent(usuario -> {

            try {
                // 🗑 Eliminar tokens previos de este email
                tokenRepository.deleteByEmail(email);

                // Generar nuevo token
                String tokenString = UUID.randomUUID().toString();

                PasswordResetToken resetToken = new PasswordResetToken();
                resetToken.setEmail(usuario.getEmail());
                resetToken.setToken(tokenString);
                resetToken.setExpirationDate(LocalDateTime.now().plusMinutes(15));
                resetToken.setUsed(false);

                // ✅ Asignar idUsuario obligatorio
                resetToken.setIdUsuario(usuario.getId());

                tokenRepository.save(resetToken);

                // Construir enlace y enviar correo
                String enlace = "http://localhost:4200/password?token=" + tokenString;
                emailService.enviarCorreoRecuperacion(email, enlace);

            } catch (Exception e) {
                // 🔴 Evitar que cualquier error rompa la respuesta
                System.err.println("Error al generar/enviar token: " + e.getMessage());
                // No propagamos la excepción para que Angular siempre reciba OK
            }
        });
    }

    /**
     * 🔐 Resetear contraseña usando token
     */
    @Transactional
    public boolean resetPassword(ResetPasswordRequest request) {

        // Validar seguridad de la contraseña antes de tocar la DB
        if (!esPasswordSegura(request.getNewPassword())) {
            return false;
        }

        return tokenRepository.findByToken(request.getToken()).map(tokenEntity -> {

            // Verificar si ya fue usado
            if (tokenEntity.isUsed()) return false;

            // Verificar expiración
            if (tokenEntity.isExpired()) {
                tokenRepository.delete(tokenEntity);
                return false;
            }

            // Buscar usuario y actualizar contraseña
            return usuarioRepository.findByEmail(tokenEntity.getEmail()).map(usuario -> {

                usuario.setPassword(passwordEncoder.encode(request.getNewPassword()));
                usuarioRepository.save(usuario);

                // Marcar token como usado
                tokenEntity.setUsed(true);
                tokenRepository.save(tokenEntity);

                return true;

            }).orElse(false);

        }).orElse(false);
    }

    /**
     * 🔐 Validación de contraseña fuerte:
     * - Min 8 caracteres
     * - Al menos 1 mayúscula
     * - Al menos 1 minúscula
     * - Al menos 1 número
     * - Al menos 1 caracter especial
     */
    private boolean esPasswordSegura(String password) {
        if (password == null) return false;

        return password.length() >= 8 &&
               password.matches(".*[A-Z].*") &&
               password.matches(".*[a-z].*") &&
               password.matches(".*\\d.*") &&
               password.matches(".*[@$!%*?&].*");
    }

    /**
     * 🧹 Limpieza automática de tokens expirados cada 10 minutos
     */
    @Scheduled(fixedRate = 600000)
    public void limpiarTokensExpirados() {
        tokenRepository.deleteByExpirationDateBefore(LocalDateTime.now());
    }
}