package com.example.demo.board;

import com.example.demo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardRepository extends JpaRepository<Board, Integer> {
    List<Board> findByUserEmailOrderById(String email);
    Optional<Board> findByIdAndUserEmail(Integer id, String email);
    boolean existsByUserAndSlug(User user, String slug);
    List<Board> findBySlugIsNullOrderById();
}
