package com.example.demo.task;

import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

/** A plain-text note on a task (table task_note, see V3__task_notes.sql). */
@Entity
@Table(name = "task_note", indexes = @Index(name = "task_note_task_id", columnList = "task_id"))
@Getter
@NoArgsConstructor
public class TaskNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // The database deletes notes together with their task.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Task task;

    // Who wrote it; null if the user is gone.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, columnDefinition = "text")
    private String text;

    @Column(nullable = false)
    private Instant created;

    // Set when the text was changed after writing.
    private Instant edited;

    TaskNote(Task task, User user, String text) {
        this.task = task;
        this.user = user;
        this.text = text;
        this.created = Instant.now();
    }

    void changeText(String text) {
        this.text = text;
        this.edited = Instant.now();
    }
}
