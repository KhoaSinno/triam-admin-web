"use client";

import React, { useState, Suspense } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { adminFetch, AdminAuditLogsResponse } from "@/lib/api";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
  Copy,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

// Collapsible JSON component to display metadata neatly
function CollapsibleJson({ json }: { json: Record<string, unknown> | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!json || Object.keys(json).length === 0) {
    return <span className="text-zinc-550 italic">Không có metadata</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase"
      >
        {isOpen ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Ẩn Metadata
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Xem Metadata ({Object.keys(json).length})
          </>
        )}
      </button>
      
      {isOpen && (
        <pre className="w-full max-w-xs md:max-w-md overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-300 leading-relaxed max-h-48 scrollbar-thin">
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </div>
  );
}

function AuditLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load initial filter states from URL search parameters (deep linking)
  const initialAction = searchParams.get("action") || "";
  const initialAdminId = searchParams.get("admin_user_id") || "";

  // State Management
  const [action, setAction] = useState(initialAction);
  const [adminUserId, setAdminUserId] = useState(initialAdminId);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Formulate query request URL
  const buildQueryPath = () => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    if (action.trim()) params.set("action", action.trim());
    if (adminUserId.trim()) params.set("admin_user_id", adminUserId.trim());
    return `/audit-logs?${params.toString()}`;
  };

  // React Query Fetch
  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminAuditLogsResponse>({
    queryKey: ["adminAuditLogs", limit, offset, action, adminUserId],
    queryFn: () => adminFetch<AdminAuditLogsResponse>(buildQueryPath()),
    placeholderData: keepPreviousData,
  });

  const handleResetFilters = () => {
    setAction("");
    setAdminUserId("");
    setOffset(0);
    router.replace("/audit-logs");
    toast.info("Đã cài đặt lại các bộ lọc hoạt động");
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

  const truncateId = (id: string | null) => {
    if (!id) return "—";
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
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

  const items = auditData?.items || [];
  const total = auditData?.total || 0;

  const hasNext = offset + items.length < total;
  const hasPrev = offset > 0;
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = offset + items.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Nhật ký hoạt động (Audit Logs)
          </h1>
          <p className="mt-1.5 text-sm text-zinc-450">
            Ghi nhận lịch sử các thao tác nghiệp vụ và sự kiện cấu hình từ hệ thống Admin
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
      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-lg backdrop-blur-xl md:grid-cols-3 items-end">
        {/* Action input search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Tên Thao tác (Action)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
            <input
              type="text"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setOffset(0);
              }}
              placeholder="e.g. job.retry, job.cancel…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-650 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Admin ID input search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Admin User ID
          </label>
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
            <input
              type="text"
              value={adminUserId}
              onChange={(e) => {
                setAdminUserId(e.target.value);
                setOffset(0);
              }}
              placeholder="UUID tài khoản quản trị…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-650 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Action button reset */}
        <div>
          <button
            onClick={handleResetFilters}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white py-2.5 px-4 text-xs font-semibold transition-all active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            Xóa các bộ lọc
          </button>
        </div>
      </div>

      {/* Audit Logs Table Card */}
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
            <h2 className="text-base font-bold text-white mb-2">Lỗi tải dữ liệu nhật ký</h2>
            <p className="text-xs text-zinc-405 max-w-xs mb-6">
              {error instanceof Error ? error.message : "Vui lòng kiểm tra lại quyền truy cập."}
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-450 mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-zinc-300">Nhật ký trống</h2>
            <p className="text-xs text-zinc-550 mt-1">Không phát hiện sự kiện nào trong cơ sở dữ liệu.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <table className="responsive-data-table">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4">Thời gian / Admin</th>
                  <th className="px-6 py-4">Sự kiện</th>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 text-xs">
                {items.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-800/15 transition-colors group"
                  >
                    {/* Timestamp column */}
                    <td data-label="Thời gian" data-primary className="px-6 py-4 text-zinc-400 font-semibold font-variant-numeric: tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                        <span>Admin:</span>
                        <span title={log.admin_user_id}>{truncateId(log.admin_user_id)}</span>
                        <button
                          onClick={() => handleCopy(log.admin_user_id, "Admin User ID")}
                          className="rounded p-0.5 text-zinc-650 hover:bg-zinc-850 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </td>

                    {/* Action column */}
                    <td data-label="Thao tác" className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                          log.action.includes("failed")
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/15"
                            : "bg-violet-500/10 text-violet-400 border-violet-500/15"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td data-label="Đối tượng" className="px-6 py-4 text-zinc-450">
                      <p className="capitalize font-semibold text-zinc-350">{log.target_type || "Không xác định"}</p>
                      {log.target_id && (
                        <div className="flex items-center gap-1.5">
                          <span title={log.target_id}>{truncateId(log.target_id)}</span>
                          <button
                            onClick={() => handleCopy(log.target_id!, "Target ID")}
                            className="rounded p-0.5 text-zinc-650 hover:bg-zinc-850 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Metadata JSON collapsible view */}
                    <td data-label="Thông tin bổ sung" data-actions className="px-6 py-4">
                      <CollapsibleJson json={log.metadata} />
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
              <span className="text-zinc-200 font-bold">{total}</span> sự kiện
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

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
