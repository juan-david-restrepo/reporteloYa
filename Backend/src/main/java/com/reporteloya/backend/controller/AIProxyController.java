package com.reporteloya.backend.controller;

import com.reporteloya.backend.dto.AIRequest;
import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.service.AIService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AIProxyController {

    private final AIService aiService;

    public AIProxyController(AIService aiService) {
        this.aiService = aiService;
    }

    /**
     * Inicia o obtiene una conversación para el usuario logueado
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startAI(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario no autenticado"));
        }

        Usuario usuario = (Usuario) authentication.getPrincipal();

        // Llama al servicio que se encarga de comunicarse con FastAPI
        Map<String, Object> response = aiService.startConversation(
                usuario.getId(),
                usuario.getNombreCompleto(),
                usuario.getRole().name()
        );

        return ResponseEntity.ok(response);
    }
}