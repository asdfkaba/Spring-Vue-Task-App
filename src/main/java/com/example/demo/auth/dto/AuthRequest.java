package com.example.demo.auth.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String code;
    private String code_verifier;
    private String provider;
}
