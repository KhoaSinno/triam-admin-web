"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Cpu,
  FileText,
  LogOut,
  RefreshCcw,
  TriangleAlert,
  LibraryBig,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ThemeToggle from "@/components/theme-toggle";
import BrandLogo from "@/components/brand-logo";
import {
  adminFetch,
  AdminDashboardResponse,
  AdminUsersResponse,
  AdminBooksResponse,
  AdminJobsResponse,
  AdminAuditLogsResponse,
} from "@/lib/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    profile,
    loading,
    logout,
    isForbidden,
    error,
    checkAdminStatus,
  } = useAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const prefetchMenuItem = (href: string) => {
    const staleTime = 30 * 1000; // Consider data fresh for 30s during prefetch

    if (href === "/dashboard") {
      queryClient.prefetchQuery({
        queryKey: ["adminDashboard"],
        queryFn: () => adminFetch<AdminDashboardResponse>("/dashboard"),
        staleTime,
      });
    } else if (href === "/users") {
      queryClient.prefetchQuery({
        queryKey: ["adminUsers", 50, 0],
        queryFn: () =>
          adminFetch<AdminUsersResponse>("/users?limit=50&offset=0"),
        staleTime,
      });
    } else if (href === "/books") {
      queryClient.prefetchQuery({
        queryKey: ["adminBooks", 20, 0, "", "", "", ""],
        queryFn: () =>
          adminFetch<AdminBooksResponse>("/books?limit=20&offset=0"),
        staleTime,
      });
    } else if (href === "/jobs") {
      queryClient.prefetchQuery({
        queryKey: ["adminJobs", 20, 0, "", "", "", ""],
        queryFn: () => adminFetch<AdminJobsResponse>("/jobs?limit=20&offset=0"),
        staleTime,
      });
    } else if (href === "/audit-logs") {
      queryClient.prefetchQuery({
        queryKey: ["adminAuditLogs", 20, 0, "", ""],
        queryFn: () =>
          adminFetch<AdminAuditLogsResponse>("/audit-logs?limit=20&offset=0"),
        staleTime,
      });
    }
  };

  if (!loading && user && !profile && !isForbidden && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-zinc-900/70 p-6 shadow-2xl">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-white">
            Không kiểm tra được quyền admin
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Phiên Supabase vẫn còn trong trình duyệt, nhưng API admin không phản
            hồi hoặc không thể xác thực `/me`.
          </p>
          <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-red-200">
            {error}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={checkAdminStatus}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <RefreshCcw className="h-4 w-4" />
              Thử lại
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If loading or not authorized yet, show full screen loader to avoid content flashes
  if (loading || !user || !profile || isForbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
          </div>
          <p className="text-sm text-zinc-400">Đang tải cấu hình quản trị…</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Người dùng", href: "/users", icon: Users },
    { name: "Sách", href: "/books", icon: BookOpen },
    { name: "Sách hệ thống", href: "/system-books", icon: LibraryBig },
    { name: "Jobs xử lý", href: "/jobs", icon: Cpu },
    { name: "Nhật ký hệ thống", href: "/audit-logs", icon: FileText },
  ];

  // Detect environment
  const getEnvName = () => {
    if (process.env.NODE_ENV === "development") return "Local Dev";
    if (window.location.hostname.includes("staging")) return "Staging";
    if (window.location.hostname.includes("localhost")) return "Local";
    return "Production";
  };

  const env = getEnvName();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/30 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandLogo className="h-8 w-8" />
            <span className="font-bold tracking-tight text-white bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              TriAm Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetchMenuItem(item.href)}
                onFocus={() => prefetchMenuItem(item.href)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? "bg-violet-600/10 text-violet-400"
                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 h-1/2 w-1 rounded-r bg-violet-500" />
                )}
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive
                      ? "text-violet-400"
                      : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info Footer in Sidebar */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex flex-col gap-1 rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Tài khoản
            </span>
            <span className="truncate text-xs font-bold text-zinc-300">
              {profile.email}
            </span>
            <span className="inline-flex max-w-max items-center rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/10 mt-1">
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          {/* Environment Status Badge */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 lg:hidden"
            >
              <BrandLogo className="h-8 w-8" />
              <span className="hidden text-sm font-extrabold text-zinc-100 sm:inline">
                TriAm Admin
              </span>
            </Link>
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex ${
                env === "Production"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : env === "Staging"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  env === "Production"
                    ? "bg-red-500 animate-pulse"
                    : env === "Staging"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-blue-500 animate-pulse"
                }`}
              />
              Môi trường: {env}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 sm:px-4"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        <nav className="sticky top-16 z-[9] flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950/92 px-3 py-2 backdrop-blur-md lg:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetchMenuItem(item.href)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-violet-500/12 text-violet-500"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
