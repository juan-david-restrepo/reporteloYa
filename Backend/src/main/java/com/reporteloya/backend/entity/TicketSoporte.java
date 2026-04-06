package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ticket_soporte")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketSoporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 255)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrioridadTicket prioridad = PrioridadTicket.MEDIA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoTicket estado = EstadoTicket.ABIERTO;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("fechaEnvio ASC")
    private List<MensajeSoporte> mensajes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        fechaCreacion = now;
        fechaActualizacion = now;
        if (prioridad == null) {
            prioridad = PrioridadTicket.MEDIA;
        }
        if (estado == null) {
            estado = EstadoTicket.ABIERTO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
