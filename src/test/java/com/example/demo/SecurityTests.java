package com.example.demo;

import com.example.demo.task.TaskController;
import com.example.demo.task.TaskRepository;
import com.example.demo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc
class SecurityTests {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    TaskRepository taskRepository;

    @MockBean
    UserRepository userRepository;

    @Test
    void ohneLoginKeinZugriff() throws Exception {
        mockMvc.perform(get("/tasks"))
                .andExpect(status().is4xxClientError());
    }
}