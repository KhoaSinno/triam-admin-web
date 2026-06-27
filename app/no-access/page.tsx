"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export default function NoAccessPage() {
  const { logout } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <ThemeToggle className="absolute right-5 top-5 z-20" />
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/5 blur-[128px]"></div>

      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto text-red-500 shadow-inner">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Truy cập bị chặn
        </h1>
        
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Tài khoản này không có quyền truy cập trang quản trị. Vui lòng liên hệ quản trị viên hệ thống để được cấp quyền hoặc đăng nhập bằng tài khoản khác.
        </p>

        <div className="mt-8 flex flex-col gap-3.5">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 px-4 text-sm font-semibold text-white transition-all hover:bg-red-500 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất tài khoản
          </button>

          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 py-3 px-4 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
