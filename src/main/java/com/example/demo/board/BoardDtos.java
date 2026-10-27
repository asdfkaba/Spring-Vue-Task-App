package com.example.demo.board;

import com.example.demo.task.TaskDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

public final class BoardDtos {
    private BoardDtos() {
    }

    public record BoardSummary(Integer id, String name) {
        static BoardSummary from(Board board) {
            return new BoardSummary(board.getId(), board.getName());
        }
    }

    // Columns are sorted by position, tasks by column position and then by their own position.
    public record BoardDetail(Integer id, String name, List<ColumnDto> columns, List<TaskDto> tasks) {
    }

    public record ColumnDto(Integer id, String name, String color, int position) {
        static ColumnDto from(BoardColumn column) {
            return new ColumnDto(column.getId(), column.getName(), column.getColor(), column.getPosition());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NewBoardRequest(String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NewColumnRequest(String name, String color) {
    }

    /**
     * Changes for PATCH /columns/{id}. Absent fields stay unchanged.
     * colorSet tells "color": null (remove the color) apart from a missing "color".
     */
    public record ColumnPatch(String name, boolean colorSet, String color, Integer position) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MoveTaskRequest(Integer columnId, Integer position) {
    }
}
