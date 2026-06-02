"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { user, loading, isForbidden } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (isForbidden) {
          router.push("/no-access");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, isForbidden, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        {/* Modern premium spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-zinc-400 animate-pulse">
          Đang xác thực hệ thống…
        </p>
      </div>
    </div>
  );
}
