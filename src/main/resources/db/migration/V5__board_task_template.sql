-- Default description for new tasks of a board (Markdown). Null means none.
ALTER TABLE board ADD COLUMN task_template text;
