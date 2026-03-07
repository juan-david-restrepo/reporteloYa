package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // 1. (Se Mantiene) CRÍTICO para el Login y Spring Security
    // Permite buscar un usuario por su email para autenticación.
    Optional<Usuario> findByEmail(String email);

    // 2. (Nuevo) CRÍTICO para el Registro
    // Permite verificar rápidamente si un email ya existe antes de crear un nuevo
    // usuario.
    // Esto previene duplicados y lanzará la excepción correcta en el AuthService.
    boolean existsByEmail(String email);
}