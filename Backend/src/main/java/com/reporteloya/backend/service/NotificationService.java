package com.reporteloya.backend.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.reporteloya.backend.entity.Reporte;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyNewReport(Reporte reporte) {

        messagingTemplate.convertAndSend("/topic/admins", reporte);
        messagingTemplate.convertAndSend("/topic/agents", reporte);
    }

}
