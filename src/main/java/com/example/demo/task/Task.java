package com.example.demo.task;

import com.example.demo.board.BoardColumn;
import com.example.demo.board.BoardLabel;
import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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

    public Task(String title, LocalDateTime due_date, LocalDateTime created, String description) {
        this.title = title;
        this.due_date = due_date;
        this.created = created;
        this.description = description;
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

    // Labels of the task's board. BatchSize loads them for many tasks at once when a board is shown.
    @ManyToMany
    @JoinTable(name = "task_label",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    @BatchSize(size = 100)
    private Set<BoardLabel> labels = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.created = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        this.edited = LocalDateTime.now();
    }
}
