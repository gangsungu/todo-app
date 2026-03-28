package com.roykhan.todoapi.domain.todo.controller;

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
    public List<TodoResponse> getAll() {
        return todoQueryService.getAll();
    }

    @GetMapping("/tree")
    public List<TodoTreeResponse> tree() {
        return todoQueryService.getTree();
    }

    @PatchMapping("/{id}/completed")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@PathVariable Long id, @RequestBody TodoCompletedUpdateRequest request) {
        todoQueryService.updateCompletedCascade(id, request.completed());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        todoQueryService.delete(id);
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(@RequestBody CreateTodoRequest request) {
        TodoResponse response = todoQueryService.create(request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TodoResponse> update(@PathVariable Long id, @RequestBody UpdateTodoRequest request) {
        TodoResponse response = todoQueryService.update(id, request);
        return ResponseEntity.ok(response);
    }
}