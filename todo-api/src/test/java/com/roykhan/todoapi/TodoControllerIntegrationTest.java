package com.roykhan.todoapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roykhan.todoapi.domain.auth.JwtProvider;
import com.roykhan.todoapi.domain.todo.Todo;
import com.roykhan.todoapi.domain.todo.TodoStatus;
import com.roykhan.todoapi.domain.todo.repository.TodoRepository;
import com.roykhan.todoapi.domain.user.User;
import com.roykhan.todoapi.domain.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Transactional
@ActiveProfiles("test")
class TodoControllerIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired TodoRepository todoRepository;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private User testUser;
    private String token;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        objectMapper = new ObjectMapper();
        testUser = userRepository.save(User.create("test@example.com", "Test User", null, "google"));
        token = jwtProvider.createAccessToken(testUser.getEmail());
    }

    private MockHttpServletRequestBuilder withAuth(MockHttpServletRequestBuilder builder) {
        return builder.cookie(new Cookie("access_token", token));
    }

    private Todo savedTodo(String title, Todo parent) {
        return todoRepository.save(Todo.create(
            title, testUser, parent, 0,
            TodoStatus.TODO, 0,
            LocalDate.now(), LocalDate.now().plusDays(7),
            null, null
        ));
    }

    // ── 인증 ──────────────────────────────────────────────────────────────────

    @Test
    void 쿠키_없이_요청하면_401() throws Exception {
        mockMvc.perform(get("/api/todos"))
            .andExpect(status().isUnauthorized());
    }

    // ── GET /api/todos ────────────────────────────────────────────────────────

    @Test
    void 할일_목록_조회_빈_배열() throws Exception {
        mockMvc.perform(withAuth(get("/api/todos")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(0));
    }

    // ── POST /api/todos ───────────────────────────────────────────────────────

    @Test
    void 할일_생성_성공() throws Exception {
        var body = Map.of(
            "title", "새 할일",
            "startDate", "2026-01-01",
            "endDate", "2026-01-31",
            "progress", 0
        );

        mockMvc.perform(withAuth(post("/api/todos"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("새 할일"))
            .andExpect(jsonPath("$.status").value("TODO"));
    }

    @Test
    void 할일_생성_제목_공백이면_400() throws Exception {
        var body = Map.of(
            "title", "",
            "startDate", "2026-01-01",
            "endDate", "2026-01-31",
            "progress", 0
        );

        mockMvc.perform(withAuth(post("/api/todos"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void 할일_생성_종료일이_시작일보다_이전이면_400() throws Exception {
        var body = Map.of(
            "title", "날짜 오류",
            "startDate", "2026-01-31",
            "endDate", "2026-01-01",
            "progress", 0
        );

        mockMvc.perform(withAuth(post("/api/todos"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/todos/{id} ─────────────────────────────────────────────────

    @Test
    void 할일_수정_성공() throws Exception {
        Todo todo = savedTodo("원래 제목", null);

        var body = Map.of(
            "title", "수정된 제목",
            "status", "IN_PROGRESS",
            "progress", 50,
            "startDate", "2026-01-01",
            "endDate", "2026-01-31"
        );

        mockMvc.perform(withAuth(patch("/api/todos/" + todo.getId()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("수정된 제목"))
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void 부모_COMPLETED_처리시_자식도_cascade() throws Exception {
        Todo parent = savedTodo("부모", null);
        Todo child1 = savedTodo("자식1", parent);
        Todo child2 = savedTodo("자식2", parent);

        var body = Map.of(
            "title", "부모",
            "status", "COMPLETED",
            "progress", 100,
            "startDate", "2026-01-01",
            "endDate", "2026-01-31"
        );

        mockMvc.perform(withAuth(patch("/api/todos/" + parent.getId()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());

        // 영속성 컨텍스트 갱신 후 DB 상태 확인
        todoRepository.flush();
        assertThat(todoRepository.findById(child1.getId()).get().getStatus()).isEqualTo(TodoStatus.COMPLETED);
        assertThat(todoRepository.findById(child2.getId()).get().getStatus()).isEqualTo(TodoStatus.COMPLETED);
    }

    // ── DELETE /api/todos/{id} ────────────────────────────────────────────────

    @Test
    void 할일_삭제_성공() throws Exception {
        Todo todo = savedTodo("삭제 대상", null);

        mockMvc.perform(withAuth(delete("/api/todos/" + todo.getId())))
            .andExpect(status().isNoContent());
    }

    @Test
    void 다른_유저의_할일_삭제시_400() throws Exception {
        User other = userRepository.save(User.create("other@example.com", "Other", null, "google"));
        Todo otherTodo = todoRepository.save(Todo.create(
            "타인 할일", other, null, 0,
            TodoStatus.TODO, 0,
            LocalDate.now(), LocalDate.now().plusDays(1),
            null, null
        ));

        mockMvc.perform(withAuth(delete("/api/todos/" + otherTodo.getId())))
            .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/todos/weights ──────────────────────────────────────────────

    @Test
    void 가중치_업데이트_성공() throws Exception {
        Todo t1 = savedTodo("항목1", null);
        Todo t2 = savedTodo("항목2", null);

        var body = List.of(
            Map.of("id", t1.getId(), "weight", 60),
            Map.of("id", t2.getId(), "weight", 40)
        );

        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == " + t1.getId() + ")].weight").value(60));
    }

    @Test
    void 가중치_합계가_100이_아니면_400() throws Exception {
        Todo t1 = savedTodo("항목1", null);
        Todo t2 = savedTodo("항목2", null);

        var body = List.of(
            Map.of("id", t1.getId(), "weight", 60),
            Map.of("id", t2.getId(), "weight", 30)
        );

        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void 다른_부모의_항목을_섞으면_400() throws Exception {
        Todo parent1 = savedTodo("부모1", null);
        Todo parent2 = savedTodo("부모2", null);
        Todo child1 = savedTodo("자식1", parent1);
        Todo child2 = savedTodo("자식2", parent2);

        var body = List.of(
            Map.of("id", child1.getId(), "weight", 50),
            Map.of("id", child2.getId(), "weight", 50)
        );

        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // ── POST /api/todos/bulk ──────────────────────────────────────────────────

    @Test
    void bulk_생성_부모자식_계층_연결() throws Exception {
        var body = List.of(
            Map.of(
                "title", "부모",
                "clientTempId", "temp-parent",
                "startDate", "2026-01-01",
                "endDate", "2026-01-31",
                "progress", 0
            ),
            Map.of(
                "title", "자식",
                "clientTempId", "temp-child",
                "parentClientTempId", "temp-parent",
                "startDate", "2026-01-01",
                "endDate", "2026-01-31",
                "progress", 0
            )
        );

        var result = mockMvc.perform(withAuth(post("/api/todos/bulk"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andReturn();

        var response = objectMapper.readTree(result.getResponse().getContentAsString());
        Long parentId = response.get(0).get("id").asLong();
        Long childParentId = response.get(1).get("parentId").asLong();
        assertThat(childParentId).isEqualTo(parentId);
    }
}
