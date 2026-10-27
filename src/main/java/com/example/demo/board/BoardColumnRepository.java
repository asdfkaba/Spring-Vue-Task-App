package com.example.demo.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, Integer> {
    Optional<BoardColumn> findByIdAndBoardUserEmail(Integer id, String email);
    List<BoardColumn> findByBoardOrderByPosition(Board board);
}
