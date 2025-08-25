package com.example.demo.auth.jwt;

import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtDecoder jwtDecoder;
    private final long REFRESH_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days


    public TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokenRepository, UserRepository userRepository, JwtDecoder jwtDecoder) {
        this.encoder = encoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtDecoder = jwtDecoder;
        this.userRepository = userRepository;

    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plus(1, ChronoUnit.MINUTES))
                .subject(user.getEmail()) // or user.getId().toString() if preferred
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    @Transactional
    public RefreshToken generateRefreshToken(User user) {
        // Generate secure random token
        String token = UUID.randomUUID().toString();

        RefreshToken refreshToken  = new RefreshToken();
        refreshToken.setToken(token);
        refreshToken.setUser(user);
        refreshToken.setIssuedAt(Instant.now());
        refreshToken.setExpiresAt(Instant.now().plusMillis(REFRESH_TOKEN_VALIDITY_MS));
        refreshTokenRepository.save(refreshToken);

        return refreshToken;
    }

    public boolean validateRefreshToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
                .isPresent();
    }

    public Authentication parseToken(String token) {
        Jwt jwt = jwtDecoder.decode(token);

        String username = jwt.getSubject();
        // Example: read roles or authorities from claims if you store them
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));

        return new UsernamePasswordAuthenticationToken(username, null, authorities);
    }

    @Transactional
    public void deleteRefreshToken(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> refreshTokenRepository.delete(rt));
    }

    public long getAccessTokenExpirySeconds() {
        return REFRESH_TOKEN_VALIDITY_MS;
    }

    public String generateAccessTokenFromRefresh(String refreshToken) {
        Optional<RefreshToken> tokenEntityOpt = refreshTokenRepository.findByToken(refreshToken);
        if (tokenEntityOpt.isEmpty() || tokenEntityOpt.get().isExpired()) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        User user = tokenEntityOpt.get().getUser();
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("self")
                .issuedAt(now)
                .expiresAt(now.plus(1, ChronoUnit.MINUTES))
                .subject(user.getEmail()) // or user.getId().toString() if preferred
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

        public boolean isRefreshTokenValid(String refreshToken) {
            Optional<RefreshToken> tokenEntityOpt = refreshTokenRepository.findByToken(refreshToken);
            if (tokenEntityOpt.isEmpty()) {
                System.out.println("refresh lookup failed");
                return false;
            }

            RefreshToken tokenEntity = tokenEntityOpt.get();
            if (tokenEntity.isExpired()) {
                System.out.println("refresh expired");
                return false;
            }

            return true;
        }

}


