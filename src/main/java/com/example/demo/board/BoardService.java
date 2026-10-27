package com.example.demo.board;

import com.example.demo.board.BoardDtos.BoardDetail;
import com.example.demo.board.BoardDtos.ColumnDto;
import com.example.demo.board.BoardDtos.ColumnPatch;
import com.example.demo.task.Task;
import com.example.demo.task.TaskDto;
import com.example.demo.task.TaskRepository;
import com.example.demo.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Boards, their columns and the order of tasks within them.
 * Everything is looked up by the owner's email, so objects of other users are reported as "not found".
 */
@Service
public class BoardService {

    private record DefaultColumn(String name, String color) {
    }

    static final String DEFAULT_BOARD_NAME = "My board";
    private static final List<DefaultColumn> DEFAULT_COLUMNS = List.of(
            new DefaultColumn("To do", "#64748b"),
            new DefaultColumn("In progress", "#3b82f6"),
            new DefaultColumn("Done", "#22c55e"));
    static final int MAX_COLUMN_NAME_LENGTH = 50;
    private static final Pattern HEX_COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;

    public BoardService(BoardRepository boardRepository, BoardColumnRepository columnRepository,
                        TaskRepository taskRepository) {
        this.boardRepository = boardRepository;
        this.columnRepository = columnRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Board createDefaultBoard(User user) {
        Board board = boardRepository.save(new Board(DEFAULT_BOARD_NAME, user));
        for (int i = 0; i < DEFAULT_COLUMNS.size(); i++) {
            DefaultColumn template = DEFAULT_COLUMNS.get(i);
            columnRepository.save(new BoardColumn(template.name(), template.color(), i, board));
        }
        return board;
    }

    @Transactional(readOnly = true)
    public List<Board> boardsOf(String email) {
        return boardRepository.findByUserEmailOrderById(email);
    }

    @Transactional(readOnly = true)
    public BoardDetail getBoard(int boardId, String email) {
        Board board = findOwnBoard(boardId, email);
        List<ColumnDto> columns = columnRepository.findByBoardOrderByPosition(board).stream()
                .map(ColumnDto::from)
                .toList();
        List<TaskDto> tasks = taskRepository.findByBoardInOrder(board).stream()
                .map(TaskDto::from)
                .toList();
        return new BoardDetail(board.getId(), board.getName(), columns, tasks);
    }

    @Transactional
    public BoardColumn addColumn(int boardId, String email, String name, String color) {
        Board board = findOwnBoard(boardId, email);
        int position = columnRepository.findByBoardOrderByPosition(board).size();
        return columnRepository.save(new BoardColumn(validColumnName(name), validColor(color), position, board));
    }

    /**
     * Applies the given changes. A new position moves the column there and shifts the columns
     * in between; a position beyond the end puts the column last.
     */
    @Transactional
    public BoardColumn updateColumn(int columnId, String email, ColumnPatch patch) {
        BoardColumn column = findOwnColumn(columnId, email);
        if (patch.name() != null) {
            column.setName(validColumnName(patch.name()));
        }
        if (patch.colorSet()) {
            column.setColor(validColor(patch.color()));
        }
        if (patch.position() != null) {
            List<BoardColumn> columns = new ArrayList<>(columnRepository.findByBoardOrderByPosition(column.getBoard()));
            columns.removeIf(c -> c.getId().equals(column.getId()));
            columns.add(Math.max(0, Math.min(patch.position(), columns.size())), column);
            for (int i = 0; i < columns.size(); i++) {
                columns.get(i).setPosition(i);
            }
        }
        return column;
    }

    /**
     * Deletes a column. A column that still has tasks needs an explicit choice:
     * move them to another column of the same board ({@code moveTo}) or delete them ({@code deleteTasks}).
     */
    @Transactional
    public void deleteColumn(int columnId, String email, Integer moveTo, boolean deleteTasks) {
        BoardColumn column = findOwnColumn(columnId, email);
        if (moveTo != null && deleteTasks) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use either moveTo or deleteTasks, not both");
        }

        List<BoardColumn> columns = new ArrayList<>(columnRepository.findByBoardOrderByPosition(column.getBoard()));
        if (columns.size() == 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The last column of a board cannot be deleted");
        }

        BoardColumn target = moveTo == null ? null : findOwnColumn(moveTo, email);
        if (target != null) {
            requireSameBoard(column, target);
            if (target.getId().equals(column.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot move tasks into the deleted column");
            }
        }

        List<Task> tasks = taskRepository.findByBoardColumnOrderByPosition(column);
        if (!tasks.isEmpty()) {
            if (target != null) {
                // Keep the order and append the tasks after the ones already in the target.
                int next = taskRepository.countByBoardColumn(target);
                for (Task task : tasks) {
                    task.setBoardColumn(target);
                    task.setPosition(next++);
                }
            } else if (deleteTasks) {
                taskRepository.deleteAll(tasks);
            } else {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Column is not empty: pass moveTo or deleteTasks=true");
            }
        }

        columns.removeIf(c -> c.getId().equals(column.getId()));
        columnRepository.delete(column);
        for (int i = 0; i < columns.size(); i++) {
            columns.get(i).setPosition(i);
        }
    }

    /**
     * Moves a task to {@code position} within a column of the same board.
     * A position beyond the end of the column puts the task last.
     */
    @Transactional
    public Task moveTask(int taskId, int columnId, int position, String email) {
        Task task = taskRepository.findByIdAndUserEmail(taskId, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        BoardColumn source = task.getBoardColumn();
        BoardColumn target = findOwnColumn(columnId, email);
        requireSameBoard(source, target);

        List<Task> sourceTasks = new ArrayList<>(taskRepository.findByBoardColumnOrderByPosition(source));
        sourceTasks.removeIf(t -> t.getId().equals(task.getId()));

        boolean sameColumn = source.getId().equals(target.getId());
        List<Task> targetTasks = sameColumn
                ? sourceTasks
                : new ArrayList<>(taskRepository.findByBoardColumnOrderByPosition(target));

        int index = Math.max(0, Math.min(position, targetTasks.size()));
        targetTasks.add(index, task);
        task.setBoardColumn(target);

        renumber(sourceTasks);
        if (!sameColumn) {
            renumber(targetTasks);
        }
        return task;
    }

    public BoardColumn findOwnColumn(int columnId, String email) {
        return columnRepository.findByIdAndBoardUserEmail(columnId, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Column not found"));
    }

    private Board findOwnBoard(int boardId, String email) {
        return boardRepository.findByIdAndUserEmail(boardId, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
    }

    private static void requireSameBoard(BoardColumn a, BoardColumn b) {
        if (!Objects.equals(a.getBoard().getId(), b.getBoard().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Columns belong to different boards");
        }
    }

    private static void renumber(List<Task> tasks) {
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setPosition(i);
        }
    }

    // Stored in lower case so the frontend can compare colors directly.
    private static String validColor(String color) {
        if (color == null) {
            return null;
        }
        if (!HEX_COLOR.matcher(color).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Color must look like #rrggbb");
        }
        return color.toLowerCase();
    }

    private static String validColumnName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Column name must not be empty");
        }
        if (trimmed.length() > MAX_COLUMN_NAME_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Column name must be at most " + MAX_COLUMN_NAME_LENGTH + " characters");
        }
        return trimmed;
    }
}
