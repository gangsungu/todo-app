package com.roykhan.todoapi.domain.todo;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "todos", indexes = {
    @Index(name = "idx_parent_sort", columnList = "parent_id, sort_order")
})
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private boolean completed = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TodoStatus status = TodoStatus.TODO;

    @Column(nullable = false)
    private int progress = 0;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 20)
    private String color;

    private Integer weight;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Todo parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    private List<Todo> children = new ArrayList<>();

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Todo create(String title, Todo parent, int sortOrder,
                              TodoStatus status, int progress,
                              LocalDate startDate, LocalDate endDate,
                              String color, Integer weight) {
        Todo todo = new Todo();
        todo.title = title;
        todo.parent = parent;
        todo.sortOrder = sortOrder;
        todo.status = status != null ? status : TodoStatus.TODO;
        todo.completed = todo.status == TodoStatus.COMPLETED;
        todo.progress = progress;
        todo.startDate = startDate;
        todo.endDate = endDate;
        todo.color = color;
        todo.weight = weight;
        return todo;
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void toggleCompleted(boolean completed) {
        this.completed = completed;
        this.status = completed ? TodoStatus.COMPLETED : TodoStatus.TODO;

        for(Todo child : children) {
            child.toggleCompleted(completed);
        }
    }

    public void update(String title, TodoStatus status, int progress,
                       LocalDate startDate, LocalDate endDate, String color, Integer weight) {
        this.title = title;
        this.status = status;
        this.completed = status == TodoStatus.COMPLETED;
        this.progress = progress;
        this.startDate = startDate;
        this.endDate = endDate;
        this.color = color;
        this.weight = weight;
    }

    public void changeTitle(String title) {
        this.title = title;
    }

    public void move(Todo newParent, int newSortOrder) {
        this.parent = newParent;
        this.sortOrder = newSortOrder;
    }
}