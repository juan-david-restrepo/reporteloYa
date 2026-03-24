package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
