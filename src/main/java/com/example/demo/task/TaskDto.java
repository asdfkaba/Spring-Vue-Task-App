package com.example.demo.task;

import java.time.LocalDateTime;

public record TaskDto(
        Integer id,
        String title,
        String description,
        LocalDateTime due_date,
        Integer priority,
        LocalDateTime created,
        LocalDateTime edited,
        Integer columnId,
        int position) {

    public static TaskDto from(Task task) {
        return new TaskDto(task.getId(), task.getTitle(), task.getDescription(), task.getDue_date(),
                task.getPriority(), task.getCreated(), task.getEdited(),
                task.getBoardColumn().getId(), task.getPosition());
    }
}
