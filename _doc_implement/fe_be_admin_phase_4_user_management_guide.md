# Hướng dẫn Kế hoạch & Triển khai Chi tiết Phase 4: Quản lý Người dùng Chuyên sâu (Admin Web & Backend)

Tài liệu này cung cấp toàn bộ hướng dẫn kiến trúc, mã nguồn mẫu hoàn chỉnh và kịch bản nghiệm thu chi tiết cho **Phase 4 (Nâng cấp Quản lý Người dùng)**. Hướng dẫn dành cho Freshers và Developers để tự tin implement chính xác mà không gặp sự cố breaking changes.

---

## 📌 1. Bối cảnh & Mục tiêu

Phân hệ Quản lý Người dùng hiện tại (`/users`) chỉ mới hỗ trợ xem danh sách và lọc số lượng tài nguyên cơ bản. Phase 4 sẽ bổ sung **3 tính năng quản trị chuyên sâu**:

1. **Khóa / Mở khóa Tài khoản (Suspend / Ban & Unban User)**:
   * Chuyển trạng thái `Active` / `Blocked` thời gian thực.
   * Sử dụng Supabase Auth Admin API để vô hiệu hóa Token JWT ngay lập tức.
2. **Gửi Thông báo Đẩy riêng lẻ (Direct Push Notification via FCM)**:
   * Cho phép Admin gửi tin nhắn push trực tiếp đến tất cả thiết bị di động của 1 người dùng cụ thể.
3. **Drawer Thống kê Học tập Chi tiết (User Learning Analytics Side-Sheet)**:
   * Mở bảng trượt lề phải hiển thị tổng thời lượng nghe sách nói (giờ), số phiên học hoàn thành, và số thẻ flashcard ôn tập lặp lại ngắt quãng đã ghi nhớ.

---

## 🏛️ 2. Kiến trúc & Logic Nghiệp vụ (Architecture & Rationale)

```
[ Frontend: Next.js Admin Web ]
   │
   ├── (1) Toggle Switch Active/Blocked ──> PATCH /api/v1/admin/users/{user_id}/status
   │                                             │
   │                                             └─> Calls Supabase Auth Admin ban/unban
   │                                                 & Logs AdminAuditLog
   │
   ├── (2) Modal Gửi Push Notification  ──> POST /api/v1/admin/users/{user_id}/notify
   │                                             │
   │                                             └─> Calls fcm_service.send_fcm_notification
   │                                                 & Creates UserNotification row
   │
   └── (3) Analytics Slide-Over Drawer ──> GET /api/v1/admin/users/{user_id}/stats
                                                 │
                                                 └─> SQL Aggregation (Sessions, Audio, Spaced Review)
```

---

## ⚖️ 3. Phân tích Ưu - Nhược điểm & Rủi ro (Pros, Cons & Risk Matrix)

| Tiêu chí | Ưu điểm (Pros) | Nhược điểm (Cons) | Rủi ro & Cách khắc phục (Risks & Mitigation) |
| :--- | :--- | :--- | :--- |
| **Khóa / Unlock User** | Ngắt kết nối người dùng vi phạm tức thì (< 100ms) qua Supabase Auth Admin SDK. | Người dùng bị ngắt ứng dụng giữa chừng có thể thắc mắc. | **Rủi ro**: Lỡ khóa nhầm tài khoản Admin.<br>**Khắc phục**: Chặn không cho Admin tự ban chính tài khoản của mình (`user_id != admin_user_id`). |
| **Gửi Direct Push** | Tận dụng sẵn hạ tầng Firebase FCM `fcm_service.py` sẵn có. | Nếu thiết bị user tắt thông báo thì Push không tới. | **Rủi ro**: Token FCM hết hạn làm văng exception.<br>**Khắc phục**: `fcm_service` tự động dọn rác Token lỗi, không sập API. |
| **User Analytics Drawer** | Giao diện Slide-Over mượt mà, không làm gián đoạn vị trí cuộn trang. | Cần chạy 3 truy vấn SQL tổng hợp. | **Rủi ro**: Query chậm nếu cơ sở dữ liệu lớn.<br>**Khắc phục**: Đánh chỉ mục Index trên `user_id` ở các bảng `reading_plan_sessions` & `spaced_review_items`. |

---

## 💻 4. Mã nguồn Triển khai Chi tiết (Full Source Code Guide)

