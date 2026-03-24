package com.reporteloya.backend.service;

import com.reporteloya.backend.dto.AIRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class AIService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String aiUrl = "http://localhost:8000/ai/start";

    public Map<String, Object> startConversation(Long userId, String name, String role) {
        AIRequest request = new AIRequest(userId, name, role);

        ResponseEntity<Map> response =
                restTemplate.postForEntity(aiUrl, request, Map.class);

        return response.getBody();
    }
}