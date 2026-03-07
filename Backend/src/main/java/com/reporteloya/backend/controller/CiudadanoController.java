package com.reporteloya.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ciudadano")
public class CiudadanoController {

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Acceso CIUDADANO permitido");
    }
}
