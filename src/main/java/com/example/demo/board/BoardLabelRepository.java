package com.example.demo.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardLabelRepository extends JpaRepository<BoardLabel, Integer> {
    List<BoardLabel> findByBoardOrderById(Board board);

    Optional<BoardLabel> findByIdAndBoardUserEmail(Integer id, String email);
}
