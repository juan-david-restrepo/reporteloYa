package com.reporteloya.backend.controller;

import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AIChatController {

    private final ChatService chatService;

    public AIChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            Authentication authentication,
            @RequestParam(required = false) Integer conversationId,
            @RequestBody String message
    ) {
        Usuario usuario = (Usuario) authentication.getPrincipal();

        Map<String, Object> response =
                chatService.sendMessage(usuario.getId(), conversationId, message);

        return ResponseEntity.ok(response);
    }
}