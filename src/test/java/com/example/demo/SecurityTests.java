package com.example.demo;

import com.example.demo.auth.jwt.TokenService;
import com.example.demo.config.RsaKeyProperties;
import com.example.demo.config.WebSecurityConfig;
import com.example.demo.task.TaskController;
import com.example.demo.task.TaskRepository;
import com.example.demo.user.CustomUserDetailsService;
import com.example.demo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@Import({WebSecurityConfig.class, SecurityTests.TestKeys.class})
class SecurityTests {

    // Throwaway key pair used by the security config under test.
    @TestConfiguration
    static class TestKeys {
        @Bean
        @Primary
        RsaKeyProperties rsaKeyProperties() throws Exception {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair pair = generator.generateKeyPair();
            return new RsaKeyProperties((RSAPublicKey) pair.getPublic(), (RSAPrivateKey) pair.getPrivate());
        }
    }

    @Autowired
    MockMvc mockMvc;

    @MockBean
    TaskRepository taskRepository;

    @MockBean
    UserRepository userRepository;

    @MockBean
    CustomUserDetailsService userDetailsService;

    @MockBean
    TokenService tokenService;

    @Test
    void ohneLoginKeinZugriff() throws Exception {
        mockMvc.perform(get("/tasks"))
                .andExpect(status().is4xxClientError());
    }
}
