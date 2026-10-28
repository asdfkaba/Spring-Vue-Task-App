-- Columns the code no longer uses. Their data is dropped with them.
-- task.priority: priority was removed from tasks.
-- task.status: replaced by board columns.
-- refresh_token.expiry_date / user_email: replaced by expires_at / user_id.
ALTER TABLE task DROP COLUMN priority, DROP COLUMN status;
ALTER TABLE refresh_token DROP COLUMN expiry_date, DROP COLUMN user_email;
