package com.roykhan.todoapi.domain.todo.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class TodoTreeResponse {

    private final long id;
    private final String title;
    private final boolean description;
    private final int sortOrder;
    private final List<TodoTreeResponse> children = new ArrayList<>();

    public void addChild(TodoTreeResponse child) {
        children.add(child);
    }
}
