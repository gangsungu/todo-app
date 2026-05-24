-- K6 로드 테스트용 유저 시드 (tester11 ~ tester99, 89명)
-- 실행: mysql -h 127.0.0.1 -P 3308 -u gantodo -pgantodo1234 gantodo_db < k6/seed.sql

INSERT INTO users (email, name, profile_image, provider, created_at, updated_at)
SELECT
    CONCAT('tester', n, '@example.com'),
    CONCAT('테스터', n),
    NULL, 'google', NOW(), NOW()
FROM (
    SELECT a.n + b.n * 10 AS n
    FROM
        (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
        (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    WHERE a.n + b.n * 10 BETWEEN 11 AND 99
) nums
ON DUPLICATE KEY UPDATE name = VALUES(name);
