package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "mensaje_soporte")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MensajeSoporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private TicketSoporte ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emisor_id", nullable = false)
    private Usuario emisor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "es_admin", nullable = false)
    private Boolean esAdmin = false;

    @Column(nullable = false)
    private Boolean leido = false;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio;

    @PrePersist
    protected void onCreate() {
        if (fechaEnvio == null) {
            fechaEnvio = LocalDateTime.now();
        }
        if (esAdmin == null) {
            esAdmin = false;
        }
        if (leido == null) {
            leido = false;
        }
    }
}
