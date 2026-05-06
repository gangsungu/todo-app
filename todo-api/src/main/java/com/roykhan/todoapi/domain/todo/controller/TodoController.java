package com.roykhan.todoapi.domain.todo.controller;

import com.roykhan.todoapi.domain.todo.dto.BulkCreateTodoItem;
import com.roykhan.todoapi.domain.todo.dto.CreateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoCompletedUpdateRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoResponse;
import com.roykhan.todoapi.domain.todo.dto.TodoTreeResponse;
import com.roykhan.todoapi.domain.todo.dto.UpdateTodoRequest;
import com.roykhan.todoapi.domain.todo.service.TodoQueryService;
import java.util.List;
import lombok.AllArgsConstructor;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/todos")
@AllArgsConstructor
public class TodoController {

    private final TodoQueryService todoQueryService;

    @GetMapping
    public List<TodoResponse> getAll(@AuthenticationPrincipal String email) {
        return todoQueryService.getAll(email);
    }

    @GetMapping("/tree")
    public List<TodoTreeResponse> tree(@AuthenticationPrincipal String email) {
        return todoQueryService.getTree(email);
    }

    @PatchMapping("/{id}/completed")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@AuthenticationPrincipal String email,
                         @PathVariable Long id,
                         @RequestBody TodoCompletedUpdateRequest request) {
        todoQueryService.updateCompletedCascade(email, id, request.completed());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal String email, @PathVariable Long id) {
        todoQueryService.delete(email, id);
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(@AuthenticationPrincipal String email,
                                               @RequestBody CreateTodoRequest request) {
        return ResponseEntity.ok(todoQueryService.create(email, request));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<TodoResponse>> bulkCreate(@AuthenticationPrincipal String email,
                                                         @RequestBody List<BulkCreateTodoItem> items) {
        return ResponseEntity.ok(todoQueryService.bulkCreate(email, items));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TodoResponse> update(@AuthenticationPrincipal String email,
                                               @PathVariable Long id,
                                               @RequestBody UpdateTodoRequest request) {
        return ResponseEntity.ok(todoQueryService.update(email, id, request));
    }
}
