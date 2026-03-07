package com.reporteloya.backend.config;

import java.security.Key;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Component
public class JwtUtils {

    @Value("${jwt.secret.key}")
    private String jwtSecret;

    private static String secret;

    @PostConstruct
    private void init() {
        secret = this.jwtSecret;
    }

    /**
     * Valida un JWT y retorna el subject (userId) si es válido, o null si no.
     */
    public static String validateTokenAndGetUserId(String token) {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(secret);
            Key key = Keys.hmacShaKeyFor(keyBytes);
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            return claims.getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            // token inválido o expirado
            return null;
        }
    }
}
