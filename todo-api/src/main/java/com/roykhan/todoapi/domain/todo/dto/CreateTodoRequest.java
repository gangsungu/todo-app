package com.roykhan.todoapi.domain.todo.dto;

public record CreateTodoRequest(
    String title,
    Long parentId,
    Integer sortOrder
) {}
