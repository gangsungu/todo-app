-- K6 로드 테스트용 유저 및 기본 데이터 시드
-- 실행: mysql -h 127.0.0.1 -P 3308 -u gantodo -pgantodo1234 gantodo_db < k6/seed.sql

INSERT INTO users (email, name, profile_image, provider, created_at, updated_at)
VALUES ('loadtest@example.com', 'Load Test User', NULL, 'google', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @user_id = (SELECT id FROM users WHERE email = 'loadtest@example.com');

-- Cascade Stress 시나리오용 부모-자식 트리 (부모 1개 + 자식 10개)
INSERT INTO todos (title, completed, status, progress, start_date, end_date, color, weight, user_id, parent_id, sort_order, created_at, updated_at)
VALUES ('cascade-root', false, 'TODO', 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), NULL, NULL, @user_id, NULL, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title);

SET @root_id = (SELECT id FROM todos WHERE title = 'cascade-root' AND user_id = @user_id);

INSERT INTO todos (title, completed, status, progress, start_date, end_date, color, weight, user_id, parent_id, sort_order, created_at, updated_at)
SELECT
    CONCAT('child-', n),
    false, 'TODO', 0,
    CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    NULL, NULL,
    @user_id, @root_id, n,
    NOW(), NOW()
FROM (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) AS nums
WHERE NOT EXISTS (
    SELECT 1 FROM todos WHERE title = CONCAT('child-', n) AND parent_id = @root_id
);
