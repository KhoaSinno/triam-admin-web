# FE Admin Phase 2 - System Books UI/UX Plan

Date: 2026-06-02  
Status: **UI shell implemented, BE APIs pending**  
Route implemented: `/system-books`

---

## 1. Mục Tiêu

Phase 2 chuẩn bị UI cho chức năng quản trị sách hệ thống:

```text
Admin upload sách
-> hệ thống xử lý
-> admin kiểm tra metadata
-> admin publish sách vào catalog chung
-> user mobile có thể lấy sách từ hệ thống
```

Hiện tại frontend chỉ implement shell an toàn, không gọi API chưa tồn tại.

---

## 2. Đã Implement Ở FE

File:

```text
app/(admin)/system-books/page.tsx
app/(admin)/layout.tsx
```

Đã có:

- menu `Sách hệ thống`;
- route `/system-books`;
- cảnh báo rõ `BE pending`;
- workflow 4 bước;
- planned API list;
- checklist BE dependencies;
- disabled upload button;
- quick links sang `/books`, `/jobs?status=error`, `/audit-logs?action=job.retry`.

---

## 3. Vì Sao Chưa Gọi API

BE Phase 2 chưa implement các endpoint:

```text
GET  /api/v1/admin/system-books
POST /api/v1/admin/system-books/upload
POST /api/v1/admin/system-books/{book_id}/generate-plan
PATCH /api/v1/admin/system-books/{book_id}/metadata
POST /api/v1/admin/system-books/{book_id}/publish
POST /api/v1/admin/system-books/{book_id}/unpublish
```

FE không được tự dùng `/admin/books` để giả lập sách hệ thống, vì sách hệ thống cần:

- visibility/catalog fields;
- publish/unpublish audit;
- reader enrollment logic;
- user-specific reading plan;
- policy không lộ private user books.

---

## 4. Khi BE Phase 2 Xong, FE Sẽ Bật Gì

### 4.1 System Books List

Thay page shell bằng table:

- title;
- author;
- document type;
- processing status;
- visibility;
- category;
- published time;
- actions.

Filters:

- q;
- visibility;
- status;
- document_type;
- category.

### 4.2 Upload Dialog

Fields:

- file;
- title;
- author;
- description;
- category;
- tags;
- language.

UX:

- validate file selected;
- show warning: file cần outline/TOC/heading;
- upload success redirects to system book detail.

### 4.3 System Book Detail

Sections:

- metadata;
- processing latest job;
- catalog info;
- publish status;
- audit shortcut.

Actions:

- update metadata;
- generate plan/audio;
- publish;
- unpublish;
- retry failed job via existing job retry API.

### 4.4 Publish/Unpublish Confirmation

Publish requires confirm:

```text
Bạn có chắc muốn publish sách này ra catalog chung không?
```

Unpublish requires confirm:

```text
Sách sẽ bị ẩn khỏi catalog mới. User đã thêm sách trước đó không bị xóa dữ liệu.
```

---

## 5. Phase 1 Gaps Đã Fix Kèm Phase 2

Trong lúc verify Phase 1, đã fix:

- `pnpm lint` từ fail thành pass;
- bỏ `any` trong auth/login/mutation handlers;
- bỏ setState sync trong effects đọc query params;
- bỏ ref update trong render;
- ignore `.agents/**` khỏi eslint app runtime;
- `pnpm build` pass với Next 16.

---

## 6. Validation

Đã chạy:

```powershell
pnpm lint
pnpm build
```

Expected result:

```text
lint: pass
build: pass
```
