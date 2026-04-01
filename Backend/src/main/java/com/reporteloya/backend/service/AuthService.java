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
        validarRegistro(request);

        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El correo electrónico ya está registrado.");
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
        String email = request.getEmail();
        
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("El correo electrónico es requerido.");
        }
        
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es requerida.");
        }
        
        if (!isValidEmailFormat(email)) {
            throw new IllegalArgumentException("El formato del correo electrónico no es válido.");
        }
        
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        
        if (usuario == null) {
            throw new BadCredentialsException("No existe una cuenta registrada con este correo electrónico.");
        }
        
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.getPassword()
                    )
            );
        } catch (Exception e) {
            throw new BadCredentialsException("La contraseña es incorrecta.");
        }

        if (!usuario.isEmailVerificado() && usuario.getRole() == Role.CIUDADANO) {
            throw new BadCredentialsException("Debes verificar tu correo electrónico antes de iniciar sesión.");
        }

        String jwtToken = jwtService.generateTokenWithRole(usuario, usuario.getRole());

        return new AuthResult(jwtToken, usuario);
    }
    
    private boolean isValidEmailFormat(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email.matches(emailRegex);
    }

    private void validarRegistro(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("El correo electrónico es requerido.");
        }

        if (!isValidEmailFormat(request.getEmail())) {
            throw new IllegalArgumentException("El formato del correo electrónico no es válido.");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es requerida.");
        }

        if (!isValidPassword(request.getPassword())) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&).");
        }

        if (request.getNombreCompleto() == null || request.getNombreCompleto().isBlank()) {
            throw new IllegalArgumentException("El nombre completo es requerido.");
        }

        if (request.getNombreCompleto().length() > 60) {
            throw new IllegalArgumentException("El nombre no puede exceder 60 caracteres.");
        }

        if (!request.getNombreCompleto().matches("^[a-zA-ZÀ-ÿ\\s]+$")) {
            throw new IllegalArgumentException("El nombre solo puede contener letras y espacios.");
        }

        if (request.getTipoDocumento() == null || request.getTipoDocumento().isBlank()) {
            throw new IllegalArgumentException("El tipo de documento es requerido.");
        }

        String tipoDoc = request.getTipoDocumento().toUpperCase();
        if (!tipoDoc.equals("CC") && !tipoDoc.equals("PASAPORTE")) {
            throw new IllegalArgumentException("El tipo de documento debe ser CC o PASAPORTE.");
        }

        if (request.getNumeroDocumento() == null || request.getNumeroDocumento().isBlank()) {
            throw new IllegalArgumentException("El número de documento es requerido.");
        }

        if (tipoDoc.equals("CC")) {
            if (!request.getNumeroDocumento().matches("^\\d{6,10}$")) {
                throw new IllegalArgumentException("La cédula debe tener entre 6 y 10 dígitos.");
            }
        } else if (tipoDoc.equals("PASAPORTE")) {
            if (request.getNumeroDocumento().length() < 6 || request.getNumeroDocumento().length() > 12) {
                throw new IllegalArgumentException("El pasaporte debe tener entre 6 y 12 caracteres.");
            }
        }
    }

    private boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else if ("@$!%*?&".indexOf(c) >= 0) hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
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
