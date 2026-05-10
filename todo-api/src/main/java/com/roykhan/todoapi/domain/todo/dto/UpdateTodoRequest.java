package com.roykhan.todoapi.domain.todo.dto;

import com.roykhan.todoapi.domain.todo.TodoStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateTodoRequest(
    @NotBlank @Size(max = 200)
    String title,
    @NotNull
    TodoStatus status,
    @Min(0) @Max(100)
    int progress,
    @NotNull
    LocalDate startDate,
    @NotNull
    LocalDate endDate,
    String color,
    @Min(0) @Max(100)
    Integer weight
) {}
