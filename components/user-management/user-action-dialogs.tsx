"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, LoaderCircle, LockKeyhole, UnlockKeyhole } from "lucide-react";

import type { AdminUserListItem } from "@/lib/api";

type DialogProps = {
  user: AdminUserListItem | null;
  isPending: boolean;
  onClose: () => void;
};

function getUserLabel(user: AdminUserListItem) {
  return user.display_name || user.email || "người dùng này";
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function UserStatusDialog({
  user,
  isPending,
  onClose,
  onConfirm,
}: DialogProps & { onConfirm: (reason: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const isBan = Boolean(user?.is_active);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (user && !dialog.open) dialog.showModal();
    if (!user && dialog.open) dialog.close();
  }, [user]);

  useEffect(() => {
    setReason("");
  }, [user?.user_id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (user) onConfirm(reason.trim());
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      onClose={() => user && onClose()}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70"
      aria-labelledby="user-status-dialog-title"
    >
      {user && (
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl border p-2.5 ${isBan ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
              {isBan ? <LockKeyhole className="h-5 w-5" /> : <UnlockKeyhole className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="user-status-dialog-title" className="text-base font-bold">
                {isBan ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {isBan ? "Người dùng sẽ không thể lấy phiên đăng nhập mới." : "Người dùng có thể đăng nhập lại vào hệ thống."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="truncate text-sm font-semibold text-zinc-200">{getUserLabel(user)}</p>
            {user.email && user.display_name && <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>}
          </div>

          {isBan && (
            <label className="block text-sm font-medium text-zinc-300" htmlFor="ban-reason">
              Lý do khóa <span className="text-zinc-500">(tùy chọn)</span>
              <textarea
                id="ban-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 255))}
                rows={3}
                maxLength={255}
                placeholder="Ví dụ: Vi phạm điều khoản sử dụng…"
                className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/30"
              />
              <span className="mt-1 block text-right text-xs text-zinc-500">{reason.length}/255</span>
            </label>
          )}

          {isBan && (
            <p className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Hãy xác nhận đúng người dùng trước khi khóa tài khoản.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50">
              Hủy
            </button>
            <button type="submit" disabled={isPending} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 ${isBan ? "bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-400" : "bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-400"}`}>
              {isPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isBan ? "Xác nhận khóa" : "Xác nhận mở khóa"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export function UserNotificationDialog({
  user,
  isPending,
  onClose,
  onConfirm,
}: DialogProps & { onConfirm: (payload: { title: string; body: string; idempotencyKey: string }) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (user && !dialog.open) dialog.showModal();
    if (!user && dialog.open) dialog.close();
  }, [user]);

  useEffect(() => {
    setTitle("");
    setBody("");
    setIdempotencyKey(user ? createIdempotencyKey() : "");
  }, [user?.user_id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (user && title.trim() && body.trim()) {
      onConfirm({ title: title.trim(), body: body.trim(), idempotencyKey });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      onClose={() => user && onClose()}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70"
      aria-labelledby="user-notification-dialog-title"
    >
      {user && (
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5 text-violet-300">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="user-notification-dialog-title" className="text-base font-bold">Gửi thông báo</h2>
              <p className="mt-1 truncate text-sm text-zinc-400">Đến {getUserLabel(user)}</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-zinc-300" htmlFor="notification-title">
            Tiêu đề
            <input
              id="notification-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 120))}
              maxLength={120}
              required
              autoFocus
              placeholder="Ví dụ: TRIAM có nội dung mới…"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
            />
            <span className="mt-1 block text-right text-xs text-zinc-500">{title.length}/120</span>
          </label>

          <label className="block text-sm font-medium text-zinc-300" htmlFor="notification-body">
            Nội dung
            <textarea
              id="notification-body"
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 500))}
              rows={5}
              maxLength={500}
              required
              placeholder="Nhập nội dung muốn gửi đến người dùng…"
              className="mt-2 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/30"
            />
            <span className="mt-1 block text-right text-xs text-zinc-500">{body.length}/500</span>
          </label>

          <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
            Thông báo sẽ được đưa vào hàng đợi để gửi đến hộp thư và các thiết bị đã đăng ký.
          </p>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50">
              Hủy
            </button>
            <button type="submit" disabled={isPending || !title.trim() || !body.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60">
              {isPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Đưa vào hàng đợi
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
