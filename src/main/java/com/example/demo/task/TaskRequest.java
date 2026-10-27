package com.example.demo.task;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

// columnId is only read when creating a task. Use PATCH /tasks/{id}/move to change it.
@JsonIgnoreProperties(ignoreUnknown = true)
public record TaskRequest(
        String title,
        String description,
        LocalDateTime due_date,
        Integer priority,
        Integer columnId) {
}
