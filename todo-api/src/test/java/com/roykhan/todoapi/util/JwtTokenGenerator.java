package com.roykhan.todoapi.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;

/**
 * K6 로드 테스트용 JWT 토큰 생성 유틸리티.
 *
 * 단건: ./gradlew generateTestToken --args="<secret> <email> <hours>"
 * 배치: ./gradlew generateTestTokens --args="<secret> <start> <end> <hours>"
 *       → k6/tokens.json 으로 리다이렉트하여 사용
 *       예) ./gradlew generateTestTokens --args="mysecret 11 99 24" > k6/tokens.json
 */
public class JwtTokenGenerator {

    public static void main(String[] args) {
        if (args.length >= 3 && isNumber(args[1]) && isNumber(args[2])) {
            // 배치 모드: <secret> <start> <end> [hours]
            String secret = args[0];
            int start     = Integer.parseInt(args[1]);
            int end       = Integer.parseInt(args[2]);
            long hours    = args.length > 3 ? Long.parseLong(args[3]) : 24;

            SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            System.out.print("[");
            for (int n = start; n <= end; n++) {
                String email = "tester" + n + "@example.com";
                System.out.print("\"" + createToken(key, email, hours) + "\"");
                if (n < end) System.out.print(",");
            }
            System.out.println("]");
        } else {
            // 단건 모드: <secret> <email> [hours]
            String secret = args.length > 0 ? args[0] : "test-secret-key-minimum-32-bytes-long-padding";
            String email  = args.length > 1 ? args[1] : "tester11@example.com";
            long hours    = args.length > 2 ? Long.parseLong(args[2]) : 24;

            SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            System.out.println(createToken(key, email, hours));
        }
    }

    private static String createToken(SecretKey key, String email, long hours) {
        Date now = new Date();
        return Jwts.builder()
            .subject(email)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + hours * 3600_000L))
            .signWith(key)
            .compact();
    }

    private static boolean isNumber(String s) {
        try { Integer.parseInt(s); return true; }
        catch (NumberFormatException e) { return false; }
    }
}
