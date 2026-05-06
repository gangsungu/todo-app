package com.roykhan.todoapi.domain.todo.dto;

import com.roykhan.todoapi.domain.todo.TodoStatus;
import java.time.LocalDate;

public record BulkCreateTodoItem(
    String clientTempId,
    String parentClientTempId,
    String title,
    Integer sortOrder,
    TodoStatus status,
    int progress,
    LocalDate startDate,
    LocalDate endDate,
    String color,
    Integer weight
) {}
