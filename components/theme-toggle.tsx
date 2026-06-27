"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/use-theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300 shadow-sm transition hover:border-violet-500/40 hover:bg-zinc-800 hover:text-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${className}`}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}
