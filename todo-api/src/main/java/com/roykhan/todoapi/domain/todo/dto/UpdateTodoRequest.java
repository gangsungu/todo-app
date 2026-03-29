package com.roykhan.todoapi.domain.todo.dto;

import com.roykhan.todoapi.domain.todo.TodoStatus;
import java.time.LocalDate;

public record UpdateTodoRequest(
    String title,
    TodoStatus status,
    int progress,
    LocalDate startDate,
    LocalDate endDate,
    String color,
    Integer weight
) {}
