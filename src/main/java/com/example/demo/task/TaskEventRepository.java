package com.example.demo.task;

import com.example.demo.board.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskEventRepository extends JpaRepository<TaskEvent, Integer> {
    // Newest first; id breaks ties between events in the same instant.
    List<TaskEvent> findByTaskIdOrderByAtDescIdDesc(Integer taskId);

    @Modifying
    @Query("delete from TaskEvent e where e.board = :board")
    void deleteByBoard(Board board);
}
