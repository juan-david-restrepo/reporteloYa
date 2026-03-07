package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_token")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    @Column(name = "expiration_date", nullable = false)
    private LocalDateTime expirationDate;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;  // ✅ Campo agregado

    @Column(nullable = false)
    private boolean used = false;

    public PasswordResetToken() {
    }

    public PasswordResetToken(String email, String token, LocalDateTime expirationDate, Long idUsuario) {
        this.email = email;
        this.token = token;
        this.expirationDate = expirationDate;
        this.idUsuario = idUsuario; // ✅ Se asigna
        this.used = false;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getToken() { return token; }
    public LocalDateTime getExpirationDate() { return expirationDate; }
    public boolean isUsed() { return used; }
    public Long getIdUsuario() { return idUsuario; } // ✅ getter agregado

    public void setEmail(String email) { this.email = email; }
    public void setToken(String token) { this.token = token; }
    public void setExpirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; }
    public void setUsed(boolean used) { this.used = used; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; } // ✅ setter agregado

    // ⏳ Verificar expiración
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expirationDate);
    }
}