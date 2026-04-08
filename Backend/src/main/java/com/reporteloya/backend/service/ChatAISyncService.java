package com.reporteloya.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class ChatAISyncService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String syncUserUrl = "http://localhost:8000/sync-user";

    public boolean syncUser(Long userId, String email, String nombreCompleto, 
                           String role, String tipoDocumento, String numeroDocumento) {
        try {
            Map<String, Object> request = Map.of(
                "user_id", userId,
                "email", email,
                "nombre_completo", nombreCompleto,
                "role", role,
                "tipo_documento", tipoDocumento != null ? tipoDocumento : "",
                "numero_documento", numeroDocumento != null ? numeroDocumento : ""
            );

            Map<String, Object> response = restTemplate.postForObject(syncUserUrl, request, Map.class);
            
            return response != null && Boolean.TRUE.equals(response.get("success"));
            
        } catch (Exception e) {
            System.err.println("Error sincronizando usuario con Chat AI: " + e.getMessage());
            return false;
        }
    }
}