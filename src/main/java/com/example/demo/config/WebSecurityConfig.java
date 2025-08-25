package com.example.demo.config;


import com.example.demo.user.CustomUserDetailsService;
import com.example.demo.auth.jwt.TokenService;
import com.example.demo.user.UserRepository;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.Authentication;


import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.util.Optional;
import java.util.Arrays;
import java.io.IOException;


@Configuration
@EnableWebSecurity
public class WebSecurityConfig {

    private final RsaKeyProperties rsaKeys;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final TokenService tokenService;


    public WebSecurityConfig(RsaKeyProperties rsaKeys, CustomUserDetailsService userDetailsService, UserRepository userRepository, @Lazy TokenService tokenService) {
        this.rsaKeys = rsaKeys;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }


    public class JwtCookieAuthenticationFilter extends OncePerRequestFilter {

        private final TokenService tokenService;

        public JwtCookieAuthenticationFilter(TokenService tokenService) {
            this.tokenService = tokenService;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain filterChain) throws ServletException, IOException {

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                Cookie[] cookies = request.getCookies();
                if (cookies != null) {
                    Optional<String> accessTokenOpt = Arrays.stream(cookies)
                            .filter(cookie -> "access_token".equals(cookie.getName()))
                            .map(Cookie::getValue)
                            .findFirst();

                    Optional<String> refreshTokenOpt = Arrays.stream(cookies)
                            .filter(cookie -> "refresh_token".equals(cookie.getName()))
                            .map(Cookie::getValue)
                            .findFirst();

                    if (accessTokenOpt.isPresent()) {
                        try {
                            Authentication authentication = tokenService.parseToken(accessTokenOpt.get());
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        } catch (Exception e) {
                            System.out.println("Invalid Access Token: generate new one if Refresh Token is present and valid");
                            if (refreshTokenOpt.isPresent()) {
                                try {
                                    String refreshToken = refreshTokenOpt.get();
                                    boolean valid = tokenService.isRefreshTokenValid(refreshToken);
                                    if (tokenService.isRefreshTokenValid(refreshToken)) {
                                        String newAccessToken = tokenService.generateAccessTokenFromRefresh(refreshToken);

                                        ResponseCookie newAccessCookie = ResponseCookie.from("access_token", newAccessToken)
                                                .httpOnly(true)
                                                .secure(true)
                                                .path("/")
                                                .sameSite("Strict")
                                                .maxAge(tokenService.getAccessTokenExpirySeconds())
                                                .build();
                                        response.setHeader(HttpHeaders.SET_COOKIE, newAccessCookie.toString());
                                        Authentication authentication = tokenService.parseToken(newAccessToken);
                                        SecurityContextHolder.getContext().setAuthentication(authentication);
                                    }
                                } catch (Exception ignored) {
                                }

                            }
                        }
                    }
                }
            }
            filterChain.doFilter(request, response);
        }
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/login**", "/auth/**", "/error").permitAll()
                        .anyRequest().authenticated()            // Require auth for everything else, including /token
                ).addFilterBefore(new JwtCookieAuthenticationFilter(tokenService), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }



    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withPublicKey(rsaKeys.publicKey()).build();
    }

    @Bean
    JwtEncoder jwtEncoder() {
        JWK jwk = new RSAKey.Builder(rsaKeys.publicKey()).privateKey(rsaKeys.privateKey()).build();
        JWKSource<SecurityContext> jwks = new ImmutableJWKSet<>(new JWKSet(jwk));
        return new NimbusJwtEncoder(jwks);
    }



}

