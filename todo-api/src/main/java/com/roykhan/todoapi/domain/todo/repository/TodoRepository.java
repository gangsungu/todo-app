package com.roykhan.todoapi.domain.todo.repository;

import com.roykhan.todoapi.domain.todo.Todo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TodoRepository extends JpaRepository<Todo, Long> {

    @Query("""
        select t
        from Todo t
        left join fetch t.parent p
        order by p.id asc nulls first, t.sortOrder asc, t.id asc
    """)
    List<Todo> findAllForTree();

    @Query("""
        select t from Todo t
        left join fetch t.children
        where t.id = :id
    """)
    Optional<Todo> findByIdWithChildren(Long id);
}
