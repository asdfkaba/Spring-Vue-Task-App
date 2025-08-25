package com.example.demo.user;

import com.example.demo.auth.jwt.RefreshToken;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Getter
public class CustomUserDetails implements UserDetails {

    private final User user;
    private final RefreshToken refreshToken;
    public CustomUserDetails(User user, RefreshToken refreshToken) {
        this.user = user;
        this.refreshToken = refreshToken;
    }
    public CustomUserDetails(User user) {
        this.user = user;
        this.refreshToken = null; // or Optional.empty()
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // You can customize roles/authorities here
        return Collections.emptyList();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public String getPassword() {
        return null; // OAuth login, no password needed
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
