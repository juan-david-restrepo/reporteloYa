package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.Evidencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;

@Repository
public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {

    // 🔥 Buscar evidencias por id del reporte
    List<Evidencia> findByReporteId(Long idReporte);
}
