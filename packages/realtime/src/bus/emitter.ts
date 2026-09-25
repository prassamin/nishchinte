import type {
  RealtimePayload,
  RealtimeEventType,
  FilterRule,
  RealtimeCallback,
} from "../types";

export interface BusSubscription {
  id: string;
  topic: string; // e.g. "internal_users:INSERT", "orders:*", "*"
  filter?: FilterRule;
  callback: RealtimeCallback<any>;
}

export function matchesFilter(
  record: Record<string, unknown> | null | undefined,
  filter?: FilterRule,
): boolean {
  if (!filter || !record) return true;
  const val = record[filter.column];

  switch (filter.operator) {
    case "eq":
      return val === filter.value;
    case "neq":
      return val !== filter.value;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(val);
    case "gt":
      return (
        typeof val === "number" &&
        typeof filter.value === "number" &&
        val > filter.value
      );
    case "gte":
      return (
        typeof val === "number" &&
        typeof filter.value === "number" &&
        val >= filter.value
      );
    case "lt":
      return (
        typeof val === "number" &&
        typeof filter.value === "number" &&
        val < filter.value
      );
    case "lte":
      return (
        typeof val === "number" &&
        typeof filter.value === "number" &&
        val <= filter.value
      );
    default:
      return true;
  }
}

export class MemoryEventBus {
  private subscriptions: Map<string, BusSubscription> = new Map();
  private nextId = 1;

  public subscribe(
    topic: string,
    callback: RealtimeCallback<any>,
    filter?: FilterRule,
  ): () => void {
    const id = `sub_${this.nextId++}_${Date.now()}`;
    this.subscriptions.set(id, { id, topic, callback, filter });

    return () => {
      this.subscriptions.delete(id);
    };
  }

  public publish(payload: RealtimePayload): void {
    const table = payload.table.toLowerCase();
    const eventType = payload.eventType;

    for (const sub of this.subscriptions.values()) {
      if (this.isTopicMatch(sub.topic, table, eventType)) {
        const record = payload.newData || payload.oldData;
        if (matchesFilter(record, sub.filter)) {
          try {
            Promise.resolve(sub.callback(payload)).catch((err) => {
              console.error(
                `[Realtime EventBus] Subscriber error on ${sub.topic}:`,
                err,
              );
            });
          } catch (err) {
            console.error(
              `[Realtime EventBus] Sync subscriber error on ${sub.topic}:`,
              err,
            );
          }
        }
      }
    }
  }

  private isTopicMatch(
    pattern: string,
    table: string,
    eventType: RealtimeEventType,
  ): boolean {
    const p = pattern.toLowerCase().trim();
    if (p === "*" || p === "*:*") return true;

    const [pTable, pEvent] = p.split(":");
    if (!pTable) return false;

    const tableMatches = pTable === "*" || pTable === table;
    if (!tableMatches) return false;

    if (!pEvent || pEvent === "*") return true;
    return pEvent.toUpperCase() === eventType;
  }

  public clear(): void {
    this.subscriptions.clear();
  }

  public subscriberCount(): number {
    return this.subscriptions.size;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __nishchinte_global_event_bus__: MemoryEventBus | undefined;
}

export function getGlobalEventBus(): MemoryEventBus {
  if (!globalThis.__nishchinte_global_event_bus__) {
    globalThis.__nishchinte_global_event_bus__ = new MemoryEventBus();
  }
  return globalThis.__nishchinte_global_event_bus__;
}

export const globalEventBus = getGlobalEventBus();
