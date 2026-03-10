CREATE TABLE todos(
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    title      VARCHAR(200) NOT NULL,
    completed  TINYINT(1)   NOT NULL DEFAULT 0,
    parent_id  BIGINT,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL,
    updated_at DATETIME     NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_todos_parent FOREIGN KEY (parent_id) REFERENCES todos (id) ON DELETE CASCADE,
    INDEX idx_parent_sort (parent_id, sort_order)
);