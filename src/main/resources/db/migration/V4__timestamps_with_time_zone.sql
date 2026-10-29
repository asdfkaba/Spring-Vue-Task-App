-- Points in time the server sets get a time zone, so the browser can show them in local time.
-- The server runs in UTC, so the stored values are UTC. Due dates stay without a zone:
-- they are the wall-clock time the user picked.
ALTER TABLE task
    ALTER COLUMN created TYPE timestamp(6) with time zone USING created AT TIME ZONE 'UTC',
    ALTER COLUMN edited TYPE timestamp(6) with time zone USING edited AT TIME ZONE 'UTC';

ALTER TABLE task_event
    ALTER COLUMN at TYPE timestamp(6) with time zone USING at AT TIME ZONE 'UTC';

ALTER TABLE task_note
    ALTER COLUMN created TYPE timestamp(6) with time zone USING created AT TIME ZONE 'UTC',
    ALTER COLUMN edited TYPE timestamp(6) with time zone USING edited AT TIME ZONE 'UTC';

ALTER TABLE board_share
    ALTER COLUMN created TYPE timestamp(6) with time zone USING created AT TIME ZONE 'UTC';
