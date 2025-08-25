package com.example.demo.auth.jwt;

import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // ✅ now valid
    private Long id;

    @ManyToOne
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    private Instant issuedAt;
    private Instant expiresAt;
    private String userAgent;
    private String ipAddress;
    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }

}