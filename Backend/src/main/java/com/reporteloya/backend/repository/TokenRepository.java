package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;

public interface TokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    void deleteByEmail(String email);

    void deleteByExpirationDateBefore(LocalDateTime date);
}