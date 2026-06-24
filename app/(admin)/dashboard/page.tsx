"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminFetch, AdminDashboardResponse } from "@/lib/api";
import {
  Users,
  BookOpen,
  Cpu,
  AlertTriangle,
  Coins,
  Music,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();

  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminDashboardResponse>({
    queryKey: ["adminDashboard"],
    queryFn: () => adminFetch<AdminDashboardResponse>("/dashboard"),
    staleTime: 15 * 1000, // 15s cache
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const convertSecondsToHours = (seconds: number) => {
    return (seconds / 3600).toFixed(1);
  };

  const handleRefetch = async () => {
    try {
      await refetch();
      toast.success("Đã làm mới dữ liệu tổng quan");
    } catch {
      toast.error("Lỗi khi làm mới dữ liệu");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-zinc-800 rounded-xl"></div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-850 rounded-2xl p-6"></div>
          ))}
        </div>

        {/* Main Charts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 bg-zinc-900/50 border border-zinc-850 rounded-2xl p-6"></div>
          <div className="h-80 bg-zinc-900/50 border border-zinc-850 rounded-2xl p-6"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Không thể tải dữ liệu tổng quan</h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          {error instanceof Error ? error.message : "Vui lòng kiểm tra lại kết nối API."}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 px-5 text-sm transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </div>
    );
  }

  // Fallback defaults
  const data = dashboard || {
    user_count: 0,
    book_count: 0,
    job_count: 0,
    failed_jobs_last_24h: 0,
    estimated_input_tokens_last_30d: 0,
    estimated_audio_seconds_last_30d: 0,
    books_by_status: {},
    jobs_by_status: {},
  };

  // Color mappings for book & job status badges
  const bookColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    draft: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "Bản nháp (Draft)" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Đang xử lý" },
    partial_ready: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-450", label: "Sẵn sàng một phần" },
    ready: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Hoàn tất (Ready)" },
    error: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-450", label: "Lỗi hệ thống" },
  };

  const jobColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    queued: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "Chờ xử lý (Queued)" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Đang chạy" },
    partial_ready: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400", label: "Xong một phần" },
    ready: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Thành công" },
    error: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-500", label: "Gặp lỗi" },
    cancelled: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500", label: "Đã hủy" },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Bảng điều khiển
          </h1>
          <p className="mt-1.5 text-sm text-zinc-450">
            Tổng quan tài nguyên hệ thống và trạng thái tiến độ
          </p>
        </div>

        <button
          onClick={handleRefetch}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users */}
        <div
          onClick={() => router.push("/users")}
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-zinc-900/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-zinc-450 uppercase">
              Người dùng
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 transition-colors group-hover:bg-violet-600/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-white">
              {formatNumber(data.user_count)}
            </span>
            <span className="ml-2 text-xs text-zinc-450">hoạt động</span>
          </div>
        </div>

        {/* Card 2: Books */}
        <div
          onClick={() => router.push("/books")}
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-zinc-900/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-zinc-450 uppercase">
              Tổng số Sách
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 transition-colors group-hover:bg-violet-600/20">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-white">
              {formatNumber(data.book_count)}
            </span>
            <span className="ml-2 text-xs text-zinc-450">cuốn sách</span>
          </div>
        </div>

        {/* Card 3: Jobs */}
        <div
          onClick={() => router.push("/jobs")}
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-zinc-900/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-zinc-450 uppercase">
              Tiến trình xử lý (Jobs)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 transition-colors group-hover:bg-violet-600/20">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-white">
              {formatNumber(data.job_count)}
            </span>
            <span className="ml-2 text-xs text-zinc-450">jobs khởi chạy</span>
          </div>
        </div>

        {/* Card 4: Failed Jobs */}
        <div
          onClick={() => {
            if (data.failed_jobs_last_24h > 0) {
              router.push("/jobs?status=error");
            }
          }}
          className={`group relative overflow-hidden rounded-2xl border p-6 shadow-lg backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
            data.failed_jobs_last_24h > 0
              ? "border-red-500/20 bg-red-950/10 hover:border-red-500/40 hover:bg-red-950/20"
              : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-755 hover:bg-zinc-900/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-zinc-450 uppercase">
              Job Lỗi (24 giờ qua)
            </span>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                data.failed_jobs_last_24h > 0
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-zinc-800/50 border-zinc-800 text-zinc-500"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span
              className={`text-3xl font-bold tracking-tight ${
                data.failed_jobs_last_24h > 0 ? "text-red-400" : "text-white"
              }`}
            >
              {data.failed_jobs_last_24h}
            </span>
            {data.failed_jobs_last_24h > 0 && (
              <span className="ml-2.5 inline-flex items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/10 animate-pulse">
                CẦN XỬ LÝ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Usage Analytics Grid (Tokens & Audio) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Token Usage Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-6 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Ước tính Token Input (30 ngày)
              </h3>
              <p className="text-2xl font-bold text-white mt-0.5">
                {formatNumber(data.estimated_input_tokens_last_30d)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-900/50 border border-zinc-850 p-3.5">
            <TrendingUp className="h-4 w-4 text-violet-400 shrink-0" />
            <p className="text-xs leading-normal text-zinc-400">
              Lượng token dùng để truyền nạp nội dung sách đưa vào LLM xử lý phân chương, lập dàn ý và xây dựng sơ đồ câu hỏi.
            </p>
          </div>
        </div>

        {/* Audio Hours Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-6 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Ước tính thời lượng Audio (30 ngày)
              </h3>
              <p className="text-2xl font-bold text-white mt-0.5">
                {convertSecondsToHours(data.estimated_audio_seconds_last_30d)} <span className="text-sm font-medium text-zinc-450">giờ</span>
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-900/50 border border-zinc-850 p-3.5">
            <TrendingUp className="h-4 w-4 text-violet-400 shrink-0" />
            <p className="text-xs leading-normal text-zinc-400">
              Tổng số giờ âm thanh (học tập, tóm tắt, nội dung chính) đã được chuyển đổi thành công từ văn bản thông qua TTS Engine.
            </p>
          </div>
        </div>
      </div>

      {/* Distributions Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Books Distribution Chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">Sách theo trạng thái</h2>
            <p className="text-xs text-zinc-450">Trạng thái xử lý sách của tất cả người dùng</p>
          </div>

          <div className="space-y-4">
            {Object.keys(bookColors).map((status) => {
              const count = data.books_by_status[status] || 0;
              const total = Object.values(data.books_by_status).reduce((a, b) => a + b, 0) || 1;
              const percent = ((count / total) * 100).toFixed(0);
              const colorInfo = bookColors[status];

              return (
                <div
                  key={status}
                  onClick={() => router.push(`/books?status=${status}`)}
                  className="group/item flex flex-col gap-1.5 cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-zinc-900/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`h-2 w-2 rounded-full ${colorInfo.dot}`} />
                      <span className="text-zinc-350 transition-colors group-hover/item:text-white">
                        {colorInfo.label}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-300 font-mono">
                      {count} ({percent}%)
                    </span>
                  </div>
                  {/* Progress track */}
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${colorInfo.dot}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs Distribution Chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">Tiến trình (Jobs) theo trạng thái</h2>
            <p className="text-xs text-zinc-450">Trạng thái các đầu công việc lưu trong hệ thống</p>
          </div>

          <div className="space-y-4">
            {Object.keys(jobColors).map((status) => {
              const count = data.jobs_by_status[status] || 0;
              const total = Object.values(data.jobs_by_status).reduce((a, b) => a + b, 0) || 1;
              const percent = ((count / total) * 100).toFixed(0);
              const colorInfo = jobColors[status];

              return (
                <div
                  key={status}
                  onClick={() => router.push(`/jobs?status=${status}`)}
                  className="group/item flex flex-col gap-1.5 cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-zinc-900/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`h-2 w-2 rounded-full ${colorInfo.dot}`} />
                      <span className="text-zinc-350 transition-colors group-hover/item:text-white">
                        {colorInfo.label}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-300 font-mono">
                      {count} ({percent}%)
                    </span>
                  </div>
                  {/* Progress track */}
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${colorInfo.dot}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
