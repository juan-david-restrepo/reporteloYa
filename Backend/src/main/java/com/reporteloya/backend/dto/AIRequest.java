package com.reporteloya.backend.dto;

public class AIRequest {
    private Long user_id;
    private String name;
    private String role;

    public AIRequest(Long user_id, String name, String role) {
        this.user_id = user_id;
        this.name = name;
        this.role = role;
    }

    public Long getUser_id() { return user_id; }
    public String getName() { return name; }
    public String getRole() { return role; }
}