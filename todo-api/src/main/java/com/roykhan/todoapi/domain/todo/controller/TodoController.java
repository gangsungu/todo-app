package com.roykhan.todoapi.domain.todo.controller;

import com.roykhan.todoapi.domain.todo.dto.BulkCreateTodoItem;
import com.roykhan.todoapi.domain.todo.dto.CreateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoResponse;
import com.roykhan.todoapi.domain.todo.dto.TodoTreeResponse;
import com.roykhan.todoapi.domain.todo.dto.UpdateTodoRequest;
import com.roykhan.todoapi.domain.todo.service.TodoQueryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/todos")
@AllArgsConstructor
@Slf4j
public class TodoController {

    private final TodoQueryService todoQueryService;

    @GetMapping
    public List<TodoResponse> getAll(@AuthenticationPrincipal String email) {
        log.info("get all");
        return todoQueryService.getAll(email);
    }

    @GetMapping("/tree")
    public List<TodoTreeResponse> tree(@AuthenticationPrincipal String email) {
        log.info("get tree");
        return todoQueryService.getTree(email);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal String email, @PathVariable Long id) {
        todoQueryService.delete(email, id);
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(@AuthenticationPrincipal String email,
                                               @Valid @RequestBody CreateTodoRequest request) {
        return ResponseEntity.ok(todoQueryService.create(email, request));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<TodoResponse>> bulkCreate(@AuthenticationPrincipal String email,
                                                         @Valid @Size(max = 50) @RequestBody List<BulkCreateTodoItem> items) {
        return ResponseEntity.ok(todoQueryService.bulkCreate(email, items));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TodoResponse> update(@AuthenticationPrincipal String email,
                                               @PathVariable Long id,
                                               @Valid @RequestBody UpdateTodoRequest request) {
        log.info("update {}", id);
        return ResponseEntity.ok(todoQueryService.update(email, id, request));
    }
}
