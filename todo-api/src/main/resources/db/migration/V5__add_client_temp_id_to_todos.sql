ALTER TABLE todos ADD COLUMN client_temp_id VARCHAR(36) NULL;
ALTER TABLE todos ADD CONSTRAINT uq_todos_user_client_temp_id UNIQUE (user_id, client_temp_id);