### A. Phân hệ Backend (`triam-backend`)

#### 1. Thêm Schemas DTO trong `app/schemas/admin.py`
```python
class AdminUserStatusUpdatePayload(BaseModel):
    is_active: bool
    ban_reason: str | None = Field(default=None, max_length=255)


class AdminUserStatusUpdateResponse(BaseModel):
    user_id: uuid.UUID
    is_active: bool
    message: str


class AdminUserDirectNotifyPayload(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=500)
    data: dict[str, str] | None = None


class AdminUserDirectNotifyResponse(BaseModel):
    user_id: uuid.UUID
    delivered: bool
    message: str


class AdminUserStatsResponse(BaseModel):
    user_id: uuid.UUID
    display_name: str | None = None
    email: str | None = None
    total_audio_seconds: int = 0
    total_hours_listened: float = 0.0
    total_sessions_completed: int = 0
    total_units_completed: int = 0
    total_flashcards_mastered: int = 0
    books_owned_count: int = 0
    created_at: str | None = None
    last_active_at: str | None = None
```

#### 2. Thêm Logic Nghiệp vụ trong `app/services/admin_service.py`
```python
def update_admin_user_status(
    session: Session,
    target_user_id: uuid.UUID,
    is_active: bool,
    ban_reason: str | None,
    admin_user_id: uuid.UUID,
) -> AdminUserStatusUpdateResponse:
    if target_user_id == admin_user_id:
        raise BadRequestError("Bạn không thể tự khóa tài khoản của chính mình.")

    try:
        if is_active:
            supabase.auth.admin.unban_user(str(target_user_id))
            msg = "Đã mở khóa tài khoản người dùng."
        else:
            supabase.auth.admin.ban_user(str(target_user_id), ban_duration="876000h")
            msg = f"Đã khóa tài khoản người dùng.{' Lý do: ' + ban_reason if ban_reason else ''}"
    except Exception as exc:
        log.error(f"Lỗi thao tác Supabase Auth Admin ban/unban user {target_user_id}: {exc}")
        raise ExternalServiceError(f"Không thể cập nhật trạng thái tài khoản: {str(exc)}")

    create_admin_audit_log(
        session,
        admin_user_id=admin_user_id,
        action="user.unban" if is_active else "user.ban",
        target_type="user",
        target_id=target_user_id,
        metadata={"is_active": is_active, "ban_reason": ban_reason},
    )
    session.commit()

    return AdminUserStatusUpdateResponse(
        user_id=target_user_id,
        is_active=is_active,
        message=msg,
    )


def send_admin_user_direct_notification(
    session: Session,
    target_user_id: uuid.UUID,
    payload: AdminUserDirectNotifyPayload,
    admin_user_id: uuid.UUID,
) -> AdminUserDirectNotifyResponse:
    from app.services.fcm_service import send_fcm_notification

    # 1. Gửi Push qua FCM
    send_fcm_notification(
        session,
        user_id=target_user_id,
        title=payload.title,
        body=payload.body,
        data=payload.data,
    )

    # 2. Tạo bản ghi UserNotification để lưu hộp thư
    notif = UserNotification(
        user_id=target_user_id,
        title=payload.title,
        body=payload.body,
        type="admin_announcement",
        is_read=False,
    )
    session.add(notif)
    session.commit()

    create_admin_audit_log(
        session,
        admin_user_id=admin_user_id,
        action="user.send_notification",
        target_type="user",
        target_id=target_user_id,
        metadata={"title": payload.title},
    )
    session.commit()

    return AdminUserDirectNotifyResponse(
        user_id=target_user_id,
        delivered=True,
        message="Đã phát thông báo thành công đến thiết bị người dùng.",
    )


def get_admin_user_learning_stats(
    session: Session,
    target_user_id: uuid.UUID,
) -> AdminUserStatsResponse:
    from app.models.db_models import ReadingPlanSession, SpacedReviewItem, Book, LearningUnit
    from app.repositories.admin_repo import auth_users

    # Lấy thông tin user cơ bản
    user_row = session.exec(
        select(auth_users.c.email, auth_users.c.created_at, auth_users.c.raw_user_meta_data)
        .where(auth_users.c.id == target_user_id)
    ).first()

    if not user_row:
        raise BadRequestError("Không tìm thấy người dùng.")

    email, created_at, meta = user_row
    meta_dict = meta if isinstance(meta, dict) else {}
    display_name = meta_dict.get("name") or meta_dict.get("full_name")

    # Thống kê sessions
    total_sessions_completed = int(session.exec(
        select(func.count(ReadingPlanSession.id))
        .where(ReadingPlanSession.user_id == target_user_id, ReadingPlanSession.status == "completed")
    ).one() or 0)

    # Thống kê units hoàn thành
    total_units_completed = int(session.exec(
        select(func.count(LearningUnit.id))
        .where(LearningUnit.user_id == target_user_id, LearningUnit.status == "ready")
    ).one() or 0)

    # Thống kê audio nghe
    total_audio_seconds = int(session.exec(
        select(func.coalesce(func.sum(LearningUnit.estimated_audio_seconds), 0))
        .where(LearningUnit.user_id == target_user_id, LearningUnit.status == "ready")
    ).one() or 0)

    # Thống kê flashcards đã thuộc
    total_flashcards_mastered = int(session.exec(
        select(func.count(SpacedReviewItem.id))
        .where(SpacedReviewItem.user_id == target_user_id, SpacedReviewItem.review_stage >= 4)
    ).one() or 0)

    books_owned_count = int(session.exec(
        select(func.count(Book.id)).where(Book.user_id == target_user_id)
    ).one() or 0)

    return AdminUserStatsResponse(
        user_id=target_user_id,
        display_name=display_name,
        email=email,
        total_audio_seconds=total_audio_seconds,
        total_hours_listened=round(total_audio_seconds / 3600.0, 1),
        total_sessions_completed=total_sessions_completed,
        total_units_completed=total_units_completed,
        total_flashcards_mastered=total_flashcards_mastered,
        books_owned_count=books_owned_count,
        created_at=created_at.isoformat() if created_at else None,
    )
```

