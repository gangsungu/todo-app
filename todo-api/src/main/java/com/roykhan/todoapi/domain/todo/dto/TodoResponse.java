package com.roykhan.todoapi.domain.todo.dto;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.TodoStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TodoResponse(
    Long id,
    String title,
    boolean completed,
    TodoStatus status,
    int progress,
    LocalDate startDate,
    LocalDate endDate,
    String color,
    Integer weight,
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
            todo.getStatus(),
            todo.getProgress(),
            todo.getStartDate(),
            todo.getEndDate(),
            todo.getColor(),
            todo.getWeight(),
            todo.getParent() != null ? todo.getParent().getId() : null,
            todo.getSortOrder(),
            todo.getCreatedAt(),
            todo.getUpdatedAt()
        );
    }
}
