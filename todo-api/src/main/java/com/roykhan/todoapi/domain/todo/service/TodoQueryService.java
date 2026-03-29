package com.roykhan.todoapi.domain.todo.service;

import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.dto.CreateTodoRequest;
import com.roykhan.todoapi.domain.todo.dto.TodoResponse;
import com.roykhan.todoapi.domain.todo.dto.TodoTreeResponse;
import com.roykhan.todoapi.domain.todo.dto.UpdateTodoRequest;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
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

    public List<TodoResponse> getAll() {
        return todoRepository.findAllForTree().stream()
            .map(TodoResponse::from)
            .toList();
    }

    public List<TodoTreeResponse> getTree() {
        List<Todo> todos = todoRepository.findAllForTree();

        Map<Long, TodoTreeResponse> nodeMap = new HashMap<>();
        for(Todo t : todos) {
            nodeMap.put(t.getId(),
                new TodoTreeResponse(t.getId(), t.getTitle(), t.isCompleted(), t.getSortOrder()));
        }

        List<TodoTreeResponse> roots = new ArrayList<>();
        for(Todo t : todos) {
            TodoTreeResponse node = nodeMap.get(t.getId());

            Todo parent = t.getParent();
            if(parent == null) {
                roots.add(node);
            }
            else {
                TodoTreeResponse parentNode = nodeMap.get(parent.getId());

                if(parentNode == null) {
                    roots.add(node);
                }
                else {
                    parentNode.addChild(node);
                }
            }
        }

        return roots;
    }

    @Transactional
    public void updateCompletedCascade(Long rootId, boolean completed) {
        List<Todo> all = todoRepository.findAllForTree();

        Map<Long, Todo> byId = new HashMap<>(all.size());
        Map<Long, List<Long>> byParentId = new HashMap<>();

        for(Todo t : all) {
            byId.put(t.getId(), t);

            Long parentId = (t.getParent() == null) ? null : t.getParent().getId();
            if(parentId != null) {
                byParentId.computeIfAbsent(parentId, k -> new ArrayList<>()).add(t.getId());
            }
        }

        Todo root = byId.get(rootId);
        if(root == null) {
            throw new IllegalArgumentException("Root Todo not found:" + rootId);
        }

        // 서브트리 id 수집 (BFS)
        Deque<Long> q = new ArrayDeque<>();
        q.add(rootId);

        while(!q.isEmpty()) {
            Long cur = q.poll();
            Todo curTodo = byId.get(cur);
            if(curTodo != null) {
                curTodo.toggleCompleted(completed);
            }

            List<Long> childIds = byParentId.get(cur);
            if(childIds != null) {
                for(Long childId : childIds) {
                    q.add(childId);
                }
            }
        }
    }

    public void delete(Long id) {
        if (!todoRepository.existsById(id)) {
            throw new IllegalArgumentException("Todo not found: " + id);
        }
        todoRepository.deleteById(id);
    }

    public TodoResponse create(CreateTodoRequest request) {
        Todo parent = null;
        if (request.parentId() != null) {
            parent = todoRepository.findById(request.parentId())
                .orElseThrow(() -> new IllegalArgumentException("Parent Todo not found: " + request.parentId()));
        }

        int sortOrder = request.sortOrder() != null ? request.sortOrder() : 0;

        Todo todo = Todo.create(
            request.title(), parent, sortOrder,
            request.status(), request.progress(),
            request.startDate(), request.endDate(),
            request.color(), request.weight()
        );
        todoRepository.save(todo);

        return TodoResponse.from(todo);
    }

    public TodoResponse update(Long id, UpdateTodoRequest request) {
        Todo todo = todoRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));

        todo.update(
            request.title(), request.status(), request.progress(),
            request.startDate(), request.endDate(),
            request.color(), request.weight()
        );

        return TodoResponse.from(todo);
    }
}
