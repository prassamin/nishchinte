import type {
  RealtimeEventType,
  RealtimeCallback,
  FilterRule,
  RealtimePayload,
  RealtimeChannel as IRealtimeChannel,
} from "../types";
import { matchesFilter } from "../bus/emitter";

export interface ChannelListener<T = Record<string, unknown>> {
  event: RealtimeEventType;
  filter?: FilterRule;
  callback: RealtimeCallback<T>;
}

export class RealtimeChannel<
  T = Record<string, unknown>,
> implements IRealtimeChannel<T> {
  public readonly topic: string;
  private listeners: ChannelListener<T>[] = [];
  private client: {
    subscribeChannel: (
      channel: RealtimeChannel<any>,
      onStatus?: (status: any) => void,
    ) => { unsubscribe: () => void };
  };

  constructor(topic: string, client: any) {
    this.topic = topic.toLowerCase();
    this.client = client;
  }

  public on(
    event: RealtimeEventType,
    callbackOrFilter: FilterRule | RealtimeCallback<T>,
    maybeCallback?: RealtimeCallback<T>,
  ): this {
    if (typeof callbackOrFilter === "function") {
      this.listeners.push({
        event,
        callback: callbackOrFilter,
      });
    } else if (maybeCallback) {
      this.listeners.push({
        event,
        filter: callbackOrFilter,
        callback: maybeCallback,
      });
    }
    return this;
  }

  public subscribe(
    callback?: (
      status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
    ) => void,
  ): {
    unsubscribe: () => void;
  } {
    return this.client.subscribeChannel(this, callback);
  }

  public dispatch(payload: RealtimePayload<T>): void {
    const eventType = payload.eventType;
    for (const listener of this.listeners) {
      if (listener.event === "*" || listener.event === eventType) {
        const record = payload.newData || payload.oldData;
        if (matchesFilter(record as Record<string, unknown>, listener.filter)) {
          try {
            listener.callback(payload);
          } catch (err) {
            console.error(
              `[RealtimeChannel:${this.topic}] Listener error:`,
              err,
            );
          }
        }
      }
    }
  }
}
