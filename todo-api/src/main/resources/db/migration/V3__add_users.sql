CREATE TABLE users (
    id            BIGINT          NOT NULL AUTO_INCREMENT,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    name          VARCHAR(100)    NOT NULL,
    profile_image VARCHAR(500),
    provider      VARCHAR(50)     NOT NULL,  -- 'google'
    refresh_token VARCHAR(500),
    created_at    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
);