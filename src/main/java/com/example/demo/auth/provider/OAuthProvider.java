package com.example.demo.auth.provider;

import org.springframework.security.oauth2.core.user.OAuth2User;

public interface OAuthProvider {
    OAuth2User getOAuth2User(String code, String codeVerifier);
}