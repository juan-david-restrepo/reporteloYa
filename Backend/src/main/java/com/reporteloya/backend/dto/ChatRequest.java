package com.reporteloya.backend.dto;

public class ChatRequest {
    private Long user_id;
    private Integer conversation_id;
    private String message;

    public ChatRequest(Long user_id, Integer conversation_id, String message) {
        this.user_id = user_id;
        this.conversation_id = conversation_id;
        this.message = message;
    }

    public Long getUser_id() { return user_id; }
    public Integer getConversation_id() { return conversation_id; }
    public String getMessage() { return message; }
}