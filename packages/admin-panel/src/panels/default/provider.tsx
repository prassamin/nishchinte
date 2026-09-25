"use client";

import React, { useState } from "react";
import { ConfirmProvider } from "@nishchinte/confirm";
import { Toast } from "@heroui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProgressProvider } from "@bprogress/next/app";

export function DefaultPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ProgressProvider 
        color={"var(--accent)"}
        height="2px"
        options={{
          showSpinner: false,
        }}
      >
        <ConfirmProvider>
          <Toast.Provider placement="bottom" />
          {children}
        </ConfirmProvider>
      </ProgressProvider>
    </QueryClientProvider>
  );
}
