package com.reporteloya.backend.config;

import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Role;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.repository.UsuarioRepository;
import com.reporteloya.backend.repository.AgenteRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Configuración de Beans de la aplicación.
 */
@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    private final UsuarioRepository usuarioRepository;
    private final AgenteRepository agenteRepository;

    /**
     * Define cómo Spring Security debe cargar los detalles de un usuario.
     * Le decimos que use nuestro UserRepository.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> usuarioRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
    }

    /**
     * Define el "Proveedor de Autenticación".
     * Le decimos que use nuestro UserDetailsService y el PasswordEncoder.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder()); // Usa el encriptador de contraseñas
        return authProvider;
    }

    /**
     * Define el gestor de autenticación que usará el AuthService.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Define el encriptador de contraseñas (BCrypt).
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * (IMPORTANTE) Crea el usuario ADMIN al iniciar la aplicación.
     * Como el ADMIN solo tiene login (no registro), lo creamos aquí.
     */
    @Bean
    public CommandLineRunner createAdminUser(PasswordEncoder passwordEncoder) {
        return args -> {
            // Creamos un admin por defecto si no existe un correo admin
            if (!usuarioRepository.existsByEmail("admin@admin.com")) {
                Usuario adminUser = Usuario.builder()
                        .tipoDocumento("N/A")
                        .numeroDocumento("0")
                        .nombreCompleto("Administrador")
                        .email("admin@admin.com")
                        .password(passwordEncoder.encode("admin123")) // Contraseña hardcodeada
                        .role(Role.ADMIN)
                        .build();
                usuarioRepository.save(adminUser);
                System.out.println(">>> Usuario ADMIN creado (admin@admin.com / admin123) <<<");
            }
          
            if (!agenteRepository.existsByEmail("agente@transito.com")) {

                Agentes agente = new Agentes();

                agente.setTipoDocumento("CC");
                agente.setNumeroDocumento("123456789");
                agente.setNombreCompleto("Agente de Tránsito");
                agente.setEmail("agente@transito.com");
                agente.setPassword(passwordEncoder.encode("agente123"));
                agente.setRole(Role.AGENTE);

                agente.setPlaca("AT-125");
                agente.setTelefono("3001234567");
                agente.setNombre("Agente de Tránsito");
                agente.setEstado("disponible");

                agente.setFoto(null);

                agenteRepository.save(agente);

                System.out.println(">>> Agente completo creado correctamente <<<");
            }

            if (!agenteRepository.existsByEmail("agente@transito2.com")) {

                Agentes agente = new Agentes();

                agente.setTipoDocumento("CC");
                agente.setNumeroDocumento("1092456845");
                agente.setNombreCompleto("Juan David");
                agente.setEmail("agente@transito2.com");
                agente.setPassword(passwordEncoder.encode("agente123456"));
                agente.setRole(Role.AGENTE);

                agente.setPlaca("AT-126");
                agente.setTelefono("3229801122");
                agente.setNombre("Juan David");
                agente.setEstado("disponible");


                agenteRepository.save(agente);

                System.out.println(">>> Agente completo David creado correctamente <<<");
            }
            

            
        };
    }

}