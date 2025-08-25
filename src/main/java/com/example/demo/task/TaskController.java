package com.example.demo.task;

import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private static final Logger LOG = LoggerFactory.getLogger(TaskController.class);

    private final TaskRepository repository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository repo, UserRepository repo2) {
        this.repository = repo;
        this.userRepository = repo2;
    }
    @GetMapping("/{id}")
    public Task getTaskById(@PathVariable("id") int id) {
        Optional<Task> task = repository.findById(id);
        if (task.isPresent()) {
            return task.get();
        }
        throw new ResponseStatusException(HttpStatusCode.valueOf(404), "not found");
    }
    @PostMapping("")
    public ResponseEntity<Task> createTask(@RequestBody Task task) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        LOG.info("Creating task for user '{}'", username);

        Optional<User> userOpt = userRepository.findByEmail(username);
        if (userOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }


        task.setUser(userOpt.get());
        repository.save(task);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(task.getId())
                .toUri();
        return ResponseEntity.created(location).body(task);
    }
    @DeleteMapping("/{id}/delete")
    public void deleteTask(@PathVariable("id") int id) {
        repository.deleteById(id);
    }

    @GetMapping("")
    public List<Task> getTasksForUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        return repository.findByUserEmail(username);
    }
}
