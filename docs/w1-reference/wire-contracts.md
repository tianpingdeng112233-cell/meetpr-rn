# 学员域 Wire 契约参照包 B(RN Android W1)

- 侦察日期 2026-07-19,iOS 源=`MeetPR-release/Modules/Networking/`,backend 源=`MeetPR-backend/src/routes|handlers`(staging);staging 实测 8 个 GET(空数据学员号)。
- **权威**:响应形状 = backend 源码实际序列化;iOS DTO 仅确认客户端消费了哪些字段。行号为快照,动手存疑现场核实。

## ⚠️ 0. 大小写口径(修正 W0 教训的表述,load-bearing)

| 面 | wire 大小写 | 证据 |
|---|---|---|
| `/auth/*` | **camelCase**(accessToken/refreshToken/user.createdAt) | auth/index.ts:261,298 + curl 实测 |
| **其余全部学员域路由** | **snake_case**(plan_exercise_id/weight_kg/logged_at/…) | 全部 handlers/*serialization* + curl `/events/config` |

iOS 靠 `convertFromSnakeCase` 解码策略两头兼容(camel 无下划线时 no-op)。**Android:域响应按 snake_case 建 zod schema(不需要 tolerateCamelCase);auth 响应保持 W0 的 camelCase 容忍**。请求侧一律发 snake_case(后端 zod 对请求双容忍)。

## 1. 通用约定

- 鉴权 `authorization: Bearer <token>`;`/students|/plans|/sets|/feedback|/uploads|/bind-requests|/me|/students/me/*` 全过 requireAuth;`/events` optional-auth 不 401。
- 错误信封 `{error:"<MACHINE_CODE>", ...details}`;zod 失败 400 `{error, issues:[{path,message}]}`;401 统一 `{"error":"AUTH_INVALID_TOKEN"}`。
- **Decimal 一律字符串**:响应 `Number(x).toFixed(n)`(weight_kg 2 位/rpe 1 位/target_value·*_1rm_kg 2 位/height_cm 1 位);请求 string|number 双容忍,照 iOS 发字符串。
- 空态实测:`{"plans":[]}` `{"logs":[]}` `{"items":[]}` `{"checkin":null}` `{"videos":[]}`;onboarding 未填 → **404 ONBOARDING_NOT_FOUND**。

## 2. Plans(学员视角)

### 2.1 `GET /students/:studentId/plans`
- student 仅本人(403 AUTHORIZATION_FORBIDDEN)且强制 status='published'。
- 响应 `{plans: PlanSummary[]}`:id/coach_id(null?)/trainee_id/name/start_date(DATE)/end_date(DATE)/plan_weeks/source(coach|template|algorithm)/source_template_id?/status(draft|published|completed|paused)/kind(regular|adaptation)/block_type?/mesocycle_phase?/training_max?/tm_set_at?/created_at/updated_at/**total_shift_days**(int)/**latest_shift_created_at**(ts|null)。iOS 忽略 block_type/mesocycle_phase/training_max/tm_set_at——安卓同样忽略即可。

### 2.2 `GET /plans/:id`(详情含 days/exercises/sets)
- student 仅 trainee_id=self 且 published,否则 404 PLAN_NOT_FOUND。
- 响应 = plan 全字段+shift summary+`days[]`:
  - day:id/plan_id/day_of_week(1-7)/week_number/sort_order/shifted_to_date(DATE|null)/exercises[]
  - exercise:id/plan_day_id/exercise_id/is_main_lift/sort_order/notes?/has_logs(iOS 不解)/sets[]
  - set:id/plan_exercise_id/set_number/target_reps/target_reps_max?/intensity_mode(weight|rpe)/target_value(dec-str)/set_type(warmup|working|failed|amrap|backoff)/rest_seconds?/coach_note?/created_at

### 2.3 `POST /plans/:id/shift`(spec 054 顺延)
- **仅 coached_student**(self_train 403);无 body。
- 201 `{batch_id, shifted_days:[{day_id, shifted_to_date}], total_offset_days}`。
- 业务错误全 **409**:PLAN_NOT_ACTIVE / SHIFT_ONLY_TODAY / ALREADY_STARTED;403 NOT_PLAN_STUDENT。

### 2.4 `DELETE /plans/:id/shift`(撤销)
- 仅 coached_student;204;409 NO_ACTIVE_SHIFT / UNDO_WINDOW_PASSED / ALREADY_STARTED。

## 3. Sets

### 3.1 `POST /sets/log`(upsert,同 key 覆盖仍 201)
- 角色:两种学员。body 二选一(strict):
  - coached:`plan_exercise_id`(必)/`logged_date`(DATE,可选→服务器沪 gym-day 兜底)/`set_index`(≥0)/`weight_kg`(dec-str 0-9999.99)/`reps`(0-99)/`rpe`(dec-str 0-10,可选)/`completed`/`failed`(可选 default false)
  - adhoc:`exercise_id`(必)/`logged_date`(**必填**)/其余同上
- 201 `{id, logged_at}`(仅两字段)。
- 错误:400 SETS_PLAN_EXERCISE_NOT_PUBLISHED / SETS_EXERCISE_NOT_FOUND / VALIDATION_ERROR。

### 3.2 `GET /students/:id/sets?from=&to=&scope=`
- 本人或名下 coach;from/to 必填 DATE;scope=`plan`(默认,iOS 只用这个)|`all`。
- 响应 `{logs:[]}`:id/student_id/**plan_exercise_id(uuid|null——adhoc 为 null,安卓必须 nullable!)**/exercise_id/set_index/weight_kg(dec-str)/reps/rpe(dec-str|null)/completed/failed/assumed(bool)/adhoc(bool)/logged_date(DATE)/logged_at(ts)。
- ⚠️ iOS 只在 scope=plan 下安全(其 DTO 假设 plan_exercise_id 非空);安卓建 schema 直接 nullable。
- `POST /student/sets` 是 501 stub 勿用。

