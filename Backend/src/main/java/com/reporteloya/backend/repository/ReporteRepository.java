package com.reporteloya.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.reporteloya.backend.entity.Prioridad;
import com.reporteloya.backend.entity.Reporte;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    List<Reporte> findByAgente_Placa(String placa);

    List<Reporte> findByEstado(String estado);

    Page<Reporte> findByEstado(String estado, Pageable pageable);

    List<Reporte> findByAgentePlacaIgnoreCaseAndEstado(String placa, String estado);

    int countByUsuario_Id(Long idUsuario);

    Page<Reporte> findByPrioridad(Prioridad prioridad, Pageable pageable);

    // LEFT JOIN para que no explote cuando agenteCompanero es NULL
    @Query("SELECT r FROM Reporte r " +
           "LEFT JOIN r.agenteCompanero ac " +
           "WHERE r.estado = 'EN_PROCESO' " +
           "AND (r.agente.placa = :placa OR ac.placa = :placa)")
    List<Reporte> findEnProcesoParaAgente(@Param("placa") String placa);

    // Historial: reportes FINALIZADOS o RECHAZADOS donde el agente participó
    @Query("SELECT r FROM Reporte r " +
           "LEFT JOIN r.agenteCompanero ac " +
           "WHERE (r.estado = 'FINALIZADO' OR r.estado = 'RECHAZADO') " +
           "AND (r.agente.placa = :placa OR ac.placa = :placa) " +
           "ORDER BY COALESCE(r.fechaFinalizado, r.fechaRechazado, r.updatedAt) DESC")
    List<Reporte> findHistorialParaAgente(@Param("placa") String placa);

    // Contar reportes por estado (para dashboard)
    int countByEstado(String estado);

    // Contar reportes creados en una fecha específica (para reportes hoy)
    int countByCreatedAtBetween(LocalDateTime startOfDay, LocalDateTime endOfDay);

    // Contar reportes finalizados en un rango de fechas
    @Query("SELECT COUNT(r) FROM Reporte r WHERE r.estado = 'FINALIZADO' AND r.fechaFinalizado BETWEEN :inicio AND :fin")
    int countFinalizadosEntre(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    // Contar reportes rechazados en un rango de fechas
    @Query("SELECT COUNT(r) FROM Reporte r WHERE r.estado = 'RECHAZADO' AND r.fechaRechazado BETWEEN :inicio AND :fin")
    int countRechazadosEntre(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    // Reportes finalizados por agente (para estadísticas)
    @Query("SELECT r FROM Reporte r WHERE r.estado = 'FINALIZADO' AND (r.agente.placa = :placa OR r.agenteCompanero.placa = :placa)")
    List<Reporte> findFinalizadosByAgente(@Param("placa") String placa);
}
