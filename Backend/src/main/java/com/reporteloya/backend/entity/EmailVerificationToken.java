package com.reporteloya.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification_token")
public class EmailVerificationToken {

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
    private Long idUsuario;

    @Column(nullable = false)
    private boolean used = false;

    public EmailVerificationToken() {
    }

    public EmailVerificationToken(String email, String token, LocalDateTime expirationDate, Long idUsuario) {
        this.email = email;
        this.token = token;
        this.expirationDate = expirationDate;
        this.idUsuario = idUsuario;
        this.used = false;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getToken() { return token; }
    public LocalDateTime getExpirationDate() { return expirationDate; }
    public boolean isUsed() { return used; }
    public Long getIdUsuario() { return idUsuario; }

    public void setEmail(String email) { this.email = email; }
    public void setToken(String token) { this.token = token; }
    public void setExpirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; }
    public void setUsed(boolean used) { this.used = used; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expirationDate);
    }
}
