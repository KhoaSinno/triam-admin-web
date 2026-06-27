"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/lib/use-theme";

export default function ThemeToaster() {
  const theme = useTheme();

  return <Toaster richColors position="top-right" theme={theme} closeButton />;
}
