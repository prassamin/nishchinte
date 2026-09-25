import { globalEventBus, MemoryEventBus } from "./bus/emitter";
import { getWebhookDispatcher } from "./webhooks/dispatcher";
import { getRealtimeConfig } from "./config";
import type { RealtimePayload } from "./types";

let counter = 1;

function generateEventId(): string {
  return `evt_${Date.now()}_${counter++}`;
}

export interface RealtimeExtensionOptions {
  enabled?: boolean;
  bus?: MemoryEventBus | "memory" | "redis" | string;
  tables?: string[];
}

/**
 * Creates a Prisma Client extension that intercepts database operations
 * and publishes Change Data Capture (CDC) events to the realtime event bus.
 */
export function createRealtimeExtension(
  options: RealtimeExtensionOptions = {},
) {
  const bus =
    options.bus &&
    typeof options.bus === "object" &&
    typeof (options.bus as any).publish === "function"
      ? (options.bus as MemoryEventBus)
      : globalEventBus;

  try {
    getWebhookDispatcher();
  } catch (err) {
    console.error("[Realtime] Failed to initialize WebhookDispatcher:", err);
  }

  const isTableTracked = (model: string): boolean => {
    const config = getRealtimeConfig();
    const isEnabled = options.enabled ?? config.enabled ?? true;
    if (!isEnabled) return false;

    // Use active realtime tables whitelist (falls back to options.tables if explicitly passed in programmatic usage)
    const tables = config.tables ?? options.tables;
    if (!tables || tables.length === 0) return false;

    const m = model.toLowerCase();
    return tables.some((t) => t.toLowerCase() === m);
  };

  const publishSafely = (payload: RealtimePayload) => {
    try {
      bus.publish(payload);
    } catch (err) {
      console.error(
        `[Realtime CDC] Failed to publish ${payload.table}:${payload.eventType}`,
        err,
      );
    }
  };

  return {
    name: "nishchinte-realtime-cdc",
    query: {
      $allModels: {
        async create({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model) && result) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "INSERT",
              newData: result,
              oldData: null,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async createMany({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model)) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "INSERT",
              newData: { count: result.count, items: args?.data },
              oldData: null,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async update({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model) && result) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "UPDATE",
              newData: result,
              oldData: null,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async updateMany({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model)) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "UPDATE",
              newData: {
                count: result.count,
                data: args?.data,
                where: args?.where,
              },
              oldData: null,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async upsert({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model) && result) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "UPDATE",
              newData: result,
              oldData: null,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async delete({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model)) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "DELETE",
              newData: null,
              oldData: result,
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },

        async deleteMany({ model, args, query }: any) {
          const result = await query(args);
          if (isTableTracked(model)) {
            publishSafely({
              id: generateEventId(),
              table: model,
              eventType: "DELETE",
              newData: null,
              oldData: { count: result.count, where: args?.where },
              timestamp: new Date().toISOString(),
            });
          }
          return result;
        },
      },
    },
  };
}
