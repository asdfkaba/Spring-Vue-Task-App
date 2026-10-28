package com.example.demo.task;

import com.example.demo.board.BoardColumn;
import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name="task")
@Getter
@Setter
@NoArgsConstructor
public class Task {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    Integer id;
    String title;
    LocalDateTime due_date;
    LocalDateTime created;
    LocalDateTime edited;

    // Markdown, rendered by the frontend. "text" because varchar(255) is too short.
    @Column(columnDefinition = "text")
    String description;
    Integer priority;

    public Task(String title, LocalDateTime due_date, LocalDateTime created, String description, Integer priority) {
        this.title = title;
        this.due_date = due_date;
        this.created = created;
        this.description = description;
        this.priority = priority;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id")
    private User user;

    // The column is the task's status on the board.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="board_column_id")
    private BoardColumn boardColumn;

    // Order of the task within its column, starting at 0.
    @Column(nullable = false)
    private int position;

    @PrePersist
    protected void onCreate() {
        this.created = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        this.edited = LocalDateTime.now();
    }
}
