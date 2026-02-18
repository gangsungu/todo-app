package com.roykhan.todoapi.domain.todo;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Entity
@Table(name = "todos", indexes = {
    @Index(name = "idx_parent_sort", columnList = "parent_id, sort_order")
})
@Getter
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private boolean completed = false;

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

    protected Todo() {}

    public static Todo create(String title, Todo parent, int sortOrder) {
        Todo todo = new Todo();
        todo.title = title;
        todo.parent = parent;
        todo.sortOrder = sortOrder;
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

        for(Todo child : children) {
            child.toggleCompleted(completed);
        }
    }

    public void changeTitle(String title) {
        this.title = title;
    }

    public void move(Todo newParent, int newSortOrder) {
        this.parent = newParent;
        this.sortOrder = newSortOrder;
    }
}