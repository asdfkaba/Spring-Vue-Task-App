package com.example.demo.migration;

import com.example.demo.board.Board;
import com.example.demo.board.BoardService;
import com.example.demo.task.TaskHistoryService;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * An empty database (local, CI): Flyway runs all migrations, and Hibernate's validation
 * accepts the result. Fails if an entity changes without a matching migration.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({BoardService.class, TaskHistoryService.class})
@Testcontainers(disabledWithoutDocker = true)
class FreshDatabaseMigrationTests {

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        PostgresTestDatabase.register("fresh", registry);
    }

    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    UserRepository userRepository;
    @Autowired
    BoardService boardService;

    @Test
    void allMigrationsRunFromScratch() {
        List<String> applied = jdbc.queryForList(
                "select version from flyway_schema_history where success order by installed_rank", String.class);
        assertThat(applied).first().isEqualTo("1");
        assertThat(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where type = 'BASELINE'", Integer.class)).isZero();
    }

    @Test
    void entitiesCanBeStored() {
        Board board = boardService.createDefaultBoard(userRepository.save(new User("Alice", "alice@example.com", null)));
        assertThat(board.getId()).isNotNull();
        assertThat(boardService.getBoard(board.getId(), "alice@example.com").columns()).hasSize(3);
    }
}
