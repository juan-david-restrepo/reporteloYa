package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    @Query("SELECT n FROM Notification n WHERE n.agente.id = :agenteId AND n.leida = false ORDER BY n.fechaCreacion DESC")
    List<Notification> findNoLeidasPorAgenteId(@Param("agenteId") Long agenteId);
    
    @Query("SELECT n FROM Notification n WHERE n.agente.id = :agenteId ORDER BY n.fechaCreacion DESC")
    List<Notification> findPorAgenteId(@Param("agenteId") Long agenteId);

    @Query("SELECT n FROM Notification n WHERE n.usuario.id = :usuarioId AND n.leida = false ORDER BY n.fechaCreacion DESC")
    List<Notification> findNoLeidasPorUsuarioId(@Param("usuarioId") Long usuarioId);
    
    @Query("SELECT n FROM Notification n WHERE n.usuario.id = :usuarioId ORDER BY n.fechaCreacion DESC")
    List<Notification> findPorUsuarioId(@Param("usuarioId") Long usuarioId);

    @Query("SELECT n FROM Notification n WHERE n.usuario.id = :usuarioId ORDER BY n.fechaCreacion DESC LIMIT 50")
    List<Notification> findUltimas50PorUsuarioId(@Param("usuarioId") Long usuarioId);
    
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.usuario.id = :usuarioId AND n.id NOT IN (SELECT n2.id FROM Notification n2 WHERE n2.usuario.id = :usuarioId ORDER BY n2.fechaCreacion DESC LIMIT 50)")
    void eliminarExtrasParaUsuario(@Param("usuarioId") Long usuarioId);
}
