package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

@Entity
@Table(name = "tareas")
@Data
@ToString(exclude = "agente") // Evita bucles infinitos en el log
@EqualsAndHashCode(exclude = "agente") // Evita errores de recursividad
public class Tarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String titulo;
    private String descripcion;
    @Column(name = "resumen_operativo")
    private String resumenOperativo;
    private String fecha;
    private String hora;
    private String prioridad;
    private String estado;

    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_agente")
    @JsonIgnore // Evita que al consultar una tarea se traiga a todo el agente (bucle)
    private Agentes agente;
}