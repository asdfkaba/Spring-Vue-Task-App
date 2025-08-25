package com.example.demo.auth.provider;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component("google")
public class GoogleOAuth2Provider extends AbstractOAuthProvider {

    public GoogleOAuth2Provider(
            @Value("${spring.security.oauth2.client.provider.google.token-endpoint}") String tokenEndpoint,
            @Value("${spring.security.oauth2.client.registration.google.client-id}") String clientId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret}") String clientSecret,
            @Value("${spring.security.oauth2.client.registration.google.redirect-uri}") String redirectUri,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {

        super(tokenEndpoint, clientId, clientSecret, redirectUri, restTemplate, objectMapper);
    }
    @Override
    protected OAuth2User createUserFromTokenResponse(Map<String, Object> tokenResponse) {
        try {
            String idToken = (String) tokenResponse.get("id_token");
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid ID token format");
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            // Deserialize into Map
            Map<String, Object> claims = objectMapper.readValue(payload, new TypeReference<Map<String,Object>>() {});

            // Extract username/email for authorities
            String email = (String) claims.get("email");

            // Authorities: you can create ROLE_USER or extract from claims if present
            List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));

            // Build DefaultOAuth2User
            return new DefaultOAuth2User(authorities, claims, "email");
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse ID token", e);
        }
    }
}



