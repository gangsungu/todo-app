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

            Todo root1 = repo.save(Todo.create("루트 1", null, 0));
            Todo root2 = repo.save(Todo.create("루트 2", null, 1));

            repo.save(Todo.create("루트1-자식 1", root1, 0));
            Todo child = repo.save(Todo.create("루트1-자식 2", root1, 1));
            repo.save(Todo.create("루트1-자식2-손자 1", child, 0));
            repo.save(Todo.create("루트2-자식 1", root2, 0));
        };
    }
}
