"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock3, GraduationCap, LoaderCircle, RotateCcw, X } from "lucide-react";

import { AdminUserListItem, getAdminUserStats, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type UserAnalyticsDrawerProps = {
  user: AdminUserListItem | null;
  onClose: () => void;
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/65 p-4">
      <Icon className="h-4 w-4 text-violet-300" aria-hidden="true" />
      <p className="mt-3 text-xl font-extrabold tabular-nums text-zinc-100">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  );
}

export default function UserAnalyticsDrawer({ user, onClose }: UserAnalyticsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["adminUserStats", user?.user_id],
    queryFn: () => getAdminUserStats(user!.user_id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (user && !dialog.open) dialog.showModal();
    if (!user && dialog.open) dialog.close();
  }, [user]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => user && onClose()}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-0 ml-auto h-dvh w-full max-w-md border-0 border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70"
      aria-labelledby="user-analytics-drawer-title"
    >
      {user && (
        <section className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-300">Phân tích học tập</p>
              <h2 id="user-analytics-drawer-title" className="mt-1 truncate text-lg font-extrabold text-zinc-100">
                {user.display_name || user.email || "Người dùng"}
              </h2>
              {user.email && user.display_name && <p className="mt-1 truncate text-sm text-zinc-500">{user.email}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Đóng bảng thống kê">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-zinc-400">
                <LoaderCircle className="h-6 w-6 animate-spin text-violet-400" aria-hidden="true" />
                Đang tải thống kê…
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
                <p className="font-bold">Không thể tải thống kê</p>
                <p className="mt-1 text-xs text-red-200/75">{getErrorMessage(error, "Hãy thử lại sau.")}</p>
                <button type="button" onClick={() => refetch()} disabled={isRefetching} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold transition-colors hover:bg-red-500/30 focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50">
                  <RotateCcw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} aria-hidden="true" />
                  Thử lại
                </button>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Giờ đã nghe" value={new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(data.total_hours_listened)} icon={Clock3} />
                  <StatCard label="Bài học hoàn tất" value={new Intl.NumberFormat("vi-VN").format(data.total_units_completed)} icon={GraduationCap} />
                  <StatCard label="Phiên học hoàn tất" value={new Intl.NumberFormat("vi-VN").format(data.total_sessions_completed)} icon={BookOpen} />
                  <StatCard label="Lượt ôn tập hoàn tất" value={new Intl.NumberFormat("vi-VN").format(data.total_reviews_completed)} icon={RotateCcw} />
                </div>

                <dl className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/45 text-sm">
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">Số sách sở hữu</dt>
                    <dd className="font-bold tabular-nums text-zinc-200">{new Intl.NumberFormat("vi-VN").format(data.books_owned_count)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">Hoạt động học gần nhất</dt>
                    <dd className="text-right font-semibold text-zinc-200">{formatDate(data.last_active_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">Tổng thời lượng đã nghe</dt>
                    <dd className="font-semibold tabular-nums text-zinc-200">{new Intl.NumberFormat("vi-VN").format(Math.round(data.total_listened_ms / 1000))} giây</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </dialog>
  );
}
