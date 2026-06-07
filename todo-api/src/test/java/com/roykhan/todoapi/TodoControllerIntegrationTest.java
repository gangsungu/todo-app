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
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Map;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
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
    @Autowired EntityManager entityManager;
    @Value("${jwt.secret}") String jwtSecret;

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
        return savedTodoFor(testUser, title, parent);
    }

    private Todo savedTodoFor(User owner, String title, Todo parent) {
        return todoRepository.save(Todo.create(
            title, owner, parent, 0,
            TodoStatus.TODO, 0,
            LocalDate.now(), LocalDate.now().plusDays(7),
            null, null
        ));
    }

    private ResultActions patchStatus(Long id, String status) throws Exception {
        var body = Map.of(
            "title", "할일",
            "status", status,
            "progress", 0,
            "startDate", "2026-01-01",
            "endDate", "2026-01-31"
        );
        return mockMvc.perform(withAuth(patch("/api/todos/" + id))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
    }

    // ── 인증 ──────────────────────────────────────────────────────────────────

    @Test
    void 쿠키_없이_요청하면_401() throws Exception {
        mockMvc.perform(get("/api/todos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void 만료된_토큰이면_401() throws Exception {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        long now = System.currentTimeMillis();
        String expiredToken = Jwts.builder()
            .subject(testUser.getEmail())
            .issuedAt(new Date(now - 20_000))
            .expiration(new Date(now - 10_000)) // 이미 만료된 시각
            .signWith(key)
            .compact();

        mockMvc.perform(get("/api/todos").cookie(new Cookie("access_token", expiredToken)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void 서명이_위조된_토큰이면_401() throws Exception {
        // 서버 시크릿과 다른 키로 서명한 토큰 → 서명 검증 실패
        SecretKey wrongKey = Keys.hmacShaKeyFor(
            "completely-different-secret-key-32bytes-long".getBytes(StandardCharsets.UTF_8));
        long now = System.currentTimeMillis();
        String forgedToken = Jwts.builder()
            .subject(testUser.getEmail())
            .issuedAt(new Date(now))
            .expiration(new Date(now + 3_600_000))
            .signWith(wrongKey)
            .compact();

        mockMvc.perform(get("/api/todos").cookie(new Cookie("access_token", forgedToken)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void 형식이_깨진_토큰이면_401() throws Exception {
        mockMvc.perform(get("/api/todos").cookie(new Cookie("access_token", "not-a-jwt")))
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

    @Test
    void 부모를_다시_TODO로_되돌리면_자식도_TODO로_cascade() throws Exception {
        Todo parent = savedTodo("부모", null);
        Todo child = savedTodo("자식", parent);

        // 먼저 COMPLETED 로 만든 뒤
        patchStatus(parent.getId(), "COMPLETED").andExpect(status().isOk());
        todoRepository.flush();
        assertThat(todoRepository.findById(child.getId()).get().getStatus()).isEqualTo(TodoStatus.COMPLETED);

        // 다시 TODO 로 되돌리면 자식도 풀려야 한다
        patchStatus(parent.getId(), "TODO").andExpect(status().isOk());
        todoRepository.flush();

        Todo refreshedChild = todoRepository.findById(child.getId()).get();
        assertThat(refreshedChild.getStatus()).isEqualTo(TodoStatus.TODO);
        // status 와 completed 플래그가 항상 동기화되어야 한다
        assertThat(refreshedChild.isCompleted()).isFalse();
    }

    @Test
    void 손자까지_재귀적으로_cascade_되고_completed_플래그도_동기화() throws Exception {
        Todo parent = savedTodo("부모", null);
        Todo child = savedTodo("자식", parent);
        Todo grandChild = savedTodo("손자", child);

        patchStatus(parent.getId(), "COMPLETED").andExpect(status().isOk());
        todoRepository.flush();

        Todo refreshedChild = todoRepository.findById(child.getId()).get();
        Todo refreshedGrandChild = todoRepository.findById(grandChild.getId()).get();

        // 2단계 아래 손자까지 전파되어야 한다 (재귀 CTE)
        assertThat(refreshedChild.getStatus()).isEqualTo(TodoStatus.COMPLETED);
        assertThat(refreshedChild.isCompleted()).isTrue();
        assertThat(refreshedGrandChild.getStatus()).isEqualTo(TodoStatus.COMPLETED);
        assertThat(refreshedGrandChild.isCompleted()).isTrue();
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

    @Test
    void 부모_삭제시_자식과_손자까지_cascade_삭제() throws Exception {
        Long parentId = savedTodo("부모", null).getId();
        Long childId = savedTodo("자식", todoRepository.getReferenceById(parentId)).getId();
        Long grandChildId = savedTodo("손자", todoRepository.getReferenceById(childId)).getId();

        // 실제 DELETE 요청처럼 새 영속성 컨텍스트에서 lazy 로딩되도록 flush+clear
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(withAuth(delete("/api/todos/" + parentId)))
            .andExpect(status().isNoContent());

        entityManager.flush();
        // CascadeType.ALL 로 트리 전체가 삭제되어 고아 노드가 남지 않아야 한다
        assertThat(todoRepository.findById(parentId)).isEmpty();
        assertThat(todoRepository.findById(childId)).isEmpty();
        assertThat(todoRepository.findById(grandChildId)).isEmpty();
    }

    // ── 사용자 격리 (User Isolation) ──────────────────────────────────────────

    @Test
    void 다른_유저의_할일_수정시_400() throws Exception {
        User other = userRepository.save(User.create("other@example.com", "Other", null, "google"));
        Todo otherTodo = savedTodoFor(other, "타인 할일", null);

        patchStatus(otherTodo.getId(), "COMPLETED")
            .andExpect(status().isBadRequest());

        // 타인의 할일 상태가 변경되지 않아야 한다
        todoRepository.flush();
        assertThat(todoRepository.findById(otherTodo.getId()).get().getStatus())
            .isEqualTo(TodoStatus.TODO);
    }

    @Test
    void 목록_조회는_본인_할일만_반환() throws Exception {
        savedTodo("내 할일1", null);
        savedTodo("내 할일2", null);
        User other = userRepository.save(User.create("other@example.com", "Other", null, "google"));
        savedTodoFor(other, "타인 할일", null);

        mockMvc.perform(withAuth(get("/api/todos")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.title == '타인 할일')]").isEmpty());
    }

    @Test
    void 트리_조회는_본인_할일만_반환() throws Exception {
        savedTodo("내 루트", null);
        User other = userRepository.save(User.create("other@example.com", "Other", null, "google"));
        savedTodoFor(other, "타인 루트", null);

        mockMvc.perform(withAuth(get("/api/todos/tree")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].title").value("내 루트"));
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

    @Test
    void 가중치_단일_항목_100퍼센트면_성공() throws Exception {
        Todo t1 = savedTodo("항목1", null);

        var body = List.of(Map.of("id", t1.getId(), "weight", 100));

        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].weight").value(100));
    }

    @Test
    void 가중치_존재하지_않는_id_포함시_400() throws Exception {
        Todo t1 = savedTodo("항목1", null);

        var body = List.of(
            Map.of("id", t1.getId(), "weight", 50),
            Map.of("id", 999999, "weight", 50)
        );

        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void 가중치_빈_리스트면_400() throws Exception {
        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void 가중치_100_초과면_400() throws Exception {
        Todo t1 = savedTodo("항목1", null);

        var body = List.of(Map.of("id", t1.getId(), "weight", 150));

        // 리스트 원소의 @Max(100) 위반은 HandlerMethodValidationException 으로
        // 처리되어 500이 아닌 400을 반환해야 한다
        mockMvc.perform(withAuth(patch("/api/todos/weights"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // ── 날짜 경계값 ────────────────────────────────────────────────────────────

    @Test
    void 할일_생성_시작일과_종료일이_같으면_성공() throws Exception {
        var body = Map.of(
            "title", "당일 할일",
            "startDate", "2026-01-15",
            "endDate", "2026-01-15",
            "progress", 0
        );

        mockMvc.perform(withAuth(post("/api/todos"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.startDate").value("2026-01-15"))
            .andExpect(jsonPath("$.endDate").value("2026-01-15"));
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

    @Test
    void bulk_생성_같은_clientTempId로_재요청해도_중복생성_안됨() throws Exception {
        var body = List.of(
            Map.of(
                "title", "재시도 대상",
                "clientTempId", "temp-retry",
                "startDate", "2026-01-01",
                "endDate", "2026-01-31",
                "progress", 0
            )
        );
        String json = objectMapper.writeValueAsString(body);

        // 1차 요청 → 생성
        var first = mockMvc.perform(withAuth(post("/api/todos/bulk"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk())
            .andReturn();
        Long firstId = objectMapper.readTree(first.getResponse().getContentAsString())
            .get(0).get("id").asLong();

        // 2차 요청(같은 clientTempId, 재시도 시뮬레이션) → 기존 항목을 그대로 반환
        var second = mockMvc.perform(withAuth(post("/api/todos/bulk"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk())
            .andReturn();
        Long secondId = objectMapper.readTree(second.getResponse().getContentAsString())
            .get(0).get("id").asLong();

        // 멱등성: 같은 행을 반환하고 중복 행이 생기지 않아야 한다
        assertThat(secondId).isEqualTo(firstId);
        assertThat(todoRepository.findAllForTreeByUserId(testUser.getId())).hasSize(1);
    }
}