#### 3. Đăng ký Endpoints trong `app/api/v1/routers/admin.py`
```python
@router.patch("/users/{user_id}/status", response_model=AdminUserStatusUpdateResponse)
def update_admin_user_status(
    user_id: uuid.UUID,
    payload: AdminUserStatusUpdatePayload,
    admin_user: AdminUserDependency,
    session: Annotated[Session, Depends(get_session)],
):
    return admin_service.update_admin_user_status(
        session,
        target_user_id=user_id,
        is_active=payload.is_active,
        ban_reason=payload.ban_reason,
        admin_user_id=admin_user.user_id,
    )


@router.post("/users/{user_id}/notify", response_model=AdminUserDirectNotifyResponse)
def send_admin_user_notification(
    user_id: uuid.UUID,
    payload: AdminUserDirectNotifyPayload,
    admin_user: AdminUserDependency,
    session: Annotated[Session, Depends(get_session)],
):
    return admin_service.send_admin_user_direct_notification(
        session,
        target_user_id=user_id,
        payload=payload,
        admin_user_id=admin_user.user_id,
    )


@router.get("/users/{user_id}/stats", response_model=AdminUserStatsResponse)
def read_admin_user_stats(
    user_id: uuid.UUID,
    admin_user: AdminUserDependency,
    session: Annotated[Session, Depends(get_session)],
):
    return admin_service.get_admin_user_learning_stats(session, target_user_id=user_id)
```

---

### B. Phân hệ Frontend (`triam-admin-web`)

#### 1. Thêm Types & Helpers trong `lib/api.ts`
```typescript
export type AdminUserStatsResponse = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  total_audio_seconds: number;
  total_hours_listened: number;
  total_sessions_completed: number;
  total_units_completed: number;
  total_flashcards_mastered: number;
  books_owned_count: number;
  created_at: string | null;
};

export async function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
  banReason?: string
): Promise<{ user_id: string; is_active: boolean; message: string }> {
  return adminFetch(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive, ban_reason: banReason }),
  });
}

export async function sendAdminUserNotification(
  userId: string,
  title: string,
  body: string
): Promise<{ user_id: string; delivered: boolean; message: string }> {
  return adminFetch(`/users/${userId}/notify`, {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
}

export async function getAdminUserStats(userId: string): Promise<AdminUserStatsResponse> {
  return adminFetch(`/users/${userId}/stats`);
}
```

