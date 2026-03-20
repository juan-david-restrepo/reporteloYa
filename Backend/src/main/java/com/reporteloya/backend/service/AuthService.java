package com.reporteloya.backend.service;

import com.reporteloya.backend.entity.Role;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.dto.LoginRequest;
import com.reporteloya.backend.dto.RegisterRequest;
import com.reporteloya.backend.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    // =========================
    // REGISTER (Ciudadano por defecto)
    // =========================
    public AuthResult register(RegisterRequest request) {

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
                .build();

        try {
            usuarioRepository.save(nuevoUsuario);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Error: El correo electrónico ya está registrado.");
        }

        String jwtToken = jwtService.generateTokenWithRole(nuevoUsuario, Role.CIUDADANO);

        return new AuthResult(jwtToken, nuevoUsuario);
    }

    // =========================
    // LOGIN (Tiempo según rol)
    // =========================
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

        String jwtToken = jwtService.generateTokenWithRole(usuario, usuario.getRole());

        return new AuthResult(jwtToken, usuario);
    }
}