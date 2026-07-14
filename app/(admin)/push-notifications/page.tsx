"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Copy,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";
import { getValidToken } from "@/lib/supabase";
import {
  adminFetch,
  AdminDeviceTokenItem,
  AdminDeviceTokensResponse,
} from "@/lib/api";

type PushStatusResponse = {
  configured: boolean;
  route: string;
  mode: string;
};

type SendResponse = {
  messageId?: string;
  status?: string;
  source?: string;
  detail?: string;
};

const defaultData = JSON.stringify(
  {
    action_type: "open_notification_center",
    debug_channel: "admin_web_direct",
  },
  null,
  2,
);

async function adminDevFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getValidToken();
  if (!token) throw new Error("NO_SESSION");

  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const body = (await res.json().catch(() => null)) as
    | (T & { detail?: string })
    | null;

  if (!res.ok) {
    throw new Error(body?.detail || `Request failed with ${res.status}`);
  }

  return body as T;
}

export default function PushNotificationsPage() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [deviceTokens, setDeviceTokens] = useState<AdminDeviceTokenItem[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [title, setTitle] = useState("Tri Âm debug");
  const [body, setBody] = useState("Thông báo test trực tiếp từ Firebase");
  const [dataJson, setDataJson] = useState(defaultData);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<PushStatusResponse | null>(null);
  const [lastResult, setLastResult] = useState<SendResponse | null>(null);

  const parsedData = useMemo(() => {
    try {
      const parsed = dataJson.trim() ? JSON.parse(dataJson) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false as const, error: "Data phải là JSON object." };
      }
      return { ok: true as const, value: parsed as Record<string, unknown> };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "JSON không hợp lệ.",
      };
    }
  }, [dataJson]);

  const tokenPreview = token.trim()
    ? `${token.trim().slice(0, 16)}…${token.trim().slice(-12)}`
    : "Chưa nhập token";

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const result = await adminDevFetch<PushStatusResponse>(
        "/api/dev/firebase-push",
      );
      setStatus(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không kiểm tra được Firebase route.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const loadDeviceTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: "0",
      });
      if (userId.trim()) {
        params.set("user_id", userId.trim());
      }
      const result = await adminFetch<AdminDeviceTokensResponse>(
        `/notifications/device-tokens?${params.toString()}`,
      );
      setDeviceTokens(result.items);
      if (!result.items.length) {
        toast.info("Chưa có device token nào khớp bộ lọc.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không tải được device tokens.",
      );
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    adminDevFetch<PushStatusResponse>("/api/dev/firebase-push")
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Không kiểm tra được Firebase route.",
        );
      });

    adminFetch<AdminDeviceTokensResponse>(
      "/notifications/device-tokens?limit=20&offset=0",
    )
      .then((result) => {
        if (!cancelled) setDeviceTokens(result.items);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Không tải được device tokens.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async () => {
    if (!parsedData.ok) {
      toast.error(parsedData.error);
      return;
    }

    if (!token.trim() || !title.trim() || !body.trim()) {
      toast.error("Cần nhập FCM token, tiêu đề và nội dung.");
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const result = await adminDevFetch<SendResponse>(
        "/api/dev/firebase-push",
        {
          method: "POST",
          body: JSON.stringify({
            token: token.trim(),
            title: title.trim(),
            body: body.trim(),
            data: parsedData.value,
          }),
        },
      );
      setLastResult(result);
      toast.success("Đã gửi yêu cầu FCM trực tiếp.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không gửi được thông báo.";
      setLastResult({ detail: message });
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const copyResult = async () => {
    if (!lastResult) return;
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    toast.success("Đã sao chép kết quả gửi.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-400">
            <TerminalSquare className="h-3.5 w-3.5" />
            Dev test only
          </div>
          <h1 className="mt-4 bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            Gửi thông báo Firebase trực tiếp
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-450">
            Trang này lấy token thiết bị đã đăng ký trên backend rồi gửi FCM
            trực tiếp tới máy test. Luồng này vẫn không tạo notification DB row,
            chỉ dùng để debug foreground, background, killed-app tray và payload
            tap/open.
          </p>
        </div>

        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          Kiểm tra cấu hình
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Không ghi DB"
          description="Không tạo inbox row, unread count, audit/outbox hay quiet-hours rule."
        />
        <InfoCard
          icon={<Smartphone className="h-5 w-5" />}
          title="Lấy token từ server"
          description="App Flutter tự đăng ký FCM token lên backend, admin web chỉ chọn token đã có."
        />
        <InfoCard
          icon={<BellRing className="h-5 w-5" />}
          title="Kênh debug"
          description="Android channelId: tri_am_firebase_direct_debug để phân biệt với notification thật."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-lg backdrop-blur-xl sm:p-6">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="grid flex-1 gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    User ID để lọc token
                  </span>
                  <input
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    placeholder="Để trống để lấy 20 token mới nhất…"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-xs text-zinc-100 outline-none transition focus:border-violet-500"
                  />
                </label>
                <button
                  onClick={loadDeviceTokens}
                  disabled={isLoadingTokens}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingTokens ? "animate-spin" : ""}`}
                  />
                  Tải token
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {deviceTokens.length ? (
                  deviceTokens.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setToken(item.device_token);
                        toast.success("Đã chọn device token.");
                      }}
                      className={`rounded-2xl border p-3 text-left transition hover:border-violet-500/60 hover:bg-violet-500/5 ${
                        token === item.device_token
                          ? "border-violet-500/70 bg-violet-500/10"
                          : "border-zinc-800 bg-zinc-950/50"
                      }`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-100">
                          {item.token_preview}
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-500">
                          updated {new Date(item.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-zinc-550">
                        user: {item.user_id}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">
                    Chưa có token. Hãy chạy app Flutter với Firebase config và
                    đăng nhập để app tự đăng ký token lên backend.
                  </div>
                )}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                FCM registration token đang chọn
              </span>
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                rows={4}
                placeholder="Paste token của thiết bị test…"
                className="w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-xs text-zinc-100 outline-none transition focus:border-violet-500"
              />
              <span className="font-mono text-[11px] text-zinc-550">
                Preview: {tokenPreview}
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Tiêu đề
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-violet-500"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Nội dung
                </span>
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-violet-500"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                Data payload JSON
              </span>
              <textarea
                value={dataJson}
                onChange={(event) => setDataJson(event.target.value)}
                rows={8}
                spellCheck={false}
                className={`w-full resize-y rounded-2xl border bg-zinc-950/80 p-3 font-mono text-xs text-zinc-100 outline-none transition ${
                  parsedData.ok
                    ? "border-zinc-800 focus:border-violet-500"
                    : "border-red-500/60 focus:border-red-400"
                }`}
              />
              {!parsedData.ok && (
                <span className="text-xs font-semibold text-red-400">
                  {parsedData.error}
                </span>
              )}
            </label>

            <div className="flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-500">
                Gửi notification + data message trực tiếp qua Firebase Admin
                SDK. Credential chỉ đọc ở server-side route.
              </p>
              <button
                onClick={handleSend}
                disabled={isSending || !parsedData.ok}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gửi thông báo
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-5">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-xl p-2 ${
                  status?.configured
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {status?.configured ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-zinc-100">
                  Firebase Admin config
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-450">
                  {status?.configured
                    ? "Route đã thấy credential Firebase server-side."
                    : "Chưa thấy credential Firebase. Cần cấu hình .env.local trước khi gửi."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-[11px] leading-5 text-zinc-400">
              <p>FIREBASE_SERVICE_ACCOUNT_JSON</p>
              <p className="text-zinc-600">hoặc</p>
              <p>FIREBASE_PROJECT_ID</p>
              <p>FIREBASE_CLIENT_EMAIL</p>
              <p>FIREBASE_PRIVATE_KEY</p>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-zinc-100">Kết quả gửi</h2>
              <button
                onClick={copyResult}
                disabled={!lastResult}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                title="Sao chép kết quả"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <pre className="mt-4 min-h-40 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs leading-5 text-zinc-300">
              {lastResult
                ? JSON.stringify(lastResult, null, 2)
                : "Chưa có request gửi nào trong phiên này."}
            </pre>
          </div>
        </aside>
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/16 p-5">
      <div className="mb-4 inline-flex rounded-xl bg-violet-500/10 p-2 text-violet-400">
        {icon}
      </div>
      <h2 className="font-bold text-zinc-100">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-zinc-450">{description}</p>
    </div>
  );
}
