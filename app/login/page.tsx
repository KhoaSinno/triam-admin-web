"use client";

import BrandLogo from "@/components/brand-logo";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { getErrorMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  AudioLines,
  BookOpen,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { user, profile, loading: authLoading, isForbidden, loginWithPassword } = useAuth();
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
      await loginWithPassword(email, password);
      toast.success("Đăng nhập thành công!");
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
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <ThemeToggle className="absolute right-5 top-5 z-30" />

      <section className="relative hidden min-h-screen overflow-hidden border-r border-zinc-800 p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,159,28,0.2),transparent_30%),radial-gradient(circle_at_82%_74%,rgba(46,196,182,0.2),transparent_34%)]" />
        <div className="absolute -right-32 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full border border-violet-500/15" />
        <div className="absolute -right-20 top-1/2 h-[410px] w-[410px] -translate-y-1/2 rounded-full border border-fuchsia-500/15" />
        <BrandLogo className="absolute -right-5 top-1/2 h-72 w-72 -translate-y-1/2 opacity-[0.09] xl:h-96 xl:w-96" label="" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo className="h-11 w-11" />
          <div>
            <p className="text-lg font-black tracking-tight text-zinc-100">Tri Âm</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Operations workspace</p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-xs font-extrabold text-violet-500">
            <Sparkles className="h-3.5 w-3.5" />
            Không gian vận hành học tập
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[1.04] tracking-[-0.045em] text-zinc-100 xl:text-7xl">
            Giữ nhịp cho mọi{" "}
            <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              hành trình học.
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-zinc-400 xl:text-lg xl:leading-8">
            Theo dõi tài liệu, tiến trình xử lý và chất lượng bài nghe trong một workspace được thiết kế để nhìn ra vấn đề thật nhanh.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: "Tài liệu", value: "Có cấu trúc" },
              { icon: AudioLines, label: "Bài nghe", value: "Theo tiến độ" },
              { icon: ShieldCheck, label: "Vận hành", value: "Có kiểm soát" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 backdrop-blur">
                <item.icon className="h-4 w-4 text-violet-500" />
                <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                <p className="mt-1 text-sm font-extrabold text-zinc-200">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">
          Dành cho tài khoản quản trị đã được cấp quyền.
        </p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-20 sm:px-10 lg:px-12 lg:py-8 xl:px-20 xl:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,159,28,0.09),transparent_35%)] lg:hidden" />
        <div className="relative w-full max-w-[460px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-11 w-11" />
            <div>
              <p className="font-black text-zinc-100">Tri Âm Admin</p>
              <p className="text-xs text-zinc-500">Operations workspace</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Chào mừng trở lại</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-zinc-100 sm:text-4xl">Đăng nhập quản trị</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Dùng tài khoản Supabase đã được cấp quyền admin.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1"><span className="font-extrabold">Không thể đăng nhập.</span> {errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2.5 block text-xs font-extrabold text-zinc-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@triam.vn"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/45 pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 hover:border-zinc-700 focus:border-violet-500 focus:bg-zinc-900/70 focus:ring-4 focus:ring-violet-500/10"
                  autoComplete="email"
                  spellCheck={false}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2.5 block text-xs font-extrabold text-zinc-300">Mật khẩu</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/45 pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 hover:border-zinc-700 focus:border-violet-500 focus:bg-zinc-900/70 focus:ring-4 focus:ring-violet-500/10"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="pt-2"></div>
            <button
              type="submit"
              disabled={loading}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-xl active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <>
                Vào workspace
                <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Hoặc</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 text-sm font-extrabold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900/50 hover:text-white active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
          <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.04 3.1v2.58h3.3c1.93-1.78 3.04-4.4 3.04-7.38 0-.68-.06-1.33-.17-2z" fill="#4285F4" />
            <path d="M12 20.6c2.59 0 4.77-.86 6.36-2.33l-3.3-2.58c-.91.61-2.08.98-3.06.98-2.35 0-4.34-1.59-5.05-3.72H3.5v2.66c1.57 3.12 4.79 5.26 8.5 5.26z" fill="#34A853" />
            <path d="M6.95 12.95c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V6.89H3.5c-.6 1.2-.95 2.56-.95 4.01s.35 2.81.95 4.01l3.45-2.66z" fill="#FBBC05" />
            <path d="M12 6.1c1.41 0 2.68.49 3.68 1.44l2.76-2.76C16.77 3.22 14.59 2.4 12 2.4c-3.71 0-6.93 2.14-8.5 5.26l3.45 2.66c.71-2.13 2.7-3.72 5.05-3.72z" fill="#EA4335" />
          </svg>
            Tiếp tục với Google
          </button>

          <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-fuchsia-500" />
            Phiên đăng nhập được bảo vệ bởi Supabase Auth
          </div>
        </div>
      </section>
    </main>
  );
}
