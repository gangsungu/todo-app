package com.roykhan.todoapi.domain.todo.config;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DevSeedConfig {

    @Bean
    CommandLineRunner seed(TodoRepository repo) {
        return args -> {
            if (repo.count() > 0) return;

            Todo root1 = repo.save(Todo.create("프로젝트 기획", null, 0));
            Todo root2 = repo.save(Todo.create("UI/UX 디자인", null, 1));

            repo.save(Todo.create("요구사항 수집 및 분석", root1, 0));
            Todo child = repo.save(Todo.create("개발일정 확인", root1, 1));
//            repo.save(Todo.create("루트1-자식2-손자 1", child, 0));
            repo.save(Todo.create("디자인 시스템 구축", root2, 0));
        };
    }
}
