"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminJobById, cancelAdminJob, AdminJobListItem, getErrorMessage } from "@/lib/api";
import { RotateCw, CheckCircle2, AlertTriangle, X, Trash2, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { toast } from "sonner";

export function AdminGlobalProgressWidget() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Read active job ID from localStorage or custom event
  useEffect(() => {
    const checkJob = () => {
      const stored = localStorage.getItem("triam_admin_active_job_id");
      if (stored && stored !== activeJobId) {
        setActiveJobId(stored);
      }
    };

    checkJob();
    const interval = setInterval(checkJob, 1000);
    window.addEventListener("triam_admin_job_started", checkJob as any);

    return () => {
      clearInterval(interval);
      window.removeEventListener("triam_admin_job_started", checkJob as any);
    };
  }, [activeJobId]);

  // Query job status with 2s polling
  const { data: job } = useQuery<AdminJobListItem>({
    queryKey: ["adminActiveJobStatus", activeJobId],
    queryFn: () => getAdminJobById(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const j = query.state.data;
      if (j && ["queued", "processing"].includes(j.status)) {
        return 2000;
      }
      return false;
    },
  });

  // Handle completion / failure toasts
  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") {
      toast.success(`Tiến trình "${job.job_type.toUpperCase()}" đã hoàn thành 100%!`);
      queryClient.invalidateQueries({ queryKey: ["adminBooks"] });
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail"] });

      const timer = setTimeout(() => {
        localStorage.removeItem("triam_admin_active_job_id");
        setActiveJobId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (job.status === "error") {
      toast.error(`Tiến trình thất bại: ${job.error_message || "Lỗi không xác định"}`);
    }
  }, [job?.status, job?.id, queryClient]);

  // Direct async handler: Cancel & Clean Rollback
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!activeJobId) {
      toast.error("Không xác định được Job ID cần hủy.");
      return;
    }
    setIsCancelling(true);
    try {
      console.log("[CancelJob] Executing cancel for activeJobId:", activeJobId);
      const data = await cancelAdminJob(activeJobId);
      console.log("[CancelJob] Success response:", data);
      toast.success(data.message || "Đã hủy tiến trình và dọn dẹp dữ liệu rác thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminBooks"] });
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail"] });
      queryClient.invalidateQueries({ queryKey: ["adminBookJobs"] });
      localStorage.removeItem("triam_admin_active_job_id");
      setActiveJobId(null);
      setShowCancelModal(false);
    } catch (err: unknown) {
      console.error("[CancelJob] Error captured:", err);
      toast.error("Không thể hủy tiến trình: " + getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  if (!activeJobId || !job) return null;

  const isRunning = ["queued", "processing"].includes(job.status);

  return (
    <>
      {/* Floating Progress Widget */}
      <div className="fixed bottom-6 right-6 z-40 w-96 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl transition-all animate-in slide-in-from-bottom-5 duration-300 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Tiến trình ngầm Admin
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Minimize Toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
            >
              {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* Close / Dismiss Button */}
            {!isRunning && (
              <button
                onClick={() => {
                  localStorage.removeItem("triam_admin_active_job_id");
                  setActiveJobId(null);
                }}
                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 uppercase text-[10px]">
                {job.job_type}
              </span>
              <span className="font-mono font-bold text-violet-400 text-xs">
                {job.progress_percent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-850">
              <div
                className={`h-full transition-all duration-500 ${
                  job.status === "completed"
                    ? "bg-emerald-500"
                    : job.status === "error"
                    ? "bg-rose-500"
                    : job.status === "cancelled"
                    ? "bg-amber-500"
                    : "bg-violet-600 animate-pulse"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, job.progress_percent))}%` }}
              />
            </div>

            {/* Current Step */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="truncate pr-2">{job.current_step || "Đang xử lý..."}</span>
              {isRunning && <RotateCw className="h-3 w-3 text-violet-400 animate-spin shrink-0" />}
              {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              {job.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
            </div>

            {/* Cancel & Clean Rollback Action Button */}
            {isRunning && (
              <div className="pt-2 border-t border-zinc-850 flex justify-end">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold transition-all active:scale-95"
                >
                  <Trash2 className="h-3 w-3" />
                  Hủy & Rollback sạch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Xác nhận Hủy & Rollback</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bạn có chắc chắn muốn <span className="text-rose-400 font-bold">hủy đột ngột tiến trình</span> và dọn dẹp toàn bộ dữ liệu rác đã lỡ khởi tạo không? Bản ghi sách/vector dở dang sẽ bị xóa sạch khỏi cơ sở dữ liệu.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
              <button
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-300 font-semibold py-2 px-4 text-xs hover:bg-zinc-850 hover:text-white"
              >
                Không, tiếp tục chạy
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 text-xs transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isCancelling && <RotateCw className="h-3 w-3 animate-spin" />}
                Xác nhận Hủy & Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
