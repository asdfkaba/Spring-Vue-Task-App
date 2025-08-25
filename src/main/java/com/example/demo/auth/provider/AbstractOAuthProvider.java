package com.example.demo.auth.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public abstract class AbstractOAuthProvider implements OAuthProvider {
    protected final String tokenEndpoint;
    protected final String clientId;
    protected final String clientSecret;
    protected final String redirectUri;

    protected final RestTemplate restTemplate;
    protected final ObjectMapper objectMapper;

    public AbstractOAuthProvider(
            String tokenEndpoint,
            String clientId,
            String clientSecret,
            String redirectUri,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {

        this.tokenEndpoint = tokenEndpoint;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    protected abstract OAuth2User createUserFromTokenResponse(Map<String, Object> tokenResponse);

    @Override
    public OAuth2User getOAuth2User(String code, String codeVerifier) {
        String tokenEndpoint = this.tokenEndpoint;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "code=" + code +
                "&client_id=" + this.clientId +
                "&code_verifier=" + codeVerifier + // ← 🧠 this is the key line!
                "&client_secret=" + this.clientSecret + // optional if you're using a confidential client
                "&redirect_uri=" + this.redirectUri +
                "&grant_type=authorization_code";

        System.out.println(body);

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenEndpoint, request, Map.class);

        Map<String, Object> tokenResponse = response.getBody();
        System.out.println("Token response: " + tokenResponse);

        return createUserFromTokenResponse(tokenResponse);
    }
}