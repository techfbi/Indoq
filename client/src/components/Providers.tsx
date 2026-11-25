"use client";

import { MotionConfig } from "framer-motion";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Follows the OS setting, drops movement and keeps fades */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
