package com.example.demo.task;

import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name="task")
@Data
@NoArgsConstructor
public class Task {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    Integer id;
    String title;
    LocalDateTime due_date;
    LocalDateTime created;
    LocalDateTime edited;

    String description;
    Integer priority;
    String status = "TODO";

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


    @PrePersist
    protected void onCreate() {
        this.created = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        this.edited = LocalDateTime.now();
    }
}
package com.example.demo.task;

import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name="task")
@Data
@NoArgsConstructor
public class Task {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    Integer id;
    String title;
    LocalDateTime due_date;
    LocalDateTime created;
    LocalDateTime edited;

    String description;
    Integer priority;
    String status = "TODO";

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


    @PrePersist
    protected void onCreate() {
        this.created = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        this.edited = LocalDateTime.now();
    }
}
package com.example.demo.task;

import com.example.demo.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name="task")
@Data
@NoArgsConstructor
public class Task {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    Integer id;
    String title;
    LocalDateTime due_date;
    LocalDateTime created;
    LocalDateTime edited;

    String description;
    Integer priority;
    String status = "TODO";

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


    @PrePersist
    protected void onCreate() {
        this.created = LocalDateTime.now();
    }
    @PreUpdate
    protected void onUpdate() {
        this.edited = LocalDateTime.now();
    }
}