## 4. Readiness

### 4.1 `POST /students/me/readiness`(upsert,覆盖同日仍 201)
- body(strict):checkin_date(DATE)/sleep_quality/mood/stress(各 1-5)/muscle_fatigue:[{muscle_group:enum, severity:1-3}](group 唯一)。
- 201 = 完整 checkin:id/student_id/checkin_date/sleep_quality/mood/stress/muscle_fatigue[]/submitted_at/updated_at。

### 4.2 `GET /students/:id/readiness?date=`(必填)
- 本人或 accepted-bind coach;200 `{checkin: ReadinessCheckin|null}`。

## 5. Feedback

### 5.1 `GET /students/:id/feedback`
- 200 `{items:[]}` posted_at desc:id/coach_id/student_id/day_date(DATE|null)/plan_exercise_id?/text/posted_at/read_at(ts|**null=未读**)。

### 5.2 `PATCH /feedback/:id/read`
- 学员角色;无 body;204;404 FEEDBACK_NOT_FOUND。

## 6. Uploads / StudentVideos(OSS 分片)

> **无独立 sign-parts 端点**——分片 URL 内联在 initiate 响应。全链 = initiate →(客户端直 PUT OSS)→ complete / abort。OSS 未配置全线 503 UPLOADS_NOT_CONFIGURED。

### 6.1 `POST /uploads/initiate`
- body(strict):kind(set_video|onboarding_video|onboarding_doc)/content_type(video 限 mp4·quicktime;doc 限 png·jpeg·pdf)/size_bytes(video≤200MB,doc≤20MB)/part_count(1-200 且 ≤ceil(size/1MB))/filename?/set_log_id?(仅 set_video,须本人)
- 201 `{attachment_id, upload_id, part_urls:[{part_number, url}]}`;part URL TTL=1h。
- 错误:400 UPLOAD_CONTENT_TYPE_MISMATCH / UPLOAD_TOO_LARGE / VALIDATION_ERROR;404 SET_LOG_NOT_FOUND;**429 UPLOAD_QUOTA_EXCEEDED**(活跃≥10);503。

### 6.2 `POST /uploads/:id/complete`
- body:`{parts:[{part_number, etag}]}`(数量=initiate part_count)。
- 200 AttachmentWire:id/owner_id/kind/oss_key/content_type/size_bytes(number)/filename?/set_log_id/source_plan_id/source_coach_id/is_unlinked_explicit/part_count/actual_size_bytes?/status(=ready)/created_at/updated_at。
- 错误:404;409 UPLOAD_INVALID_STATE(+status)/UPLOAD_SIZE_MISMATCH;400 UPLOAD_INVALID_PARTS;502 UPLOAD_SIZE_VERIFICATION_FAILED。

### 6.3 `POST /uploads/:id/abort` — body 严格空对象 `{}`;204 幂等;409 UPLOAD_INVALID_STATE;502 UPLOAD_ABORT_FAILED。

