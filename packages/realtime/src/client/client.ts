import { RealtimeChannel } from "./channel";
import type { RealtimePayload } from "../types";

export interface RealtimeClientOptions {
  enabled?: boolean;
  url?: string;
  autoConnect?: boolean;
  reconnectIntervalMs?: number;
}

export class RealtimeClient {
  private url: string;
  private enabled: boolean;
  private channels: Map<string, RealtimeChannel<any>> = new Map();
  private eventSource?: EventSource;
  private isConnected = false;
  private reconnectInterval: number;
  private reconnectTimer?: any;
  private reconnectAttempts = 0;
  private visibilityHandler?: () => void;

  constructor(options: RealtimeClientOptions = {}) {
    this.url = options.url || "/api/realtime";
    this.enabled = options.enabled ?? true;
    this.reconnectInterval = options.reconnectIntervalMs || 3000;

    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (document.visibilityState === "visible") {
          if (this.enabled && !this.isConnected && this.channels.size > 0) {
            this.connect();
          }
        } else if (document.visibilityState === "hidden") {
          // Temporarily pause connection when tab is minimized to save server resources
          this.disconnect(false);
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

    if (options.autoConnect && this.enabled) {
      this.connect();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.disconnect();
    }
  }

  public channel<T = Record<string, unknown>>(topic: string): RealtimeChannel<T> {
    const key = topic.toLowerCase();
    if (!this.channels.has(key)) {
      this.channels.set(key, new RealtimeChannel<T>(key, this));
    }
    return this.channels.get(key) as RealtimeChannel<T>;
  }

  public subscribeChannel(
    channel: RealtimeChannel<any>,
    onStatus?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR") => void,
  ): { unsubscribe: () => void } {
    if (this.enabled && !this.isConnected) {
      this.connect();
    }

    if (onStatus) {
      onStatus(this.enabled ? "SUBSCRIBED" : "CLOSED");
    }

    return {
      unsubscribe: () => {
        this.channels.delete(channel.topic);
        if (this.channels.size === 0) {
          this.disconnect();
        }
      },
    };
  }

  public connect(): void {
    if (!this.enabled || typeof window === "undefined" || this.isConnected) return;

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload: RealtimePayload = JSON.parse(event.data);
          const channel = this.channels.get(payload.table.toLowerCase());
          if (channel) {
            channel.dispatch(payload);
          }

          // Wildcard listeners
          const globalChannel = this.channels.get("*");
          if (globalChannel) {
            globalChannel.dispatch(payload);
          }
        } catch {
          // Ignore heartbeat or non-json message
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.eventSource?.close();
        if (this.enabled) {
          this.reconnectAttempts++;
          clearTimeout(this.reconnectTimer);
          // Exponential backoff with a cap of 30 seconds
          const delay = Math.min(
            30000,
            this.reconnectInterval * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 6)),
          );
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };
    } catch (err) {
      console.error("[RealtimeClient] Connection error:", err);
    }
  }

  public disconnect(clearChannels = false): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    this.isConnected = false;
    if (clearChannels) {
      this.channels.clear();
    }
  }

  public removeChannel(topic: string): void {
    this.channels.delete(topic.toLowerCase());
  }

  public removeAllChannels(): void {
    this.disconnect(true);
  }
}

export function createRealtimeClient(options?: RealtimeClientOptions): RealtimeClient {
  return new RealtimeClient(options);
}

export const realtime = createRealtimeClient();
