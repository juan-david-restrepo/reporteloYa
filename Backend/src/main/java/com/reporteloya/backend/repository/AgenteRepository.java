package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.Agentes; // <--- Importante corregir esto
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AgenteRepository extends JpaRepository<Agentes, Long> {
    Optional<Agentes> findByPlaca(String placa);

    Optional<Agentes> findByPlacaIgnoreCase(String placa);

    boolean existsByDocumento(String documento);

    boolean existsByEmail(String email);

    Optional<Agentes> findByEmail(String email);
}
