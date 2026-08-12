import { getValidToken } from "./supabase";

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const API_BASE_URL = rawApiBaseUrl.replace("localhost", "127.0.0.1");

// TypeScript types from API Contract
export type BookStatus =
  | "draft"
  | "processing"
  | "partial_ready"
  | "ready"
  | "error";

export type DocumentType = "pdf" | "epub" | "docx";

export type PlanMode = "full" | "pareto";

export type ProcessingJobStatus =
  | "queued"
  | "processing"
  | "partial_ready"
  | "ready"
  | "completed"
  | "error"
  | "cancelled";

export type ProcessingJobType =
  | "upload"
  | "generate_plan"
  | "switch_mode"
  | "notification"
  | "review";

export type AdminMeResponse = {
  user_id: string;
  email: string | null;
  role: string;
  is_active: boolean;
};

export type AdminDashboardResponse = {
  user_count: number;
  book_count: number;
  job_count: number;
  books_by_status: Record<string, number>;
  jobs_by_status: Record<string, number>;
  failed_jobs_last_24h: number;
  estimated_input_tokens_last_30d: number;
  estimated_audio_seconds_last_30d: number;
};

export type AdminUserListItem = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  banned_until: string | null;
  account_created_at: string | null;
  last_sign_in_at: string | null;
  book_count: number;
  job_count: number;
  notification_count: number;
  last_activity_at: string | null;
};

export type AdminBookListItem = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  document_type: string | null;
  status: string | null;
  total_sections: number | null;
  total_units: number | null;
  error_message: string | null;
  is_shared?: boolean;
  parent_shared_id?: string | null;
  archived_at?: string | null;
  clone_count?: number;
  can_permanently_delete?: boolean;
  has_full_mode?: boolean;
  has_pareto_mode?: boolean;
  user_email?: string | null;
  user_display_name?: string | null;
  user_avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminJobListItem = {
  id: string;
  user_id: string;
  book_id: string | null;
  job_type: ProcessingJobType;
  status: ProcessingJobStatus;
  mode: PlanMode | null;
  progress_percent: number;
  current_step: string | null;
  total_units: number;
  done_units: number;
  failed_units: number;
  estimated_input_tokens: number | null;
  estimated_audio_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type AdminBookOwnerInfo = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_created_at: string | null;
  last_sign_in_at: string | null;
};

export type AdminBookSectionListItem = {
  id: string;
  section_index: number;
  title: string;
  level: number;
  path: string;
  text_char_count: number;
  page_start: number | null;
  page_end: number | null;
  modes: string[];
  chunk_count: number;
  has_text: boolean;
};

export type AdminSectionChunkItem = {
  id: number;
  chunk_index: number;
  content: string;
  search_text: string;
  embedding_model: string;
  embedding_version: string;
  char_count: number;
  token_count: number | null;
  has_embedding: boolean;
};

export type AdminBookSectionDetailResponse = {
  id: string;
  section_index: number;
  title: string;
  level: number;
  path: string;
  text_content: string | null;
  text_char_count: number;
  page_start: number | null;
  page_end: number | null;
  chunks: AdminSectionChunkItem[];
};

export type AdminBookDetailResponse = AdminBookListItem & {
  file_url?: string | null;
  latest_job: AdminJobListItem | null;
  learning_units_by_status: Record<string, number>;
  segment_count: number;
  owner_info?: AdminBookOwnerInfo | null;
  ai_summary?: Record<string, any> | null;
  ai_summary_status?: string;
  ai_summary_error?: string | null;
};

export type AdminAuditLogItem = {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PaginatedResponse<T> = {
  total: number;
  limit: number;
  offset: number;
  items: T[];
};

export type AdminUsersResponse = PaginatedResponse<AdminUserListItem>;
export type AdminBooksResponse = PaginatedResponse<AdminBookListItem>;
export type AdminJobsResponse = PaginatedResponse<AdminJobListItem>;
export type AdminAuditLogsResponse = PaginatedResponse<AdminAuditLogItem>;

export type AdminUserStatsResponse = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  total_listened_ms: number;
  total_hours_listened: number;
  total_sessions_completed: number;
  total_units_completed: number;
  total_reviews_completed: number;
  books_owned_count: number;
  created_at: string | null;
  last_active_at: string | null;
};

export type AdminUserStatusUpdateResponse = {
  user_id: string;
  is_active: boolean;
  banned_until: string | null;
  message: string;
};

