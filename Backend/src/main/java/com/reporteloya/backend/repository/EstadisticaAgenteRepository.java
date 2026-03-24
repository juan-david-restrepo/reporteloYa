package com.reporteloya.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.reporteloya.backend.entity.EstadisticaAgente;

@Repository
public interface EstadisticaAgenteRepository extends JpaRepository<EstadisticaAgente, Long> {

    List<EstadisticaAgente> findByAgenteIdAndPeriodoOrderByEtiquetaAsc(Long agenteId, String periodo);

    List<EstadisticaAgente> findByAgentePlacaAndPeriodoOrderByEtiquetaAsc(String placa, String periodo);

    @Query("SELECT e FROM EstadisticaAgente e WHERE e.agente.placa = :placa AND e.periodo = :periodo ORDER BY e.etiqueta")
    List<EstadisticaAgente> buscarPorPlacaYPeriodo(@Param("placa") String placa, @Param("periodo") String periodo);

    @Query("SELECT e FROM EstadisticaAgente e WHERE e.agente.placa = :placa AND e.periodo = :periodo AND e.tipo = :tipo ORDER BY e.etiqueta")
    List<EstadisticaAgente> buscarPorPlacaPeriodoYTipo(@Param("placa") String placa, @Param("periodo") String periodo, @Param("tipo") String tipo);

    @Query("SELECT e FROM EstadisticaAgente e WHERE e.agente.placa = :placa AND e.periodo = :periodo AND e.createdAt BETWEEN :fechaInicio AND :fechaFin ORDER BY e.etiqueta")
    List<EstadisticaAgente> buscarPorPlacaPeriodoYFechaBetween(
        @Param("placa") String placa, 
        @Param("periodo") String periodo,
        @Param("fechaInicio") LocalDateTime fechaInicio,
        @Param("fechaFin") LocalDateTime fechaFin);

    @Query("SELECT COALESCE(SUM(e.cantidad), 0) FROM EstadisticaAgente e WHERE e.agente.placa = :placa AND e.tipo = :tipo")
    int contarPorPlacaYTipo(@Param("placa") String placa, @Param("tipo") String tipo);

    @Query("SELECT COALESCE(SUM(e.cantidad), 0) FROM EstadisticaAgente e WHERE e.agente.placa = :placa AND e.periodo = :periodo AND e.tipo = :tipo")
    int contarPorPlacaPeriodoYTipo(@Param("placa") String placa, @Param("periodo") String periodo, @Param("tipo") String tipo);

    void deleteByAgentePlaca(String placa);

    @Query("SELECT e FROM EstadisticaAgente e WHERE e.periodo = :periodo ORDER BY e.etiqueta")
    List<EstadisticaAgente> buscarPorPeriodo(@Param("periodo") String periodo);

    @Query("SELECT e FROM EstadisticaAgente e WHERE e.periodo = :periodo AND e.tipo = :tipo ORDER BY e.etiqueta")
    List<EstadisticaAgente> buscarPorPeriodoYTipo(@Param("periodo") String periodo, @Param("tipo") String tipo);

    @Query("SELECT COALESCE(SUM(e.cantidad), 0) FROM EstadisticaAgente e WHERE e.tipo = :tipo")
    int contarPorTipo(@Param("tipo") String tipo);
}
