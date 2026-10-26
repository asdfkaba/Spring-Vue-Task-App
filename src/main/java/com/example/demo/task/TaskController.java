package com.example.demo.task;

import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

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

    @GetMapping("")
    public List<Task> getTasksForUser() {
        return repository.findByUserEmail(currentUserEmail());
    }

    @GetMapping("/{id}")
    public Task getTaskById(@PathVariable("id") int id) {
        return findOwnTask(id);
    }

    @PostMapping("")
    public ResponseEntity<Task> createTask(@RequestBody Task input) {
        String email = currentUserEmail();
        LOG.info("Creating task for user '{}'", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Only take the editable fields, so a client can't set id, owner or timestamps.
        Task task = new Task();
        copyEditableFields(input, task);
        task.setUser(user);
        repository.save(task);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(task.getId())
                .toUri();
        return ResponseEntity.created(location).body(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable("id") int id, @RequestBody Task input) {
        Task task = findOwnTask(id);
        copyEditableFields(input, task);
        return repository.save(task);
    }

    @DeleteMapping("/{id}/delete")
    public void deleteTask(@PathVariable("id") int id) {
        repository.delete(findOwnTask(id));
    }

    // Tasks of other users are reported as "not found" so their ids don't leak.
    private Task findOwnTask(int id) {
        return repository.findByIdAndUserEmail(id, currentUserEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    private static void copyEditableFields(Task from, Task to) {
        to.setTitle(from.getTitle());
        to.setDescription(from.getDescription());
        to.setDue_date(from.getDue_date());
        to.setPriority(from.getPriority());
        if (from.getStatus() != null) {
            to.setStatus(from.getStatus());
        }
    }

    private static String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
