package com.roykhan.todoapi.domain.todo.config;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.TodoStatus;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DevSeedConfig {

    private static final String DEFAULT_COLOR = "#4F46E5";

    @Bean
    CommandLineRunner seed(TodoRepository repo) {
        return args -> {
            if (repo.count() > 0) return;

            LocalDate today = LocalDate.now();

            Todo root1 = repo.save(Todo.create("프로젝트 기획", null, 0,
                TodoStatus.IN_PROGRESS, 0,
                today, today.plusDays(7), DEFAULT_COLOR, null));

            Todo root2 = repo.save(Todo.create("UI/UX 디자인", null, 1,
                TodoStatus.TODO, 0,
                today.plusDays(8), today.plusDays(15), DEFAULT_COLOR, null));

            repo.save(Todo.create("요구사항 수집 및 분석", root1, 0,
                TodoStatus.COMPLETED, 100,
                today, today.plusDays(2), DEFAULT_COLOR, 50));

            repo.save(Todo.create("개발일정 확인", root1, 1,
                TodoStatus.TODO, 0,
                today.plusDays(3), today.plusDays(7), DEFAULT_COLOR, 50));

            repo.save(Todo.create("디자인 시스템 구축", root2, 0,
                TodoStatus.TODO, 0,
                today.plusDays(8), today.plusDays(15), DEFAULT_COLOR, 100));
        };
    }
}
