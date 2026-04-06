package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.EstadoTicket;
import com.reporteloya.backend.entity.TicketSoporte;
import com.reporteloya.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Long> {

    List<TicketSoporte> findByUsuarioOrderByFechaActualizacionDesc(Usuario usuario);

    List<TicketSoporte> findAllByOrderByFechaActualizacionDesc();

    List<TicketSoporte> findByEstadoOrderByFechaActualizacionDesc(EstadoTicket estado);

    long countByEstado(EstadoTicket estado);

    @Query("SELECT t FROM TicketSoporte t LEFT JOIN FETCH t.mensajes WHERE t.id = :id")
    Optional<TicketSoporte> findByIdWithMensajes(@Param("id") Long id);

    @Query("SELECT t FROM TicketSoporte t WHERE t.usuario.id = :usuarioId ORDER BY t.fechaActualizacion DESC")
    List<TicketSoporte> findByUsuarioIdOrderByFechaActualizacionDesc(@Param("usuarioId") Long usuarioId);
}
