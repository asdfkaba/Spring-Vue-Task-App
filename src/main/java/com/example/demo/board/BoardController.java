package com.example.demo.board;

import com.example.demo.board.BoardDtos.BoardDetail;
import com.example.demo.board.BoardDtos.BoardSummary;
import com.example.demo.board.BoardDtos.ColumnDto;
import com.example.demo.board.BoardDtos.ColumnPatch;
import com.example.demo.board.BoardDtos.NewColumnRequest;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/boards")
    public List<BoardSummary> getBoards() {
        return boardService.boardsOf(currentUserEmail()).stream()
                .map(BoardSummary::from)
                .toList();
    }

    @GetMapping("/boards/{id}")
    public BoardDetail getBoard(@PathVariable("id") int id) {
        return boardService.getBoard(id, currentUserEmail());
    }

    @PostMapping("/boards/{id}/columns")
    @ResponseStatus(HttpStatus.CREATED)
    public ColumnDto addColumn(@PathVariable("id") int boardId, @RequestBody NewColumnRequest request) {
        return ColumnDto.from(boardService.addColumn(boardId, currentUserEmail(), request.name(), request.color()));
    }

    // Read as a JSON object so that "color": null (remove the color) differs from no "color" at all.
    @PatchMapping("/columns/{id}")
    public ColumnDto updateColumn(@PathVariable("id") int columnId, @RequestBody JsonNode body) {
        return ColumnDto.from(boardService.updateColumn(columnId, currentUserEmail(), toColumnPatch(body)));
    }

    @DeleteMapping("/columns/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteColumn(@PathVariable("id") int columnId,
                             @RequestParam(name = "moveTo", required = false) Integer moveTo,
                             @RequestParam(name = "deleteTasks", defaultValue = "false") boolean deleteTasks) {
        boardService.deleteColumn(columnId, currentUserEmail(), moveTo, deleteTasks);
    }

    private static ColumnPatch toColumnPatch(JsonNode body) {
        if (!body.isObject()) {
            throw badRequest("Body must be a JSON object");
        }
        JsonNode name = body.get("name");
        if (name != null && !name.isTextual()) {
            throw badRequest("name must be a string");
        }
        JsonNode color = body.get("color");
        if (color != null && !color.isTextual() && !color.isNull()) {
            throw badRequest("color must be a string or null");
        }
        JsonNode position = body.get("position");
        if (position != null && !position.isInt()) {
            throw badRequest("position must be an integer");
        }
        return new ColumnPatch(
                name == null ? null : name.asText(),
                color != null,
                color == null || color.isNull() ? null : color.asText(),
                position == null ? null : position.asInt());
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
