package com.reporteloya.backend.config;

import lombok.RequiredArgsConstructor;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthFilter;
        private final AuthenticationProvider authenticationProvider;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                http

                                // =========================
                                // CORS (listo para multi-dominio)
                                // =========================
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                                // =========================
                                // CSRF
                                // =========================
                                .csrf(csrf -> csrf.disable())

                                // =========================
                                // AUTORIZACIÓN
                                // =========================
                                .authorizeHttpRequests(auth -> auth

                                                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/resend-verification", "/api/auth/verify-email").permitAll()
                                                .requestMatchers("/api/password/**").permitAll()
                                                
                                                // Reportes - solo crear requiere autenticación
                                                .requestMatchers("/api/reportes/crear").authenticated()
                                                .requestMatchers("/api/reportes/mapa").permitAll()
                                                .requestMatchers("/api/reportes/pendientes").permitAll()
                                                .requestMatchers("/api/reportes/todos").permitAll()
                                                .requestMatchers("/api/reportes/estadisticas-admin").permitAll()
                                                .requestMatchers("/api/reportes").permitAll()

                                                .requestMatchers("/api/auth/me").authenticated()

                                                .requestMatchers("/admin/**").hasAnyRole("ADMIN", "AGENTE")
                                                .requestMatchers("/agente/**").hasAnyRole("AGENTE", "ADMIN")

                                                .requestMatchers("/api/ciudadano/**").hasRole("CIUDADANO")

                                                .requestMatchers("/api/reportes/agente/**").hasRole("AGENTE")

                                                .requestMatchers("/api/reportes/ciudadano/**").hasRole("CIUDADANO")

                                                // Soporte - ciudadano puede crear y ver sus tickets
                                                .requestMatchers("/api/soporte/crear").hasRole("CIUDADANO")
                                                .requestMatchers("/api/soporte/mis-tickets/**").hasRole("CIUDADANO")
                                                // Soporte - admin y agente pueden gestionar tickets
                                                .requestMatchers("/api/soporte/admin/**").hasAnyRole("ADMIN", "AGENTE")

                                                .requestMatchers("/ws/**").permitAll()
                                                .requestMatchers("/error").permitAll()

                                                .anyRequest().authenticated())

                                // =========================
                                // STATELESS
                                // =========================
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // =========================
                                // AUTH PROVIDER
                                // =========================
                                .authenticationProvider(authenticationProvider)

                                // =========================
                                // JWT FILTER
                                // =========================
                                .addFilterBefore(
                                                jwtAuthFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        /**
         * Configuración CORS.
         * Permite cookies HttpOnly (allowCredentials = true)
         */
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration configuration = new CorsConfiguration();

                // 🔥 ORIGEN EXACTO (NO "*")
                configuration.setAllowedOrigins(List.of("http://localhost:4200"));

                configuration.setAllowedMethods(List.of(
                                "GET", "POST", "PUT", "DELETE", "OPTIONS"));

                configuration.setAllowedHeaders(List.of("*"));

                configuration.setAllowCredentials(true); // necesario para cookies

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);

                return source;
        }

}
