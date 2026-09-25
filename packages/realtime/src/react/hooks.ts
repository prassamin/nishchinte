"use client";

import { useEffect, useRef } from "react";
import { useRealtime } from "./context";
import type { RealtimeEventType, RealtimeCallback, FilterRule } from "../types";

/**
 * React Hook to subscribe to real-time table mutations.
 *
 * @example
 * ```tsx
 * useRealtimeSubscription("internal_users", "INSERT", (payload) => {
 *   queryClient.invalidateQueries({ queryKey: ["team-members"] });
 * });
 * ```
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  table: string,
  event: RealtimeEventType,
  callback: RealtimeCallback<T>,
  filter?: FilterRule,
): void {
  const realtime = useRealtime();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!realtime.isEnabled()) {
      return;
    }

    const channel = realtime.channel<T>(table);

    if (filter) {
      channel.on(event, filter, (payload) => cbRef.current(payload));
    } else {
      channel.on(event, (payload) => cbRef.current(payload));
    }

    const { unsubscribe } = channel.subscribe();

    return () => {
      unsubscribe();
    };
  }, [table, event, filter?.column, filter?.operator, filter?.value, realtime]);
}
