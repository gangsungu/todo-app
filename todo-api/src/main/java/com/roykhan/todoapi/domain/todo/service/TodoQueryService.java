package com.roykhan.todoapi.domain.todo.service;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.dto.BulkCreateTodoItem;
import com.roykhan.todoapi.domain.todo.dto.CreateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoResponse;
import com.roykhan.todoapi.domain.todo.dto.TodoTreeResponse;
import com.roykhan.todoapi.domain.todo.dto.UpdateTodoRequest;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import com.roykhan.todoapi.domain.user.User;
import com.roykhan.todoapi.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@AllArgsConstructor
public class TodoQueryService {

    private final TodoRepository todoRepository;
    private final UserRepository userRepository;

    private User resolveUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private void validateDateRange(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must not be before startDate");
        }
    }

    public List<TodoResponse> getAll(String email) {
        User user = resolveUser(email);
        return todoRepository.findAllForTreeByUserId(user.getId()).stream()
            .map(TodoResponse::from)
            .toList();
    }

    public List<TodoTreeResponse> getTree(String email) {
        User user = resolveUser(email);
        List<Todo> todos = todoRepository.findAllForTreeByUserId(user.getId());

        Map<Long, TodoTreeResponse> nodeMap = new HashMap<>();
        for (Todo t : todos) {
            nodeMap.put(t.getId(),
                new TodoTreeResponse(t.getId(), t.getTitle(), t.isCompleted(), t.getSortOrder()));
        }

        List<TodoTreeResponse> roots = new ArrayList<>();
        for (Todo t : todos) {
            TodoTreeResponse node = nodeMap.get(t.getId());
            Todo parent = t.getParent();
            if (parent == null) {
                roots.add(node);
            } else {
                TodoTreeResponse parentNode = nodeMap.get(parent.getId());
                if (parentNode == null) {
                    roots.add(node);
                } else {
                    parentNode.addChild(node);
                }
            }
        }

        return roots;
    }

    public void delete(String email, Long id) {
        User user = resolveUser(email);
        Todo todo = todoRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));
        if (!todo.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Todo not found: " + id);
        }
        todoRepository.deleteById(id);
    }

    public TodoResponse create(String email, CreateTodoRequest request) {
        validateDateRange(request.startDate(), request.endDate());
        User user = resolveUser(email);

        Todo parent = null;
        if (request.parentId() != null) {
            parent = todoRepository.findById(request.parentId())
                .orElseThrow(() -> new IllegalArgumentException("Parent Todo not found: " + request.parentId()));
        }

        int sortOrder = request.sortOrder() != null ? request.sortOrder() : 0;

        Todo todo = Todo.create(
            request.title(), user, parent, sortOrder,
            request.status(), request.progress(),
            request.startDate(), request.endDate(),
            request.color(), request.weight()
        );
        todoRepository.save(todo);

        return TodoResponse.from(todo);
    }

    public List<TodoResponse> bulkCreate(String email, List<BulkCreateTodoItem> items) {
        User user = resolveUser(email);

        // clientTempId + parentClientTempId 모두 조회 (청크 경계를 넘는 부모 참조 해결)
        List<String> allTempIds = items.stream()
            .flatMap(item -> java.util.stream.Stream.of(item.clientTempId(), item.parentClientTempId()))
            .filter(id -> id != null)
            .distinct()
            .toList();
        Map<String, Todo> existing = todoRepository
            .findAllByUserIdAndClientTempIdIn(user.getId(), allTempIds)
            .stream()
            .collect(java.util.stream.Collectors.toMap(Todo::getClientTempId, t -> t));

        Map<String, Todo> tempIdToTodo = new HashMap<>(existing);
        List<Todo> result = new ArrayList<>();

        for (BulkCreateTodoItem item : items) {
            if (item.clientTempId() != null && existing.containsKey(item.clientTempId())) {
                result.add(existing.get(item.clientTempId()));
                continue;
            }
            validateDateRange(item.startDate(), item.endDate());
            Todo parent = item.parentClientTempId() != null
                ? tempIdToTodo.get(item.parentClientTempId())
                : null;
            int sortOrder = item.sortOrder() != null ? item.sortOrder() : 0;
            Todo todo = Todo.create(
                item.title(), user, parent, sortOrder,
                item.status(), item.progress(),
                item.startDate(), item.endDate(),
                item.color(), item.weight(),
                item.clientTempId()
            );
            todoRepository.save(todo);
            if (item.clientTempId() != null) {
                tempIdToTodo.put(item.clientTempId(), todo);
            }
            result.add(todo);
        }

        return result.stream().map(TodoResponse::from).toList();
    }

    public TodoResponse update(String email, Long id, UpdateTodoRequest request) {
        validateDateRange(request.startDate(), request.endDate());
        User user = resolveUser(email);
        Todo todo = todoRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));
        if (!todo.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Todo not found: " + id);
        }

        todo.update(
            request.title(), request.status(), request.progress(),
            request.startDate(), request.endDate(),
            request.color(), request.weight()
        );

        return TodoResponse.from(todo);
    }
}
