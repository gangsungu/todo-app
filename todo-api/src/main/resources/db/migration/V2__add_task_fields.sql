ALTER TABLE todos
    ADD COLUMN status     VARCHAR(20) NOT NULL DEFAULT 'TODO',
    ADD COLUMN progress   INT         NOT NULL DEFAULT 0,
    ADD COLUMN start_date DATE,
    ADD COLUMN end_date   DATE,
    ADD COLUMN color      VARCHAR(20),
    ADD COLUMN weight     INT;
