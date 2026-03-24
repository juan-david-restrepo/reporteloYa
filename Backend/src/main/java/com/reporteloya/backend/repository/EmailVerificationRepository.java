package com.reporteloya.backend.repository;

import com.reporteloya.backend.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.time.LocalDateTime;

public interface EmailVerificationRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByToken(String token);

    Optional<EmailVerificationToken> findByEmail(String email);

    void deleteByEmail(String email);

    void deleteByExpirationDateBefore(LocalDateTime date);
}
