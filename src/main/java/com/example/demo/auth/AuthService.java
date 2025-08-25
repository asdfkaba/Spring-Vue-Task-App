package com.example.demo.auth.service;

import com.example.demo.auth.dto.AuthRequest;
import com.example.demo.auth.dto.AuthResponse;
import com.example.demo.auth.jwt.RefreshToken;
import com.example.demo.auth.provider.OAuthProvider;
import com.example.demo.auth.jwt.TokenService;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final Map<String, OAuthProvider> oauthProviders;

    public AuthService(Map<String, OAuthProvider> oauthProviders, UserRepository userRepository, TokenService tokenService) {
        this.oauthProviders = oauthProviders;
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }

    public AuthResponse authenticateWithGoogle(AuthRequest request) {
        OAuthProvider oauthProvider = oauthProviders.get(request.getProvider());
        OAuth2User oauthUser = oauthProvider.getOAuth2User(request.getCode(), request.getCode_verifier());
        String mail = oauthUser.getAttribute("email");
        User user = userRepository.findByEmail(mail)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(mail);
                    newUser.setName(oauthUser.getName());
                    return userRepository.save(newUser);
                });

        String jwt = tokenService.generateToken(user);
        RefreshToken refreshToken = tokenService.generateRefreshToken(user);

        return new AuthResponse(jwt, refreshToken);
    }
}
