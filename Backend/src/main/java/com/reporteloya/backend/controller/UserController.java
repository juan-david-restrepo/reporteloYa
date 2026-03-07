        package com.reporteloya.backend.controller;

        import com.reporteloya.backend.entity.Usuario;
        import com.reporteloya.backend.repository.UsuarioRepository;
        import com.reporteloya.backend.repository.ReporteRepository;

        import java.util.HashMap;
        import java.util.Map;

        import org.springframework.http.ResponseEntity;
        import org.springframework.security.crypto.password.PasswordEncoder;
        import org.springframework.security.core.Authentication;
        import org.springframework.web.bind.annotation.*;
        import org.springframework.web.bind.annotation.GetMapping;



        @RestController
        @RequestMapping("/api/ciudadano")
        public class UserController {

            private final UsuarioRepository userRepository;
            private final ReporteRepository reporteRepository;
            private final PasswordEncoder passwordEncoder;

            public UserController(UsuarioRepository userRepository, ReporteRepository reporteRepository,
                                PasswordEncoder passwordEncoder) {
                this.userRepository = userRepository;
                this.reporteRepository = reporteRepository;
                this.passwordEncoder = passwordEncoder;
            }

            // ================= GET perfil =================
            @GetMapping("/profile")
            public ResponseEntity<Usuario> getProfile(Authentication authentication) {
                String email = authentication.getName();
                Usuario user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                return ResponseEntity.ok(user);
            }

            // ================= GET total de reportes =================
            @GetMapping("/reportes/total")
            public ResponseEntity<Map<String, Integer>> getTotalReportes(Authentication authentication) {
                String email = authentication.getName();
                Usuario user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                // Contar reportes usando ReporteRepository (más seguro)
                int totalReportes = reporteRepository.countByUsuario_Id(user.getId());

                Map<String, Integer> response = new HashMap<>();
                response.put("total_reportes", totalReportes);

                return ResponseEntity.ok(response);
            }

            // ================= PUT actualizar perfil =================
            @PutMapping("/profile")
            public ResponseEntity<Usuario> updateProfile(
                    @RequestBody Usuario updatedUser,
                    Authentication authentication) {

                String email = authentication.getName();
                Usuario user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                // Actualizar solo nombre, email y contraseña
                user.setNombreCompleto(updatedUser.getNombreCompleto());
                user.setEmail(updatedUser.getEmail());

                if (updatedUser.getPassword() != null && !updatedUser.getPassword().isBlank()) {
                    user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
                }

                Usuario saved = userRepository.save(user);
                return ResponseEntity.ok(saved);
            }
        }