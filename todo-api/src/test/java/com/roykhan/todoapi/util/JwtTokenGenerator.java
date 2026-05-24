package com.roykhan.todoapi.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;

/**
 * K6 로드 테스트용 장기 JWT 토큰 생성 유틸리티.
 * 사용법: ./gradlew generateTestToken --args="<jwt-secret> <email> <expiration-hours>"
 */
public class JwtTokenGenerator {

    public static void main(String[] args) {
        String secret = args.length > 0 ? args[0] : "test-secret-key-minimum-32-bytes-long-padding";
        String email  = args.length > 1 ? args[1] : "loadtest@example.com";
        long hours    = args.length > 2 ? Long.parseLong(args[2]) : 24;

        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        String token = Jwts.builder()
            .subject(email)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + hours * 3600_000L))
            .signWith(key)
            .compact();

        System.out.println(token);
    }
}