#### 2. Cập nhật trang `/users` ([app/(admin)/users/page.tsx](file:///w:/WorkSpace_IT/_CAPSTON_PROJECT/triam-admin-web/app/%28admin%29/users/page.tsx))
Bổ sung công tắc Toggle Active/Disabled, Modal Gửi Push và Slide-over Analytics Drawer.

---

## ⚠️ 5. Điều chỉnh bắt buộc sau khi rà soát codebase

Các mẫu ở phần 4 là hướng dẫn ý tưởng. Khi triển khai, **phải áp dụng các điều chỉnh dưới đây**; các đoạn mẫu mâu thuẫn với phần này không được dùng nguyên trạng.

### 5.1. Khóa/mở khóa tài khoản

1. SDK `supabase-py` đang dùng (2.28.3) không có `ban_user()` hoặc `unban_user()`. Dùng API hiện có:
   ```python
   supabase.auth.admin.update_user_by_id(
       str(target_user_id),
       {"ban_duration": "876000h" if not is_active else "none"},
   )
   ```
2. Không tuyên bố “vô hiệu hóa JWT ngay lập tức”. JWT đã phát hành vẫn có thể hợp lệ đến khi hết hạn; hệ thống hiện kiểm tra user qua Auth server trên mỗi API request nên phải kiểm thử hành vi thực tế sau khi ban. Nếu yêu cầu chặn tuyệt đối ngay lập tức, cần có danh sách `disabled_user_ids` trong DB và kiểm tra nó trong dependency `get_current_user`.
3. Mở rộng `auth_users`/`AdminUserListItem` để trả `banned_until`, `is_active` (suy ra từ `banned_until`) cho UI. Không có trường này thì toggle không có trạng thái tin cậy sau khi tải lại trang.
4. Xác nhận target tồn tại trước khi gọi Supabase. Chặn cả tài khoản hiện tại **và mọi tài khoản có trong `admin_users`** (trừ khi sau này có cơ chế `super_admin` rõ ràng), tránh một admin khóa admin khác.
5. UI dùng nút hành động “Khóa tài khoản”/“Mở khóa tài khoản”, không đổi toggle ngay lập tức. Khóa phải có modal xác nhận, hiển thị email/tên người bị khóa, lý do tùy chọn, trạng thái đang gửi và hoàn tác dữ liệu khi API lỗi. Sau khi thành công, invalidate/refetch query `adminUsers`.

### 5.2. Gửi thông báo trực tiếp

1. Model hiện tại không có `UserNotification.is_read`; dùng `read_at=None`. `type="admin_announcement"` cũng chưa có trong `NotificationType`, nên sẽ lỗi enum. Thêm `NotificationType.ADMIN_ANNOUNCEMENT` và migration enum tương ứng, hoặc dùng một type đã được định nghĩa với ý nghĩa phù hợp.
2. `send_fcm_notification()` hiện nuốt lỗi FCM và không trả số thiết bị gửi thành công. Vì vậy response `delivered=True` là sai. Chọn một trong hai hợp đồng API:
   - Khuyến nghị: ghi `NotificationOutbox` (`channel=ALL`) và audit log trong một transaction, trả `status="queued"`; worker hiện có thực hiện gửi và retry.
   - Nếu bắt buộc gửi đồng bộ: sửa FCM service trả `targeted_count`, `success_count`, `failure_count`; response phải phản ánh các số này, không khẳng định đã phát khi user không có thiết bị/token lỗi.
3. Với hướng outbox, bổ sung copy handler nhận `title`/`body` tùy biến cho `ADMIN_ANNOUNCEMENT`, `idempotency_key` cho từng lần gửi và lưu `action_type`/`action_payload` nếu cần deep link. Không commit `UserNotification` và audit log thành hai lần tách rời.
4. Modal FE cần giới hạn và hiển thị bộ đếm theo contract (title ≤120, body ≤500), label đầy đủ, focus/error inline, khóa nút Gửi khi request đang chạy. Có xác nhận trước khi gửi để chống gửi nhầm/nhấn đôi.

### 5.3. Analytics: dùng dữ liệu học thực tế, không dùng dữ liệu tạo nội dung

Các query mẫu dùng `LearningUnit.status == "ready"` và `estimated_audio_seconds`. Đây là trạng thái xử lý nội dung của sách, không phải tiến độ của người dùng, nên số giờ nghe và số bài hoàn tất sẽ sai.

