package com.reporteloya.backend.service;

import com.reporteloya.backend.entity.EmailVerificationToken;
import com.reporteloya.backend.entity.Role;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.dto.LoginRequest;
import com.reporteloya.backend.dto.RegisterRequest;
import com.reporteloya.backend.repository.EmailVerificationRepository;
import com.reporteloya.backend.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger logger = Logger.getLogger(AuthService.class.getName());

    private final UsuarioRepository usuarioRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${app.verification.url:http://localhost:4200/verificar-correo}")
    private String verificationUrl;

    private static final int TOKEN_EXPIRATION_MINUTES = 15;

    @Transactional
    public Map<String, Object> register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Error: El correo electrónico ya está registrado.");
        }

        Usuario nuevoUsuario = Usuario.builder()
                .tipoDocumento(request.getTipoDocumento())
                .numeroDocumento(request.getNumeroDocumento())
                .nombreCompleto(request.getNombreCompleto())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CIUDADANO)
                .emailVerificado(false)
                .build();

        try {
            usuarioRepository.save(nuevoUsuario);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Error: El correo electrónico ya está registrado.");
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expirationDate = LocalDateTime.now().plusMinutes(TOKEN_EXPIRATION_MINUTES);

        try {
            EmailVerificationToken verificationToken = new EmailVerificationToken(
                    request.getEmail(),
                    token,
                    expirationDate,
                    nuevoUsuario.getId()
            );
            emailVerificationRepository.save(verificationToken);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error al guardar token de verificación", e);
        }

        try {
            String enlaceVerificacion = verificationUrl + "?token=" + token;
            emailService.enviarCorreoVerificacion(request.getEmail(), enlaceVerificacion);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error al enviar correo de verificación, pero el usuario fue registrado correctamente", e);
        }

        return Map.of(
            "message", "Registro exitoso. Por favor, verifica tu correo electrónico.",
            "email", request.getEmail(),
            "success", true
        );
    }

    @Transactional
    public AuthResult verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailVerificationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token de verificación inválido."));

        if (verificationToken.isUsed()) {
            throw new IllegalArgumentException("El token ya ha sido utilizado.");
        }

        if (verificationToken.isExpired()) {
            throw new IllegalArgumentException("El token ha expirado.");
        }

        Usuario usuario = usuarioRepository.findById(verificationToken.getIdUsuario())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));

        usuario.setEmailVerificado(true);
        usuarioRepository.save(usuario);

        verificationToken.setUsed(true);
        emailVerificationRepository.save(verificationToken);

        String jwtToken = jwtService.generateTokenWithRole(usuario, usuario.getRole());

        return new AuthResult(jwtToken, usuario);
    }

    @Transactional
    public void resendVerification(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));

        if (usuario.isEmailVerificado()) {
            throw new IllegalArgumentException("El correo ya ha sido verificado.");
        }

        emailVerificationRepository.deleteByEmail(email);

        String token = UUID.randomUUID().toString();
        LocalDateTime expirationDate = LocalDateTime.now().plusMinutes(TOKEN_EXPIRATION_MINUTES);

        EmailVerificationToken verificationToken = new EmailVerificationToken(
                email,
                token,
                expirationDate,
                usuario.getId()
        );
        emailVerificationRepository.save(verificationToken);

        String enlaceVerificacion = verificationUrl + "?token=" + token;
        emailService.enviarCorreoVerificacion(email, enlaceVerificacion);
    }

    public AuthResult login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Usuario no encontrado con el correo: " + request.getEmail()
                        )
                );

        if (!usuario.isEmailVerificado()) {
            throw new BadCredentialsException("Debes verificar tu correo electrónico antes de iniciar sesión.");
        }

        String jwtToken = jwtService.generateTokenWithRole(usuario, usuario.getRole());

        return new AuthResult(jwtToken, usuario);
    }

    @Transactional
    public void deleteUnverifiedUsers() {
        LocalDateTime expirationDate = LocalDateTime.now();
        var expiredTokens = emailVerificationRepository.findAll().stream()
                .filter(t -> t.isExpired() && !t.isUsed())
                .toList();

        for (var token : expiredTokens) {
            usuarioRepository.deleteById(token.getIdUsuario());
            emailVerificationRepository.delete(token);
        }
    }
}
