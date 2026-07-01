import { getValidToken } from "./supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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

export type AdminBookDetailResponse = AdminBookListItem & {
  latest_job: AdminJobListItem | null;
  learning_units_by_status: Record<string, number>;
  segment_count: number;
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

  if (!(init?.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

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
    throw new Error(body?.detail ?? "ADMIN_API_ERROR");
  }

  return body as T;
}

export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