export type AdminUserDirectNotifyResponse = {
  user_id: string;
  outbox_id: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled" | "skipped";
  message: string;
};

export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
  tokenOverride?: string,
): Promise<T> {
  const token = tokenOverride || (await getValidToken());

  if (!token) {
    throw new Error("NO_SESSION");
  }

  const url = path.startsWith("/api/")
    ? `${API_BASE_URL}${path}`
    : `${API_BASE_URL}/api/v1/admin${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> ?? {}),
  };

  if (!(init?.body instanceof FormData) && init?.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers,
    });

    if (res.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (res.status === 403) {
      throw new Error("ADMIN_FORBIDDEN");
    }

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(body?.detail ?? `ADMIN_API_ERROR (${res.status})`);
    }

    return body as T;
  } catch (err) {
    console.error(`[adminFetch Failed] ${init?.method || "GET"} ${url}:`, err);
    throw err;
  }
}

export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
  banReason?: string,
): Promise<AdminUserStatusUpdateResponse> {
  return adminFetch<AdminUserStatusUpdateResponse>(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive, ban_reason: banReason || null }),
  });
}

export async function sendAdminUserNotification(
  userId: string,
  payload: { title: string; body: string; idempotencyKey: string },
): Promise<AdminUserDirectNotifyResponse> {
  return adminFetch<AdminUserDirectNotifyResponse>(`/users/${userId}/notify`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      idempotency_key: payload.idempotencyKey,
    }),
  });
}

export async function getAdminUserStats(userId: string): Promise<AdminUserStatsResponse> {
  return adminFetch<AdminUserStatsResponse>(`/users/${userId}/stats`);
}

export async function getBookSections(bookId: string): Promise<AdminBookSectionListItem[]> {
  return adminFetch<AdminBookSectionListItem[]>(`/books/${bookId}/sections`);
}

export async function getBookSectionDetail(
  bookId: string,
  sectionId: string
): Promise<AdminBookSectionDetailResponse> {
  return adminFetch<AdminBookSectionDetailResponse>(`/books/${bookId}/sections/${sectionId}`);
}

export async function getBookJobs(bookId: string): Promise<AdminJobListItem[]> {
  return adminFetch<AdminJobListItem[]>(`/books/${bookId}/jobs`);
}

export type AdminExportChunkItem = {
  chunk_index: number;
  content: string;
  embedding_model: string;
  embedding_version: string;
  token_count: number | null;
  has_embedding: boolean;
};

export type AdminExportSectionItem = {
  section_index: number;
  title: string;
  level: number;
  path: string;
  page_start: number | null;
  page_end: number | null;
  modes: string[];
  chunks: AdminExportChunkItem[];
};

export type AdminExportLearningUnitSegmentItem = {
  segment_index: number;
  text_content: string | null;
  audio_url: string | null;
  duration_ms: number | null;
};

export type AdminExportLearningUnitSourceItem = {
  section_index: number;
  section_title: string;
  section_path: string;
  page_start: number | null;
  page_end: number | null;
  source_order: number;
};

export type AdminExportLearningUnitItem = {
  unit_index: number;
  title: string;
  unit_type: string;
  status: string;
  source_text_char_count: number;
  estimated_tokens: number;
  estimated_audio_seconds: number;
  main_segment_count: number;
  planner_reason: string | null;
  error_message: string | null;
  review_text: string | null;
  review_audio_url: string | null;
  sources: AdminExportLearningUnitSourceItem[];
  segments: AdminExportLearningUnitSegmentItem[];
};

export type AdminExportLearningModeItem = {
  mode: PlanMode;
  total_units: number;
  units: AdminExportLearningUnitItem[];
};

export type AdminBookExportResponse = {
  export_format_version: number;
  selected_mode: PlanMode | null;
  book_id: string;
  title: string;
  author: string | null;
  document_type: string | null;
  sections: AdminExportSectionItem[];
  learning_modes: Partial<Record<PlanMode, AdminExportLearningModeItem>>;
};

export async function exportBookJson(
  bookId: string,
  mode?: PlanMode,
): Promise<AdminBookExportResponse> {
  const query = mode ? `?mode=${mode}` : "";
  return adminFetch<AdminBookExportResponse>(`/books/${bookId}/export-json${query}`);
}

export type AdminSegmentItem = {
  id: number;
  segment_index: number;
  audio_url: string | null;
  text_content: string | null;
  duration_ms: number | null;
};

export type AdminLearningUnitSourceItem = {
  section_id: string;
  section_index: number;
  section_title: string;
  section_path: string;
  page_start: number | null;
  page_end: number | null;
  source_order: number;
};

export type AdminLearningUnitItem = {
  id: string;
  unit_index: number;
  title: string;
  unit_type: string;
  mode: string;
  status: string;
  estimated_audio_seconds: number;
  main_segment_count: number;
  review_text: string | null;
  review_audio_url: string | null;
  planner_reason: string | null;
  segments: AdminSegmentItem[];
  sources: AdminLearningUnitSourceItem[];
};

export type AdminBookAudioUnitsResponse = {
  book_id: string;
  mode: string;
  total_units: number;
  units: AdminLearningUnitItem[];
};

export type AdminBookUpdateMetadataPayload = {
  title?: string;
  author?: string;
  is_shared?: boolean;
};

export type AdminBookLifecycleResponse = {
  book_id: string;
  clone_count: number;
  message: string;
};

export async function archiveSystemBook(bookId: string): Promise<AdminBookLifecycleResponse> {
  return adminFetch<AdminBookLifecycleResponse>(`/books/${bookId}/archive`, { method: "POST" });
}

export async function restoreSystemBook(bookId: string): Promise<AdminBookLifecycleResponse> {
  return adminFetch<AdminBookLifecycleResponse>(`/books/${bookId}/restore`, { method: "POST" });
}

export async function purgeSystemBook(bookId: string): Promise<AdminBookLifecycleResponse> {
  return adminFetch<AdminBookLifecycleResponse>(`/books/${bookId}/purge`, { method: "DELETE" });
}

export type AdminBookSummaryResponse = {
  book_id: string;
  status: string;
  ai_summary: Record<string, any> | null;
  error_message: string | null;
};

export async function getAdminBookAudioUnits(
  bookId: string,
  mode: string = "pareto"
): Promise<AdminBookAudioUnitsResponse> {
  return adminFetch<AdminBookAudioUnitsResponse>(`/books/${bookId}/audio-units?mode=${mode}`);
}

export async function updateAdminBookMetadata(
  bookId: string,
  payload: AdminBookUpdateMetadataPayload
): Promise<AdminBookDetailResponse> {
  return adminFetch<AdminBookDetailResponse>(`/books/${bookId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getAdminBookSummary(bookId: string): Promise<AdminBookSummaryResponse> {
  return adminFetch<AdminBookSummaryResponse>(`/books/${bookId}/summary`);
}

export async function regenerateAdminBookSummary(
  bookId: string
): Promise<{ message: string; status: string }> {
  return adminFetch<{ message: string; status: string }>(`/books/${bookId}/summary/regenerate`, {
    method: "POST",
  });
}

export type AdminBookUploadResponse = {
  book_id: string;
  job_id: string;
  message: string;
};

export type AdminCancelJobResponse = {
  job_id: string;
  status: string;
  message: string;
  rolled_back: boolean;
};

export async function adminUploadBook(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AdminBookUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (onProgress) {
    const token = await getValidToken();
    if (!token) {
      throw new Error("NO_SESSION");
    }

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${API_BASE_URL}/api/v1/admin/books/upload`);
      request.setRequestHeader("Authorization", `Bearer ${token}`);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      request.onerror = () => reject(new Error("Không thể kết nối tới máy chủ khi tải sách."));
      request.onabort = () => reject(new Error("Tải sách đã bị hủy."));
      request.onload = () => {
        let body: unknown = null;
        try {
          body = request.responseText ? JSON.parse(request.responseText) : null;
        } catch {
          reject(new Error("Máy chủ trả về dữ liệu không hợp lệ khi tải sách."));
          return;
        }
        if (request.status < 200 || request.status >= 300) {
          const errorBody = body as { detail?: string } | null;
          reject(new Error(errorBody?.detail ?? `ADMIN_API_ERROR (${request.status})`));
          return;
        }
        resolve(body as AdminBookUploadResponse);
      };

      request.send(formData);
    });
  }

  return adminFetch<AdminBookUploadResponse>("/books/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getAdminJobById(jobId: string): Promise<AdminJobListItem> {
  return adminFetch<AdminJobListItem>(`/jobs/${jobId}`);
}

export async function cancelAdminJob(jobId: string): Promise<AdminCancelJobResponse> {
  return adminFetch<AdminCancelJobResponse>(`/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}
