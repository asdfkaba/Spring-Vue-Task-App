package com.example.demo.task;

import com.example.demo.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Notes on tasks. Only the owner of a task sees and changes its notes; notes of other users'
 * tasks are reported as "not found". Shared boards don't include notes.
 */
@Service
public class TaskNoteService {

    static final int MAX_LENGTH = 5_000;

    private final TaskNoteRepository noteRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskNoteService(TaskNoteRepository noteRepository, TaskRepository taskRepository,
                           UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public record NoteDto(Integer id, String text, String user, LocalDateTime created, LocalDateTime edited) {
        static NoteDto from(TaskNote note) {
            return new NoteDto(note.getId(), note.getText(), note.getUser() == null ? null : note.getUser().getName(),
                    note.getCreated(), note.getEdited());
        }
    }

    @Transactional(readOnly = true)
    public List<NoteDto> notesOf(int taskId, String email) {
        return noteRepository.findByTaskOrderByCreatedDescIdDesc(findOwnTask(taskId, email)).stream()
                .map(NoteDto::from)
                .toList();
    }

    @Transactional
    public NoteDto addNote(int taskId, String email, String text) {
        Task task = findOwnTask(taskId, email);
        TaskNote note = new TaskNote(task, userRepository.findByEmail(email).orElse(null), validText(text));
        return NoteDto.from(noteRepository.save(note));
    }

    @Transactional
    public NoteDto updateNote(int noteId, String email, String text) {
        TaskNote note = findOwnNote(noteId, email);
        String valid = validText(text);
        if (!valid.equals(note.getText())) {
            note.changeText(valid);
        }
        return NoteDto.from(note);
    }

    @Transactional
    public void deleteNote(int noteId, String email) {
        noteRepository.delete(findOwnNote(noteId, email));
    }

    private Task findOwnTask(int taskId, String email) {
        return taskRepository.findByIdAndUserEmail(taskId, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    private TaskNote findOwnNote(int noteId, String email) {
        return noteRepository.findByIdAndTaskUserEmail(noteId, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));
    }

    // Trimmed at the ends only, so line breaks inside stay.
    private static String validText(String text) {
        String trimmed = text == null ? "" : text.strip();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note must not be empty");
        }
        if (trimmed.length() > MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Note must be at most " + MAX_LENGTH + " characters");
        }
        return trimmed;
    }
}
