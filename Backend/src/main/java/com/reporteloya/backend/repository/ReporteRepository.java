package com.reporteloya.backend.repository;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.reporteloya.backend.entity.Reporte;
import java.util.List;

@Repository
public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    List<Reporte> findByAgente_Placa(String placa);

    List<Reporte> findByEstado(String estado);
    
    List<Reporte> findByAgentePlacaIgnoreCaseAndEstado(String placa, String estado);

    int countByUsuario_Id(Long idUsuario);
}
