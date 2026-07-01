"use client";

import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminFetch, AdminUsersResponse } from "@/lib/api";
import { formatDate, truncateId, getInitials, getPaginationRange } from "@/lib/utils";
import {
  Users,
  Copy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Cpu,
  Bell,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const router = useRouter();
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminUsersResponse>({
    queryKey: ["adminUsers", limit, offset],
    queryFn: () =>
      adminFetch<AdminUsersResponse>(`/users?limit=${limit}&offset=${offset}`),
    placeholderData: keepPreviousData,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép User ID vào bộ nhớ tạm", {
      icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    });
  };

  const handlePageChange = (newOffset: number) => {
    if (newOffset >= 0) {
      setOffset(newOffset);
    }
  };

  const items = usersData?.items || [];
  const total = usersData?.total || 0;

  const { hasNext, hasPrev, startNum, endNum } = getPaginationRange(
    offset,
    limit,
    total,
    items.length
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Quản lý Người dùng
          </h1>
          <p className="mt-1.5 text-sm text-zinc-450">
            Danh sách người dùng hệ thống
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

      {/* Main Table card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 shadow-lg backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-8">
            <div className="h-8 w-full bg-zinc-850 rounded-lg animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-zinc-900/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Lỗi tải danh sách người dùng</h2>
            <p className="text-xs text-zinc-405 max-w-xs mb-6">
              {error instanceof Error ? error.message : "Hãy kiểm tra lại quyền truy cập hoặc kết nối."}
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
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-zinc-300">Không tìm thấy người dùng</h2>
            <p className="text-xs text-zinc-500 mt-1">Chưa có người dùng nào tạo dữ liệu trong hệ thống.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <table className="responsive-data-table">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Tài nguyên</th>
                  <th className="px-6 py-4">Hoạt động gần nhất</th>
                  <th className="px-6 py-4">Đăng nhập gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {items.map((userItem) => (
                  <tr
                    key={userItem.user_id}
                    className="hover:bg-zinc-800/25 transition-colors group"
                  >
                    <td data-label="Người dùng" data-primary className="px-6 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500/25 to-fuchsia-500/20 text-xs font-extrabold text-violet-500 ring-1 ring-violet-500/20 bg-cover bg-center"
                          style={userItem.avatar_url ? { backgroundImage: `url("${userItem.avatar_url}")` } : undefined}
                          aria-hidden="true"
                        >
                          {!userItem.avatar_url &&
                            getInitials(userItem.display_name || userItem.email || userItem.user_id)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-zinc-200">
                            {userItem.display_name || userItem.email || "Người dùng chưa có hồ sơ"}
                          </p>
                          {userItem.display_name && userItem.email && (
                            <p className="truncate text-xs text-zinc-400">{userItem.email}</p>
                          )}
                          <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                            <span title={userItem.user_id}>{truncateId(userItem.user_id)}</span>
                            <button
                              onClick={() => handleCopy(userItem.user_id)}
                              className="rounded p-1 text-zinc-500 transition hover:bg-zinc-850 hover:text-zinc-200"
                              title="Sao chép User ID"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Tài nguyên" className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/books?user_id=${userItem.user_id}`)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-500 transition hover:bg-violet-500/18"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          {userItem.book_count} sách
                        </button>
                        <button
                          onClick={() => router.push(`/jobs?user_id=${userItem.user_id}`)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-500 transition hover:bg-blue-500/18"
                        >
                          <Cpu className="h-3.5 w-3.5" />
                          {userItem.job_count} jobs
                        </button>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/45 px-2.5 py-1 text-xs font-bold text-zinc-400">
                          <Bell className="h-3.5 w-3.5" />
                          {userItem.notification_count} thông báo
                        </span>
                      </div>
                    </td>

                    <td data-label="Hoạt động cuối" className="px-6 py-4 text-xs font-semibold text-zinc-400 font-variant-numeric: tabular-nums">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                        <span>{formatDate(userItem.last_activity_at)}</span>
                      </div>
                    </td>

                    <td data-label="Đăng nhập gần nhất" className="px-6 py-4 text-xs text-zinc-400">
                      <p className="font-semibold">{formatDate(userItem.last_sign_in_at)}</p>
                      {userItem.account_created_at && (
                        <p className="mt-1 text-[10px] text-zinc-500">
                          Tham gia {formatDate(userItem.account_created_at)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!isLoading && !isError && total > 0 && (
          <div className="responsive-pagination border-t border-zinc-800 bg-zinc-950/40 px-6 py-4 text-xs font-semibold text-zinc-400 select-none">
            <div>
              Hiển thị <span className="text-zinc-200 font-bold">{startNum}</span> đến{" "}
              <span className="text-zinc-200 font-bold">{endNum}</span> trên tổng số{" "}
              <span className="text-zinc-200 font-bold">{total}</span> người dùng
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
    </div>
  );
}
