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
    private String foto;

    @OneToMany(mappedBy = "agente", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tarea> listaTareas = new ArrayList<>();

    @OneToMany(mappedBy = "agente", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Reporte> reportes;
}