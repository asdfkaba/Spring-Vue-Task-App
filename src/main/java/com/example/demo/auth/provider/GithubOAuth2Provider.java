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

@Component("github")
public class GithubOAuth2Provider extends AbstractOAuthProvider {

    public GithubOAuth2Provider(
            @Value("${spring.security.oauth2.client.provider.github.token-endpoint}") String tokenEndpoint,
            @Value("${spring.security.oauth2.client.registration.github.client-id}") String clientId,
            @Value("${spring.security.oauth2.client.registration.github.client-secret}") String clientSecret,
            @Value("${spring.security.oauth2.client.registration.github.redirect-uri}") String redirectUri,
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
                "https://api.github.com/user", HttpMethod.GET, request, Map.class
        );

        Map<String, Object> userInfo = userInfoResponse.getBody();

        // Optional: fetch email if null
        if (userInfo.get("email") == null) {
            ResponseEntity<List> emailsResponse = restTemplate.exchange(
                    "https://api.github.com/user/emails", HttpMethod.GET, request, List.class
            );
            List<Map<String, Object>> emails = emailsResponse.getBody();
            userInfo.put("email", emails.stream()
                    .filter(e -> Boolean.TRUE.equals(e.get("primary")))
                    .map(e -> (String) e.get("email"))
                    .findFirst()
                    .orElse(null));
        }

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        return new DefaultOAuth2User(authorities, userInfo, "email");
    }

}



