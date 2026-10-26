package com.example.demo;

import com.example.demo.auth.jwt.TokenService;
import com.example.demo.config.WebSecurityConfig;
import com.example.demo.task.Task;
import com.example.demo.task.TaskController;
import com.example.demo.task.TaskRepository;
import com.example.demo.user.CustomUserDetailsService;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@Import({WebSecurityConfig.class, TestRsaKeys.class})
@WithMockUser(username = TaskControllerTests.ALICE)
class TaskControllerTests {

    static final String ALICE = "alice@example.com";

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

    private Task aliceTask() {
        User alice = new User("Alice", ALICE, null);
        Task task = new Task("Old title", LocalDateTime.of(2026, 10, 27, 12, 0), null, "Old description", 1);
        task.setId(1);
        task.setCreated(LocalDateTime.of(2026, 10, 1, 9, 0));
        task.setUser(alice);
        return task;
    }

    @Test
    void updateChangesOwnTaskAndKeepsCreated() throws Exception {
        when(taskRepository.findByIdAndUserEmail(1, ALICE)).thenReturn(Optional.of(aliceTask()));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"New title","description":"New description",
                                 "due_date":"2026-11-02T09:30:00","priority":3,"status":"DONE",
                                 "created":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"));

        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(saved.capture());
        assertThat(saved.getValue().getDue_date()).isEqualTo(LocalDateTime.of(2026, 11, 2, 9, 30));
        assertThat(saved.getValue().getStatus()).isEqualTo("DONE");
        assertThat(saved.getValue().getPriority()).isEqualTo(3);
        assertThat(saved.getValue().getCreated()).isEqualTo(LocalDateTime.of(2026, 10, 1, 9, 0));
        assertThat(saved.getValue().getUser().getEmail()).isEqualTo(ALICE);
    }

    // The frontend sends due_date back in the array format it received from GET.
    @Test
    void updateAcceptsDateInArrayFormat() throws Exception {
        when(taskRepository.findByIdAndUserEmail(1, ALICE)).thenReturn(Optional.of(aliceTask()));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"T\",\"due_date\":[2026,11,4,10,0,0,0],\"status\":\"DONE\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(saved.capture());
        assertThat(saved.getValue().getDue_date()).isEqualTo(LocalDateTime.of(2026, 11, 4, 10, 0));
    }

    @Test
    void cannotUpdateTaskOfOtherUser() throws Exception {
        when(taskRepository.findByIdAndUserEmail(2, ALICE)).thenReturn(Optional.empty());

        mockMvc.perform(put("/tasks/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hijacked\"}"))
                .andExpect(status().isNotFound());

        verify(taskRepository, never()).save(any());
    }

    @Test
    void cannotDeleteTaskOfOtherUser() throws Exception {
        when(taskRepository.findByIdAndUserEmail(2, ALICE)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/tasks/2/delete"))
                .andExpect(status().isNotFound());

        verify(taskRepository, never()).delete(any());
        verify(taskRepository, never()).deleteById(any());
    }

    @Test
    void deletesOwnTask() throws Exception {
        Task task = aliceTask();
        when(taskRepository.findByIdAndUserEmail(1, ALICE)).thenReturn(Optional.of(task));

        mockMvc.perform(delete("/tasks/1/delete"))
                .andExpect(status().isOk());

        verify(taskRepository).delete(task);
    }

    @Test
    void cannotReadTaskOfOtherUser() throws Exception {
        when(taskRepository.findByIdAndUserEmail(2, ALICE)).thenReturn(Optional.empty());

        mockMvc.perform(get("/tasks/2"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createIgnoresIdFromBodySoPostCannotOverwrite() throws Exception {
        when(userRepository.findByEmail(ALICE)).thenReturn(Optional.of(new User("Alice", ALICE, null)));

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":2,\"title\":\"New task\",\"priority\":2}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNull();
        assertThat(saved.getValue().getTitle()).isEqualTo("New task");
        assertThat(saved.getValue().getStatus()).isEqualTo("TODO");
        assertThat(saved.getValue().getUser().getEmail()).isEqualTo(ALICE);
    }
}
