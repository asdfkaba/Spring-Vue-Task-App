package com.example.demo.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The first deploy with Flyway: production already has the schema (made by ddl-auto) and data,
 * but no Flyway history. Flyway must mark V1 as baseline instead of running it, keep the data,
 * and Hibernate's validation must accept the schema.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers(disabledWithoutDocker = true)
class ProductionBaselineMigrationTests {

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = PostgresTestDatabase.register("production", registry);
        // Production before this change: the V1 schema with data, no flyway_schema_history.
        PostgresTestDatabase.execute(url, PostgresTestDatabase.resource("/db/migration/V1__baseline.sql"));
        PostgresTestDatabase.execute(url, """
                insert into "user" (email, name) values ('moritz@example.com', 'Moritz');
                insert into board (name, slug, user_id) values ('Bewerbungen', 'bewerbungen', 1);
                insert into board_column (name, color, position, board_id) values ('Abgeschickt', '#3b82f6', 0, 1);
                insert into task (title, position, board_column_id, user_id, priority, status) values ('Old task', 0, 1, 1, 2, 'TODO');
                """);
    }

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void v1IsMarkedAsBaselineNotRun() {
        Map<String, Object> first = jdbc.queryForMap(
                "select version, type, success from flyway_schema_history order by installed_rank limit 1");
        assertThat(first).containsEntry("version", "1").containsEntry("type", "BASELINE").containsEntry("success", true);
        assertThat(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where type = 'SQL' and version = '1'", Integer.class)).isZero();
    }

    @Test
    void laterMigrationsRunAfterTheBaseline() {
        assertThat(jdbc.queryForList(
                "select version from flyway_schema_history where type = 'SQL' and success order by installed_rank",
                String.class)).contains("2");
    }

    @Test
    void unusedColumnsAreGone() {
        assertThat(columnsOf("task")).doesNotContain("priority", "status").contains("title", "description");
        assertThat(columnsOf("refresh_token")).doesNotContain("expiry_date", "user_email").contains("expires_at");
    }

    private java.util.List<String> columnsOf(String table) {
        return jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = ?", String.class, table);
    }

    @Test
    void existingDataIsKept() {
        assertThat(jdbc.queryForObject("select title from task", String.class)).isEqualTo("Old task");
        assertThat(jdbc.queryForObject("select slug from board", String.class)).isEqualTo("bewerbungen");
    }
}
