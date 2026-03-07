package com.reporteloya.backend.controller;

import com.reporteloya.backend.entity.Agentes;
import com.reporteloya.backend.entity.Tarea;
import com.reporteloya.backend.repository.TareaRepository;
import com.reporteloya.backend.service.AgenteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional; // IMPORTANTE PARA EL BORRADO
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/agente")
@CrossOrigin(origins = {"http://localhost:4200"})
public class AgenteController {

    @Autowired
    private AgenteService agenteService;

    @GetMapping("/perfil")
    public ResponseEntity<Agentes> obtenerPerfilAgente(Authentication authentication) {

        String email = authentication.getName();

        return agenteService.buscarPorEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    
}