package com.example.demo.auth.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component("discord")
public class DiscordOAuth2Provider extends AbstractOAuthProvider {

    public DiscordOAuth2Provider(
            @Value("${spring.security.oauth2.client.provider.discord.token-uri}") String tokenEndpoint,
            @Value("${spring.security.oauth2.client.registration.discord.client-id}") String clientId,
            @Value("${spring.security.oauth2.client.registration.discord.client-secret}") String clientSecret,
            @Value("${spring.security.oauth2.client.registration.discord.redirect-uri}") String redirectUri,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {

        super(tokenEndpoint, clientId, clientSecret, redirectUri, restTemplate, objectMapper);
    }
    @Override
    protected OAuth2User createUserFromTokenResponse(Map<String, Object> tokenResponse) {
        String accessToken = (String) tokenResponse.get("access_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Map> userInfoResponse = restTemplate.exchange(
                "https://discord.com/api/users/@me", HttpMethod.GET, request, Map.class
        );

        Map<String, Object> userInfo = userInfoResponse.getBody();

        // No separate email call needed; email might be null if not verified

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        return new DefaultOAuth2User(authorities, userInfo, "email");
    }


}



