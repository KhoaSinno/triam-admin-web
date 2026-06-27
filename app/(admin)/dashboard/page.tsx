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
  ArrowRight,
  Activity,
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
    partial_ready: { bg: "bg-cyan-500/10", text: "text-cyan-500", dot: "bg-cyan-500", label: "Sẵn sàng một phần" },
    ready: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Hoàn tất (Ready)" },
    error: { bg: "bg-rose-500/10", text: "text-rose-500", dot: "bg-rose-500", label: "Lỗi hệ thống" },
  };

  const jobColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    queued: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "Chờ xử lý (Queued)" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Đang chạy" },
    partial_ready: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400", label: "Xong một phần" },
    ready: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Thành công" },
    error: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-500", label: "Gặp lỗi" },
    cancelled: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500", label: "Đã hủy" },
  };

  const bookTotal = Object.values(data.books_by_status).reduce((sum, count) => sum + count, 0);
  const activeJobs =
    (data.jobs_by_status.queued || 0) +
    (data.jobs_by_status.processing || 0) +
    (data.jobs_by_status.partial_ready || 0);
  const readyBooks = data.books_by_status.ready || 0;
  const readyRate = bookTotal > 0 ? Math.round((readyBooks / bookTotal) * 100) : 0;

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

      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/24">
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-extrabold text-zinc-300">
              <Activity className="h-4 w-4 text-violet-500" />
              Sức khỏe xử lý
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="text-5xl font-black tracking-tight text-zinc-100">{readyRate}%</p>
              <div className="pb-1">
                <p className="font-bold text-zinc-200">sách đã sẵn sàng</p>
                <p className="text-xs text-zinc-450">{readyBooks}/{bookTotal || 0} sách toàn hệ thống</p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 divide-x divide-zinc-800 border-y border-zinc-800 py-4">
              {[
                { label: "Người dùng có dữ liệu", value: data.user_count, icon: Users, href: "/users" },
                { label: "Tổng số sách", value: data.book_count, icon: BookOpen, href: "/books" },
                { label: "Jobs đang hoạt động", value: activeJobs, icon: Cpu, href: "/jobs?status=processing" },
              ].map((metric) => (
                <button key={metric.label} onClick={() => router.push(metric.href)} className="group px-3 text-left sm:px-5">
                  <metric.icon className="mb-2 h-4 w-4 text-zinc-500 transition group-hover:text-violet-500" />
                  <p className="text-xl font-black text-zinc-100 sm:text-2xl">{formatNumber(metric.value)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 sm:text-xs">{metric.label}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => router.push("/jobs?status=error")}
            className={`flex flex-col justify-between border-t p-6 text-left transition lg:border-l lg:border-t-0 ${
              data.failed_jobs_last_24h > 0
                ? "border-red-500/20 bg-red-500/8 hover:bg-red-500/12"
                : "border-zinc-800 bg-emerald-500/6 hover:bg-emerald-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                data.failed_jobs_last_24h > 0 ? "bg-red-500/12 text-red-500" : "bg-emerald-500/12 text-emerald-500"
              }`}>
                {data.failed_jobs_last_24h > 0 ? "Cần xử lý" : "Ổn định"}
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-8">
              <p className={`text-4xl font-black ${data.failed_jobs_last_24h > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {data.failed_jobs_last_24h}
              </p>
              <p className="mt-1 font-bold text-zinc-200">job lỗi trong 24 giờ</p>
              <p className="mt-2 text-xs leading-5 text-zinc-450">
                {data.failed_jobs_last_24h > 0 ? "Mở danh sách lỗi để kiểm tra và retry." : "Không phát hiện lỗi xử lý mới."}
              </p>
            </div>
          </button>
        </div>
      </section>

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
                  className={`group/item flex cursor-pointer flex-col gap-1.5 rounded-xl border border-transparent p-3 transition-colors hover:border-zinc-800 ${colorInfo.bg}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`h-2 w-2 rounded-full ${colorInfo.dot}`} />
                      <span className={`transition-colors ${colorInfo.text}`}>
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
                  className={`group/item flex cursor-pointer flex-col gap-1.5 rounded-xl border border-transparent p-3 transition-colors hover:border-zinc-800 ${colorInfo.bg}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`h-2 w-2 rounded-full ${colorInfo.dot}`} />
                      <span className={`transition-colors ${colorInfo.text}`}>
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

      <section className="grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 md:grid-cols-2 md:divide-x md:divide-zinc-800">
        <div className="flex items-center gap-4 border-b border-zinc-800 p-5 md:border-b-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/12 text-violet-500">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Input 30 ngày</p>
            <p className="mt-1 text-2xl font-black text-zinc-100">{formatNumber(data.estimated_input_tokens_last_30d)} tokens</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/12 text-fuchsia-500">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Audio tạo trong 30 ngày</p>
            <p className="mt-1 text-2xl font-black text-zinc-100">{convertSecondsToHours(data.estimated_audio_seconds_last_30d)} giờ</p>
          </div>
        </div>
      </section>
    </div>
  );
}
