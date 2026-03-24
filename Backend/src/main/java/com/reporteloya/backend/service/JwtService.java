package com.reporteloya.backend.service;

import com.reporteloya.backend.entity.Usuario;
import com.reporteloya.backend.entity.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;


@Service
public class JwtService {

    @Value("${jwt.secret.key}")
    private String secretKey;

    @Value("${jwt.expiration.base.ms}")
    private long baseExpirationMs;

    @Value("${jwt.multiplier.admin}")
    private int multiplierAdmin;

    @Value("${jwt.multiplier.agente}")
    private int multiplierAgente;

    @Value("${jwt.multiplier.ciudadano}")
    private int multiplierCiudadano;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Genera el token JWT con el tiempo de expiración estándar.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {

        if (userDetails instanceof Usuario customUsuario) {
            extraClaims.put("role", customUsuario.getRole().name());
            extraClaims.put("userId", customUsuario.getId());
        }

        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(
                        new Date(System.currentTimeMillis() + baseExpirationMs))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Genera el token JWT con tiempo de expiración según el ROL del usuario.
     * - ADMIN: 5 días (120 horas)
     * - AGENTE: 5 días (120 horas)
     * - CIUDADANO: 5 horas
     */
    public String generateTokenWithRole(UserDetails userDetails, Role role) {
        return generateTokenWithRole(new HashMap<>(), userDetails, role);
    }

    /**
     * Genera el token JWT con claims extra y tiempo según el ROL.
     */
    public String generateTokenWithRole(Map<String, Object> extraClaims, UserDetails userDetails, Role role) {

        if (userDetails instanceof Usuario customUsuario) {
            extraClaims.put("role", customUsuario.getRole().name());
            extraClaims.put("userId", customUsuario.getId());
        }

        long expirationMs = getExpirationByRole(role);

        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Obtiene el tiempo de expiración en milisegundos según el rol.
     */
    public long getExpirationByRole(Role role) {
        int multiplier = switch (role) {
            case ADMIN -> multiplierAdmin;
            case AGENTE -> multiplierAgente;
            case CIUDADANO -> multiplierCiudadano;
        };
        return baseExpirationMs * multiplier;
    }

    /**
     * Obtiene la expiración del token en segundos (para la cookie).
     */
    public long getExpirationSecondsByRole(Role role) {
        return getExpirationByRole(role) / 1000;
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    
}
