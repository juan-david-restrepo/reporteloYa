package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "agentes")
@Data
public class Agentes extends Usuario {

    private String placa;
    private String nombre;
    private String documento;
    private String telefono;
    private String estado;
    @Column(length = 1000)
    private String foto;
    
    @Column(length = 40)
    private String resumenProfesional1;
    
    @Column(length = 40)
    private String resumenProfesional2;
    
    @Column(length = 40)
    private String resumenProfesional3;
    
    @Column(length = 40)
    private String resumenProfesional4;

    @OneToMany(mappedBy = "agente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tarea> listaTareas = new ArrayList<>();

    @OneToMany(mappedBy = "agente", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Reporte> reportes;
}