| Chỉ số hiển thị | Nguồn đúng | Quy tắc |
| :--- | :--- | :--- |
| Thời lượng đã nghe | `LearningUnitProgress.listened_ms` | `SUM(listened_ms)`, quy đổi giờ bằng `/ 3_600_000`; đặt tên field rõ đơn vị, ví dụ `total_listened_ms`. |
| Bài học hoàn tất | `LearningUnitProgress` | `COUNT` với `status == COMPLETED`. |
| Phiên học hoàn tất | `ReadingPlanSession` | `COUNT` với `status == "completed"`. |
| Lượt ôn tập hoàn tất | `SpacedReviewItem` | `COUNT` với `status == COMPLETED`. Không có `review_stage`; không gọi chỉ số này là “flashcard đã thuộc” nếu chưa bổ sung định nghĩa/model riêng. |
| Hoạt động học gần nhất | `LearningUnitProgress.last_activity_at` | `MAX(last_activity_at)` và thực sự gán vào response. |

Thay `total_flashcards_mastered` bằng `total_reviews_completed` trong DTO/copy UI. Bổ sung index migration `(user_id, status)` cho `learning_unit_progress` và `spaced_review_items`; `reading_plan_sessions` đã có index `(user_id, status)`. Trả `404` khi user không tồn tại, không dùng `400`.

### 5.4. Hành vi UI và quyền truy cập

1. Thêm cột **Thao tác** với ba nút: Xem thống kê, Gửi thông báo, Khóa/Mở khóa. Các nút icon-only phải có `aria-label`, focus-visible rõ ràng và tooltip.
2. Drawer cần `role="dialog"`, focus trap, đóng bằng Escape/click backdrop, trả focus về nút mở và hiển thị loading/error/empty state. Đồng bộ user đang mở vào URL (ví dụ `?user_id=…&panel=analytics`) để back/refresh vẫn giữ được ngữ cảnh.
3. Mọi endpoint mới tiếp tục dùng `AdminUserDependency`; audit log phải ghi action, admin id, target id, kết quả và lý do (không ghi nội dung push đầy đủ nếu đó là dữ liệu nhạy cảm).
4. Xử lý người dùng không có thiết bị, chưa từng học hoặc số liệu bằng 0 như trạng thái hợp lệ; không hiển thị như lỗi.

---

## 🧪 6. Kịch bản Kiểm thử & Nghiệm thu (Verification Plan)

1. **Python Compilation Check**: `uv run python -m py_compile app/schemas/admin.py app/services/admin_service.py app/api/v1/routers/admin.py`
2. **TypeScript Type Safety**: `npx tsc --noEmit`
3. **Next.js Production Build**: `pnpm build`
4. **Thử nghiệm thủ công trên UI**:
   - Bấm **Khóa tài khoản** $\rightarrow$ xác nhận modal, trạng thái danh sách cập nhật sau khi refetch, người dùng không thể lấy phiên mới. Kiểm thử self-ban và ban một admin khác đều bị chặn.
   - Nhập Tiêu đề & Nội dung bấm **Gửi Push** $\rightarrow$ xác nhận bản ghi inbox/outbox được tạo, trạng thái queued/delivery đúng với contract và điện thoại nhận FCM khi có token hợp lệ.
   - Click nút **Icon 📊 Thống kê** $\rightarrow$ Xác nhận Drawer trượt ra hiển thị chỉ số giờ nghe và số flashcards chuẩn xác.
5. **Backend automated tests**:
   - 403 với non-admin; 404 với user không tồn tại; chặn tự khóa/chỉnh tài khoản admin; kiểm tra đúng `ban_duration` khi khóa/mở.
   - Notification: tạo đúng enum/inbox-or-outbox/audit log, không ghi trùng khi lặp request idempotent, và phản hồi đúng khi không có device token hoặc FCM lỗi.
   - Analytics: seed `LearningUnitProgress.listened_ms`, progress/session/review ở nhiều trạng thái rồi xác nhận chỉ đếm trạng thái `completed`; không dùng `LearningUnit.estimated_audio_seconds`.
6. **Frontend interaction checks**: modal confirmation, loading/error state, focus/Escape của drawer, action buttons có accessible name, và danh sách refresh sau mutation.
