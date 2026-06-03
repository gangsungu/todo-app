package com.roykhan.todoapi.domain.todo.service;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.TodoStatus;
import com.roykhan.todoapi.domain.todo.dto.BulkCreateTodoItem;
import com.roykhan.todoapi.domain.todo.dto.CreateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoResponse;
import com.roykhan.todoapi.domain.todo.dto.TodoTreeResponse;
import com.roykhan.todoapi.domain.todo.dto.UpdateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.WeightUpdateItem;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import com.roykhan.todoapi.domain.user.User;
import com.roykhan.todoapi.domain.user.repository.UserRepository;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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

    private void cascadeCompleted(Long userId, Long rootId) {
        List<Todo> all = todoRepository.findAllForTreeByUserId(userId);

        Map<Long, Todo> byId = new HashMap<>(all.size());
        Map<Long, List<Long>> byParentId = new HashMap<>();
        for (Todo t : all) {
            byId.put(t.getId(), t);
            Long parentId = t.getParent() == null ? null : t.getParent().getId();
            if (parentId != null) {
                byParentId.computeIfAbsent(parentId, k -> new ArrayList<>()).add(t.getId());
            }
        }

        Deque<Long> q = new ArrayDeque<>(byParentId.getOrDefault(rootId, List.of()));
        while (!q.isEmpty()) {
            Long cur = q.poll();
            Todo curTodo = byId.get(cur);
            if (curTodo != null) {
                curTodo.markCompleted();
                List<Long> children = byParentId.get(cur);
                if (children != null) q.addAll(children);
            }
        }
    }

    private void cascadeTodo(Long userId, Long rootId) {
        List<Todo> all = todoRepository.findAllForTreeByUserId(userId);

        Map<Long, Todo> byId = new HashMap<>(all.size());
        Map<Long, List<Long>> byParentId = new HashMap<>();
        for (Todo t : all) {
            byId.put(t.getId(), t);
            Long parentId = t.getParent() == null ? null : t.getParent().getId();
            if (parentId != null) {
                byParentId.computeIfAbsent(parentId, k -> new ArrayList<>()).add(t.getId());
            }
        }

        Deque<Long> q = new ArrayDeque<>(byParentId.getOrDefault(rootId, List.of()));
        while (!q.isEmpty()) {
            Long cur = q.poll();
            Todo curTodo = byId.get(cur);
            if (curTodo != null) {
                curTodo.markTodo();
                List<Long> children = byParentId.get(cur);
                if (children != null) q.addAll(children);
            }
        }
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

        List<String> allTempIds = items.stream()
            .flatMap(item -> java.util.stream.Stream.of(item.clientTempId(), item.parentClientTempId()))
            .filter(id -> id != null)
            .distinct()
            .toList();
        Map<String, Todo> existing = todoRepository
            .findAllByUserIdAndClientTempIdIn(user.getId(), allTempIds)
            .stream()
            .collect(Collectors.toMap(Todo::getClientTempId, t -> t));

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
            request.color()
        );

        if (request.status() == TodoStatus.COMPLETED) {
            cascadeCompleted(user.getId(), id);
        } else if (request.status() == TodoStatus.TODO) {
            cascadeTodo(user.getId(), id);
        }

        return TodoResponse.from(todo);
    }

    public List<TodoResponse> updateWeights(String email, List<WeightUpdateItem> items) {
        User user = resolveUser(email);

        List<Long> ids = items.stream().map(WeightUpdateItem::id).toList();
        List<Todo> todos = todoRepository.findByIdsAndUserId(ids, user.getId());

        if (todos.size() != items.size()) {
            throw new IllegalArgumentException("일부 할일을 찾을 수 없습니다.");
        }

        Set<Object> parentKeys = todos.stream()
            .map(t -> t.getParent() == null ? "root" : t.getParent().getId())
            .collect(Collectors.toSet());
        if (parentKeys.size() != 1) {
            throw new IllegalArgumentException("모든 할일이 같은 부모를 가져야 합니다.");
        }

        int sum = items.stream().mapToInt(WeightUpdateItem::weight).sum();
        if (sum != 100) {
            throw new IllegalArgumentException("가중치 합계가 100이어야 합니다. 현재 합계: " + sum);
        }

        Map<Long, Integer> weightMap = items.stream()
            .collect(Collectors.toMap(WeightUpdateItem::id, WeightUpdateItem::weight));
        for (Todo todo : todos) {
            todo.updateWeight(weightMap.get(todo.getId()));
        }

        return todos.stream().map(TodoResponse::from).toList();
    }
}
