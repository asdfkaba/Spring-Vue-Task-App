package com.example.demo.task;

import com.example.demo.board.BoardColumn;
import com.example.demo.board.BoardDtos.MoveTaskRequest;
import com.example.demo.board.BoardService;
import com.example.demo.board.LabelService;
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
    static final int MAX_DESCRIPTION_LENGTH = 10_000;

    private final TaskRepository repository;
    private final UserRepository userRepository;
    private final BoardService boardService;
    private final LabelService labelService;

    public TaskController(TaskRepository repository, UserRepository userRepository, BoardService boardService,
                          LabelService labelService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.boardService = boardService;
        this.labelService = labelService;
    }

    @GetMapping("")
    public List<TaskDto> getTasksForUser() {
        return repository.findByUserEmail(currentUserEmail()).stream()
                .map(TaskDto::from)
                .toList();
    }

    @GetMapping("/{id}")
    public TaskDto getTaskById(@PathVariable("id") int id) {
        return TaskDto.from(findOwnTask(id));
    }

    @PostMapping("")
    public ResponseEntity<TaskDto> createTask(@RequestBody TaskRequest input) {
        String email = currentUserEmail();
        LOG.info("Creating task for user '{}'", email);

        if (input.columnId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "columnId is required");
        }
        BoardColumn column = boardService.findOwnColumn(input.columnId(), email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Task task = new Task();
        copyEditableFields(input, task);
        task.setUser(user);
        task.setBoardColumn(column);
        applyLabels(input, task);
        task.setPosition(repository.countByBoardColumn(column));
        repository.save(task);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(task.getId())
                .toUri();
        return ResponseEntity.created(location).body(TaskDto.from(task));
    }

    @PutMapping("/{id}")
    public TaskDto updateTask(@PathVariable("id") int id, @RequestBody TaskRequest input) {
        Task task = findOwnTask(id);
        copyEditableFields(input, task);
        applyLabels(input, task);
        return TaskDto.from(repository.save(task));
    }

    @PatchMapping("/{id}/move")
    public TaskDto moveTask(@PathVariable("id") int id, @RequestBody MoveTaskRequest input) {
        if (input.columnId() == null || input.position() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "columnId and position are required");
        }
        return TaskDto.from(boardService.moveTask(id, input.columnId(), input.position(), currentUserEmail()));
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

    // Only the editable fields are copied, so a client can't set id, owner, column or timestamps.
    private static void copyEditableFields(TaskRequest from, Task to) {
        if (from.description() != null && from.description().length() > MAX_DESCRIPTION_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "description must be at most " + MAX_DESCRIPTION_LENGTH + " characters");
        }
        to.setTitle(from.title());
        to.setDescription(from.description());
        to.setDue_date(from.due_date());
        to.setPriority(from.priority());
    }

    // Only labels of the task's own board are accepted (checked in LabelService).
    private void applyLabels(TaskRequest from, Task to) {
        if (from.labelIds() != null) {
            to.setLabels(labelService.labelsForTask(from.labelIds(), to.getBoardColumn().getBoard()));
        }
    }

    private static String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
