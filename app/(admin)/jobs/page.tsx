"use client";

import React, { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  adminFetch,
  AdminJobListItem,
  AdminJobsResponse,
  getErrorMessage,
  ProcessingJobStatus,
  ProcessingJobType,
} from "@/lib/api";
import {
  Cpu,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Copy,
  Calendar,
  AlertTriangle,
  Play,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Initial values from URL queries for deep linking
  const initialStatus = (searchParams.get("status") as ProcessingJobStatus) || "";
  const initialJobType = (searchParams.get("job_type") as ProcessingJobType) || "";
  const initialUser = searchParams.get("user_id") || "";
  const initialBook = searchParams.get("book_id") || "";

  // State Management
  const [status, setStatus] = useState<ProcessingJobStatus | "">(initialStatus);
  const [jobType, setJobType] = useState<ProcessingJobType | "">(initialJobType);
  const [userId, setUserId] = useState(initialUser);
  const [bookId, setBookId] = useState(initialBook);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Modal confirm state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Formulate query URL
  const buildQueryPath = () => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    if (status) params.set("status", status);
    if (jobType) params.set("job_type", jobType);
    if (userId.trim()) params.set("user_id", userId.trim());
    if (bookId.trim()) params.set("book_id", bookId.trim());
    return `/jobs?${params.toString()}`;
  };

  // React Query Fetch
  const {
    data: jobsData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminJobsResponse>({
    queryKey: ["adminJobs", limit, offset, status, jobType, userId, bookId],
    queryFn: () => adminFetch<AdminJobsResponse>(buildQueryPath()),
    placeholderData: keepPreviousData,
  });

  // Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (jobId: string) =>
      adminFetch<{ job: AdminJobListItem; message: string }>(
        `/jobs/${jobId}/retry`,
        { method: "POST" }
      ),
    onSuccess: (data) => {
      toast.success(data.message || "Đã gửi yêu cầu chạy lại Job thành công.");
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setShowConfirmModal(false);
      setSelectedJobId(null);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Lỗi khi chạy lại Job."));
      setShowConfirmModal(false);
      setSelectedJobId(null);
    },
  });

  const handleResetFilters = () => {
    setStatus("");
    setJobType("");
    setUserId("");
    setBookId("");
    setOffset(0);
    router.replace("/jobs");
    toast.info("Đã đặt lại các bộ lọc tiến trình");
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handlePageChange = (newOffset: number) => {
    if (newOffset >= 0) {
      setOffset(newOffset);
    }
  };

  const handleRetryClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowConfirmModal(true);
  };

  const handleConfirmRetry = () => {
    if (selectedJobId) {
      retryMutation.mutate(selectedJobId);
    }
  };

  const truncateId = (id: string | null) => {
    if (!id) return "—";
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statusVal: string) => {
    const badges: Record<string, { label: string; style: string }> = {
      queued: { label: "Hàng chờ", style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" },
      processing: { label: "Đang chạy", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      partial_ready: { label: "Xong một phần", style: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
      ready: { label: "Sẵn sàng", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      error: { label: "Gặp lỗi", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
      cancelled: { label: "Đã hủy", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    };

    const badge = badges[statusVal] || { label: statusVal, style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" };
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${badge.style}`}>
        {badge.label}
      </span>
    );
  };

  const items = jobsData?.items || [];
  const total = jobsData?.total || 0;

  const hasNext = offset + items.length < total;
  const hasPrev = offset > 0;
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = offset + items.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Tiến trình hệ thống (Jobs)
          </h1>
          <p className="mt-1.5 text-sm text-zinc-450">
            Giám sát các tác vụ xử lý tài liệu, nạp dữ liệu, chuyển đổi TTS và kiểm duyệt
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-lg backdrop-blur-xl md:grid-cols-2 lg:grid-cols-5 items-end">
        {/* Status Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Trạng thái
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ProcessingJobStatus);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="queued">Hàng chờ (Queued)</option>
            <option value="processing">Đang chạy (Processing)</option>
            <option value="partial_ready">Xong một phần</option>
            <option value="ready">Thành công (Ready)</option>
            <option value="error">Gặp lỗi (Error)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>
        </div>

        {/* Job Type Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Loại Job
          </label>
          <select
            value={jobType}
            onChange={(e) => {
              setJobType(e.target.value as ProcessingJobType);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
          >
            <option value="">Tất cả loại Job</option>
            <option value="upload">Upload</option>
            <option value="generate_plan">Generate Plan</option>
            <option value="switch_mode">Switch Mode</option>
            <option value="notification">Notification</option>
            <option value="review">Review</option>
          </select>
        </div>

        {/* Book ID filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Book ID
          </label>
          <input
            type="text"
            value={bookId}
            onChange={(e) => {
              setBookId(e.target.value);
              setOffset(0);
            }}
            placeholder="Mã sách…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-white placeholder-zinc-650 outline-none focus:border-violet-500"
          />
        </div>

        {/* User ID filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setOffset(0);
            }}
            placeholder="Mã người dùng…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-white placeholder-zinc-650 outline-none focus:border-violet-500"
          />
        </div>

        {/* Reset Buttons */}
        <div>
          <button
            onClick={handleResetFilters}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white py-2.5 px-4 text-xs font-semibold transition-all active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            Làm lại bộ lọc
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 shadow-lg backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-8">
            <div className="h-8 w-full bg-zinc-850 rounded-lg animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 w-full bg-zinc-900/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Lỗi tải danh sách tiến trình</h2>
            <p className="text-xs text-zinc-405 max-w-xs mb-6">
              {error instanceof Error ? error.message : "Vui lòng tải lại trang hoặc kiểm tra kết nối."}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-4 text-sm transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-zinc-300">Không tìm thấy Jobs</h2>
            <p className="text-xs text-zinc-500 mt-1">Không có công việc nào khớp với cấu hình lọc hiện tại.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4">Job ID / Type</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-center">Chế độ</th>
                  <th className="px-6 py-4 max-w-xs">Tiến độ</th>
                  <th className="px-6 py-4 text-center">Đã hoàn thành</th>
                  <th className="px-6 py-4">Book ID</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Ngày cập nhật</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {items.map((job) => {
                  const canRetry =
                    ["error", "cancelled"].includes(job.status) &&
                    ["generate_plan", "switch_mode"].includes(job.job_type);

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-zinc-800/20 transition-colors group text-xs"
                    >
                      {/* Job ID / Type */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                            <span className="font-semibold">{truncateId(job.id)}</span>
                            <button
                              onClick={() => handleCopy(job.id, "Job ID")}
                              className="rounded p-0.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wide">
                            {job.job_type}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">{getStatusBadge(job.status)}</td>

                      {/* Mode */}
                      <td className="px-6 py-4 text-center capitalize font-semibold text-zinc-350">
                        {job.mode || "—"}
                      </td>

                      {/* Progress Bar & Current Step */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="font-mono font-bold">{job.progress_percent}%</span>
                            {job.failed_units > 0 && (
                              <span className="text-red-400 font-semibold font-mono">
                                Lỗi: {job.failed_units}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-32 rounded-full bg-zinc-950 overflow-hidden border border-zinc-850">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                job.status === "error"
                                  ? "bg-rose-500"
                                  : job.status === "ready"
                                  ? "bg-emerald-500"
                                  : "bg-violet-500"
                              }`}
                              style={{ width: `${job.progress_percent}%` }}
                            />
                          </div>
                          {job.current_step && (
                            <span className="text-[10px] text-zinc-500 truncate block max-w-[200px]" title={job.current_step}>
                              {job.current_step}
                            </span>
                          )}
                          {job.error_message && (
                            <span className="text-[10px] text-rose-400 truncate block max-w-[200px] font-mono" title={job.error_message}>
                              {job.error_message}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Units count done / total */}
                      <td className="px-6 py-4 text-center font-mono font-semibold text-zinc-300">
                        {job.done_units} / {job.total_units}
                      </td>

                      {/* Book ID Link */}
                      <td className="px-6 py-4 font-mono text-zinc-450">
                        {job.book_id ? (
                          <div className="flex items-center gap-1">
                            <span
                              onClick={() => router.push(`/books/${job.book_id}`)}
                              className="text-zinc-300 hover:text-violet-400 transition-colors cursor-pointer font-bold"
                              title="Xem chi tiết sách"
                            >
                              {truncateId(job.book_id)}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* User ID Link */}
                      <td className="px-6 py-4 font-mono text-zinc-450">
                        {job.user_id ? (
                          <span
                            onClick={() => router.push(`/books?user_id=${job.user_id}`)}
                            className="text-zinc-300 hover:text-violet-400 transition-colors cursor-pointer"
                            title="Lọc sách theo user này"
                          >
                            {truncateId(job.user_id)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="px-6 py-4 text-zinc-405 font-semibold font-variant-numeric: tabular-nums">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                          <span>{formatDate(job.updated_at)}</span>
                        </div>
                      </td>

                      {/* Row actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.book_id && (
                            <button
                              onClick={() => router.push(`/books/${job.book_id}`)}
                              className="rounded-lg p-1.5 text-zinc-450 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-700 transition-all"
                              title="Chi tiết sách liên quan"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRetryClick(job.id)}
                            disabled={!canRetry || retryMutation.isPending}
                            className="rounded-lg p-1.5 text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/10 transition-all disabled:pointer-events-none disabled:opacity-30"
                            title={canRetry ? "Chạy lại Job" : "Job không hỗ trợ chạy lại từ admin"}
                          >
                            <Play className="h-3.5 w-3.5 fill-violet-400/20" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!isLoading && !isError && total > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/40 px-6 py-4 text-xs font-semibold text-zinc-400 select-none">
            <div>
              Hiển thị <span className="text-zinc-200 font-bold">{startNum}</span> đến{" "}
              <span className="text-zinc-200 font-bold">{endNum}</span> trên tổng số{" "}
              <span className="text-zinc-200 font-bold">{total}</span> Jobs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(offset - limit)}
                disabled={!hasPrev}
                className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white transition-all disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(offset + limit)}
                disabled={!hasNext}
                className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white transition-all disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Yêu cầu xác nhận</h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn chạy lại Job này không? Quy trình sẽ bắt đầu thực thi lại từ hàng đợi hệ thống.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedJobId(null);
                }}
                className="rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-300 font-semibold py-2 px-4 text-xs hover:bg-zinc-850 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRetry}
                disabled={retryMutation.isPending}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 text-xs transition-all flex items-center gap-1"
              >
                {retryMutation.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                Xác nhận chạy lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
