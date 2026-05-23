package com.roykhan.todoapi.domain.todo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record WeightUpdateItem(
    @NotNull @Positive Long id,
    @NotNull @Min(0) @Max(100) Integer weight
) {}
