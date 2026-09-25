import { globalEventBus, MemoryEventBus } from "../bus/emitter";
import { isRealtimeEnabled } from "../config";
import type { RealtimePayload } from "../types";

export interface RealtimeSSEResponseOptions {
  enabled?: boolean;
  bus?: MemoryEventBus;
  heartbeatIntervalMs?: number;
}

/**
 * Creates an HTTP Server-Sent Events (SSE) Response stream for Next.js App Router / Cifer / Web standard runtime.
 *
 * @example
 * ```ts
 * // apps/www/src/app/api/realtime/route.ts
 * import { createRealtimeSSEResponse } from "@nishchinte/realtime/server";
 *
 * export function GET(req: Request) {
 *   return createRealtimeSSEResponse(req);
 * }
 * ```
 */
export function createRealtimeSSEResponse(
  req?: Request,
  options: RealtimeSSEResponseOptions = {},
): Response {
  const isEnabled = options.enabled ?? isRealtimeEnabled();

  if (!isEnabled) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Realtime service is disabled for this project.",
        code: "REALTIME_DISABLED",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const bus = options.bus || globalEventBus;
  const heartbeatIntervalMs = options.heartbeatIntervalMs || 25000;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`));

      // Subscribe to all event bus messages
      const unsubscribe = bus.subscribe("*", (payload: RealtimePayload) => {
        try {
          const data = JSON.stringify(payload);
          controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
        } catch {
          // Ignore write error if stream closed
        }
      });

      // Keepalive heartbeat ping
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, heartbeatIntervalMs);

      // Handle client disconnect
      if (req?.signal) {
        req.signal.addEventListener("abort", () => {
          unsubscribe();
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
