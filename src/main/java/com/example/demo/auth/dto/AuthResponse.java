package com.example.demo.auth.dto;

import com.example.demo.auth.jwt.RefreshToken;
import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private RefreshToken refreshToken;

    public AuthResponse(String token, RefreshToken refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
    }
}
