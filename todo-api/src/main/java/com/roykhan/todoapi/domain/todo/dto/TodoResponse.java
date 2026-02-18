package com.roykhan.todoapi.domain.todo.dto;

import com.roykhan.todoapi.domain.todo.Todo;
import java.time.LocalDateTime;

public record TodoResponse(
    Long id,
    String title,
    boolean completed,
    Long parentId,
    int sortOrder,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static TodoResponse from(Todo todo) {
        return new TodoResponse(
            todo.getId(),
            todo.getTitle(),
            todo.isCompleted(),
            todo.getParent() != null ? todo.getParent().getId() : null,
            todo.getSortOrder(),
            todo.getCreatedAt(),
            todo.getUpdatedAt()
        );
    }
}
