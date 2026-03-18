package com.reporteloya.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Getter;
import lombok.Setter;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.CascadeType;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonBackReference;


@Entity
@Getter
@Setter
@Table(name = "reporte")
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reporte")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_agente")
    @JsonBackReference
    private Agentes agente;

    // ✅ NUEVO: agente compañero (referencia al segundo agente)
    @ManyToOne
    @JoinColumn(name = "id_agente_companero")
    private Agentes agenteCompanero;

    @Enumerated(EnumType.STRING)
    private Prioridad prioridad;

    private String tipoInfraccion;
    private String descripcion;
    private String direccion;
    private Double latitud;
    private Double longitud;
    private String placa;

    private String estado; // PENDIENTE, EN_PROCESO, FINALIZADO, RECHAZADO

    // ✅ NUEVO: flag para saber si fue atendido en dupla
    private Boolean acompanado = false;

    private LocalDate fechaIncidente;
    private LocalTime horaIncidente;

    @OneToMany(mappedBy = "reporte", cascade = CascadeType.ALL)
    private List<Evidencia> evidencias;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(length = 1000)
    private String resumenOperativo;

    private LocalDateTime fechaAceptado;

    private LocalDateTime fechaFinalizado;

    private LocalDateTime fechaRechazado;
}