### 6.4 `GET /uploads/:id/url` — 200 `{url, expires_in:900}`;非本人统一 404 掩盖存在性;409 ATTACHMENT_NOT_READY。

### 6.5 `GET /students/:id/videos`(视频墙,仅 ready 的 set_video,上限 100,newest-first)
- 200 `{videos:[]}`:id/set_log_id?/plan_exercise_id?/**exercise_name?/set_index?/weight_kg?/reps?**(iOS 丢弃但后端有——安卓显示动作名/重量白捡)/content_type/size_bytes/filename?/created_at/logged_at?。

## 7. Bind(学员侧三端点)

状态枚举:`pending|accepted|rejected|expired|cancelled`。**全部仅 coached_student**(self_train 403)。

- `POST /bind-requests` body(strict):code(1-20)/display_name(1-100)。201 BindRequest:id/student_id/coach_id/coach_display_name?/invite_code_id?/status/submitted_at/responded_at?/expired_at/skip_evaluation/skip_reason?。错误:400 INVITE_CODE_INVALID;409 BIND_REQUEST_ALREADY_PENDING / BIND_ALREADY_BOUND。
- `GET /bind-requests/mine` → 200 `{bind_request: BindRequest|null}`(读前 lazy-expire)。
- `DELETE /bind-requests/:id`(仅本人 pending)→ 204;404;409 BIND_REQUEST_NOT_PENDING。

## 8. Profile / Me

> **无 GET /me**。学员「个人资料」= onboarding profile。

- `GET /students/:id/onboarding` → 200 全字段(snake):user_id/unit_preference/gender/birth_date?/height_cm?/weight_kg?/training_years?/squat_stance?/deadlift_style?/bench_grip?/squat_1rm_kg?/bench_1rm_kg?/deadlift_1rm_kg?/training_days?/gym_tier?/equipment_overrides?/daily_life_intensity?/life_stress?/recovery_speed?/sleep_hours?/muscle_groups_to_strengthen?/injury_notes?/injury_areas?/is_competing?/competition_date?/target_weight_class?/note_to_coach?/completed_at?/created_at/updated_at/upload_attachment_ids[]。未填=404 ONBOARDING_NOT_FOUND。
- `PUT /students/me/onboarding`(分步 upsert,全字段可选)→ 200 同上。**403 ONE_RM_LOCKED**:coached 且 completed_at 已置后改 1RM(self_train 豁免)。
- `POST /students/me/onboarding/complete` → 200 幂等;**422 ONBOARDING_INCOMPLETE + missing_fields[]**(coached ~16 必填;self_train 仅 unit_preference)。
- `PUT /me/password` body `{old_password,new_password}` → 204(撤销全部 session);403 PASSWORD_MISMATCH。
- `DELETE /me`(学员角色)→ 204 幂等级联删。
- **E1RMCompetitionLiftGate 无独立端点**:数据 = onboarding 1RM 字段 + `GET /exercises` catalog 的 is_competition_lift/competition_stance。

## 9. Events(与 W0 契约一致,已实测 android 批 204)

- `GET /events/config` → `{enabled, sample_rate}`(snake)。
- `POST /events` 批 1-50,partial-accept,**platform:"android" 必须显式传**;204。
- `POST /events/feedback` text≤500;204。

## 10. 日期三口径 + DATE-as-text

- **DATE-text 列**:plans.start_date/end_date;plan_days.shifted_to_date;set_logs.logged_date;readiness.checkin_date;feedback.day_date;onboarding.birth_date/competition_date。
- **UTC 瞬时**:所有 `*_at`(ISO8601)。
- **沪 gym-day(凌晨 4 点切日)**:仅 POST /sets/log 缺 logged_date 时服务器兜底。
- **设备本地日**:客户端上送的 logged_date / checkin_date。
- ⚠️ **顺延的「今天」用 UTC 日**(plans/index.ts:408),set log 训练日用沪 gym-day——同一「今天」两条路径可能差一天,顺延 UI 与「当天已开练」判断要注意。

## 附:角色门速查

| 端点 | 允许角色 |
|---|---|
| plan shift(2.3/2.4)、bind-requests 全部 | 仅 coached_student |
| sets/log、readiness 提交、feedback 已读、onboarding me 系 | 两种学员 |
| GET /students/:id/* | 本人或(部分)accepted-bind coach |

测试号 +8613810000103 是 self_train:bind/mine 与 shift 403 是角色门不是 bug;验 coached 链路需另造 coached_student 号。
