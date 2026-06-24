"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { getErrorMessage } from "@/lib/api";
import { KeyRound, Mail, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { user, profile, loading: authLoading, isForbidden } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (isForbidden) {
        router.push("/no-access");
      } else if (profile) {
        router.push("/dashboard");
      }
    }
  }, [user, profile, authLoading, isForbidden, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error("Đăng nhập thất bại: " + error.message);
      } else {
        toast.success("Đăng nhập thành công!");
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Đã xảy ra lỗi kết nối.");
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        toast.error("Lỗi Google Auth: " + error.message);
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Đã xảy ra lỗi kết nối Google Auth."));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
          </div>
          <p className="text-sm text-zinc-400">Đang kiểm tra phiên đăng nhập…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Decorative premium glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[128px]"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-fuchsia-600/10 blur-[128px]"></div>

      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/20">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Tri Âm Admin
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Cổng vận hành hệ thống sách nói và học tập thông minh
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <span className="font-semibold">Lỗi:</span> {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
            >
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors" />
              <input
                id="email"
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus-visible:ring-violet-500/20"
                autoComplete="email"
                spellCheck={false}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Mật khẩu
              </label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors" />
              <input
                id="password"
                type="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus-visible:ring-violet-500/20"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 px-4 text-sm font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Đăng nhập
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <span className="relative bg-zinc-900/40 px-3 text-xs text-zinc-500 uppercase tracking-wider">
            Hoặc tiếp tục với
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.04 3.1v2.58h3.3c1.93-1.78 3.04-4.4 3.04-7.38 0-.68-.06-1.33-.17-2z" fill="#4285F4" />
            <path d="M12 20.6c2.59 0 4.77-.86 6.36-2.33l-3.3-2.58c-.91.61-2.08.98-3.06.98-2.35 0-4.34-1.59-5.05-3.72H3.5v2.66c1.57 3.12 4.79 5.26 8.5 5.26z" fill="#34A853" />
            <path d="M6.95 12.95c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V6.89H3.5c-.6 1.2-.95 2.56-.95 4.01s.35 2.81.95 4.01l3.45-2.66z" fill="#FBBC05" />
            <path d="M12 6.1c1.41 0 2.68.49 3.68 1.44l2.76-2.76C16.77 3.22 14.59 2.4 12 2.4c-3.71 0-6.93 2.14-8.5 5.26l3.45 2.66c.71-2.13 2.7-3.72 5.05-3.72z" fill="#EA4335" />
          </svg>
          Tài khoản Google
        </button>
      </div>
    </div>
  );
}
