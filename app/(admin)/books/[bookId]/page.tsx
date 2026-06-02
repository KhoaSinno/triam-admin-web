"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch, AdminBookDetailResponse, AdminJobListItem } from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileCode,
  User,
  Info,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Play,
  Copy,
  Clock,
  Coins,
} from "lucide-react";
import { toast } from "sonner";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = params.bookId as string;
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch Book Detail Query
  const {
    data: book,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminBookDetailResponse>({
    queryKey: ["adminBookDetail", bookId],
    queryFn: () => adminFetch<AdminBookDetailResponse>(`/books/${bookId}`),
  });

  // Mutation to Retry Job
  const retryMutation = useMutation({
    mutationFn: (jobId: string) =>
      adminFetch<{ job: AdminJobListItem; message: string }>(
        `/jobs/${jobId}/retry`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data) => {
      toast.success(data.message || "Job đã được đưa vào hàng đợi xử lý lại.");
      // Invalidate queries to reload data
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail", bookId] });
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setShowConfirmModal(false);
      
      // Navigate to jobs filter by this job if possible
      if (data.job?.id) {
        router.push(`/jobs?book_id=${bookId}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Không thể khởi động lại job.");
      setShowConfirmModal(false);
    },
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handleRetryClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmRetry = () => {
    if (book?.latest_job?.id) {
      retryMutation.mutate(book.latest_job.id);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded-lg"></div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-96 bg-zinc-900/50 rounded-2xl p-6"></div>
          <div className="h-96 bg-zinc-900/50 rounded-2xl p-6"></div>
        </div>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Lỗi tải chi tiết cuốn sách</h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          {error instanceof Error ? error.message : "ID cuốn sách không tồn tại hoặc đã bị xóa."}
        </p>
        <button
          onClick={() => router.push("/books")}
          className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-4 text-sm transition-all"
        >
          Trở lại danh sách
        </button>
      </div>
    );
  }

  // Check Retry status
  const latestJob = book.latest_job;
  const canRetry =
    latestJob &&
    ["error", "cancelled"].includes(latestJob.status) &&
    ["generate_plan", "switch_mode"].includes(latestJob.job_type);

  const getStatusColor = (statusVal: string | null) => {
    if (!statusVal) return "text-zinc-400 border-zinc-800 bg-zinc-500/10";
    const colors: Record<string, string> = {
      draft: "text-zinc-400 border-zinc-800 bg-zinc-500/10",
      processing: "text-blue-400 border-blue-500/10 bg-blue-500/10",
      partial_ready: "text-cyan-400 border-cyan-500/10 bg-cyan-500/10",
      ready: "text-emerald-400 border-emerald-500/10 bg-emerald-500/10",
      error: "text-rose-450 border-rose-500/10 bg-rose-500/10",
      cancelled: "text-amber-400 border-amber-500/10 bg-amber-500/10",
      queued: "text-zinc-450 border-zinc-700 bg-zinc-800/10",
    };
    return colors[statusVal] || "text-zinc-400 border-zinc-800 bg-zinc-500/10";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Back Button / Refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/books")}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách sách
        </button>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Book title and Header status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {book.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-450">Tác giả: {book.author || "Không rõ"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold ${getStatusColor(book.status)}`}>
            {book.status?.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-455">
            <FileCode className="h-3.5 w-3.5 text-zinc-500" />
            {book.document_type?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Metadata & Processing summary */}
        <div className="md:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-md backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
              <Info className="h-4.5 w-4.5 text-violet-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thông tin tài liệu</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider block">ID Cuốn sách</span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                  <span className="truncate">{book.id}</span>
                  <button
                    onClick={() => handleCopy(book.id, "Book ID")}
                    className="p-1 rounded hover:bg-zinc-800 hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider block">User ID Chủ sở hữu</span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                  <span className="truncate">{book.user_id}</span>
                  <button
                    onClick={() => handleCopy(book.user_id, "User ID")}
                    className="p-1 rounded hover:bg-zinc-800 hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider block">Ngày khởi tạo</span>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{formatDate(book.created_at)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 uppercase tracking-wider block">Cập nhật lần cuối</span>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{formatDate(book.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Processing summary */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-md backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
              <BookOpen className="h-4.5 w-4.5 text-violet-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cấu trúc và Học liệu</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-center">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Tổng số Chương</span>
                <span className="text-2xl font-bold text-white mt-1 block font-mono">
                  {book.total_sections !== null ? book.total_sections : "—"}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-center">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Tổng số Units</span>
                <span className="text-2xl font-bold text-white mt-1 block font-mono">
                  {book.total_units !== null ? book.total_units : "—"}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-center">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Tổng Phân đoạn</span>
                <span className="text-2xl font-bold text-white mt-1 block font-mono">
                  {book.segment_count || 0}
                </span>
              </div>
            </div>

            {/* Learning units by status breakdown */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                Trạng thái chi tiết của Learning Units
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.keys(book.learning_units_by_status).length === 0 ? (
                  <p className="text-xs text-zinc-500 col-span-full italic">Không có dữ liệu unit.</p>
                ) : (
                  Object.entries(book.learning_units_by_status).map(([statusKey, val]) => (
                    <div
                      key={statusKey}
                      className="flex items-center justify-between border border-zinc-850 bg-zinc-950 px-3.5 py-2.5 rounded-lg text-xs"
                    >
                      <span className="font-semibold text-zinc-400 capitalize">{statusKey}</span>
                      <span className="font-bold text-white font-mono">{val}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Latest Job tracking info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-md backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tiến trình gần nhất</h2>
              </div>
            </div>

            {!latestJob ? (
              <div className="py-8 text-center text-xs text-zinc-500 italic">
                Chưa ghi nhận job xử lý nào cho tài liệu này.
              </div>
            ) : (
              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wide">Trạng thái Job</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold border ${getStatusColor(latestJob.status)}`}>
                    {latestJob.status}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wide">Loại tiến trình</span>
                  <span className="text-zinc-200 uppercase">{latestJob.job_type}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wide">Chế độ xử lý</span>
                  <span className="text-zinc-200 capitalize">{latestJob.mode || "Mặc định"}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase tracking-wide">Tiến độ chạy</span>
                    <span className="text-zinc-200 font-bold font-mono">{latestJob.progress_percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-850">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${latestJob.progress_percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase tracking-wide">Học liệu hoàn thành</span>
                  <span className="text-zinc-200 font-mono">
                    {latestJob.done_units} / {latestJob.total_units} (Lỗi: {latestJob.failed_units})
                  </span>
                </div>

                {latestJob.estimated_input_tokens && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase tracking-wide">Token Input</span>
                    <span className="text-zinc-200 font-mono flex items-center gap-1">
                      <Coins className="h-3 w-3 text-zinc-500" />
                      {new Intl.NumberFormat().format(latestJob.estimated_input_tokens)}
                    </span>
                  </div>
                )}

                {latestJob.estimated_audio_seconds && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase tracking-wide">Thời lượng âm thanh</span>
                    <span className="text-zinc-200 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {(latestJob.estimated_audio_seconds / 3600).toFixed(1)} giờ
                    </span>
                  </div>
                )}

                {/* Steps logs */}
                {latestJob.current_step && (
                  <div className="space-y-1 bg-zinc-950 p-3 rounded-lg border border-zinc-850 font-mono text-[10px] text-zinc-400">
                    <span className="text-zinc-500 block">BƯỚC HIỆN TẠI</span>
                    <p className="leading-relaxed break-words">{latestJob.current_step}</p>
                  </div>
                )}

                {/* Error log if failed */}
                {latestJob.error_message && (
                  <div className="space-y-1 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10 font-mono text-[10px] text-rose-350">
                    <span className="text-rose-400 block font-bold">CHI TIẾT LỖI</span>
                    <p className="leading-relaxed break-words">{latestJob.error_message}</p>
                  </div>
                )}

                {/* Operations Retry Button */}
                <div className="pt-2">
                  <button
                    onClick={handleRetryClick}
                    disabled={!canRetry || retryMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 px-4 transition-all active:scale-[0.98] disabled:pointer-events-none disabled:bg-zinc-800 disabled:text-zinc-500"
                  >
                    {retryMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-white" />
                        Chạy lại quy trình (Retry)
                      </>
                    )}
                  </button>

                  {!canRetry && latestJob && (
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">
                      * Chỉ job lỗi hoặc đã hủy mới có thể chạy lại.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Yêu cầu xác nhận</h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Bạn có chắc chắn muốn chạy lại quy trình xử lý của Job này không? Thao tác này sẽ cập nhật trạng thái Job về hàng chờ xử lý lại.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3.5">
              <button
                onClick={() => setShowConfirmModal(false)}
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
