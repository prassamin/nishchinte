"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { RealtimeClient, createRealtimeClient, realtime as defaultRealtimeClient } from "../client/client";
import type { RealtimeClientOptions } from "../client/client";

const RealtimeContext = createContext<RealtimeClient | null>(null);

export interface RealtimeProviderProps {
  client?: RealtimeClient;
  options?: RealtimeClientOptions;
  children: React.ReactNode;
}

export function RealtimeProvider({ client, options, children }: RealtimeProviderProps) {
  const [instance] = useState(() => client || createRealtimeClient(options));

  return (
    <RealtimeContext.Provider value={instance}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeClient {
  const client = useContext(RealtimeContext);
  if (!client) {
    // Fallback to singleton instance if provider is omitted
    return defaultRealtimeClient;
  }
  return client;
}
