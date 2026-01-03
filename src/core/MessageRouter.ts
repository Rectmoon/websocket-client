import type { Callback, Unsubscribe } from "./types";

export class MessageRouter {
  private routes = new Map<string, Set<Callback>>();

  register(channel: string, callback: Callback): Unsubscribe {
    if (!this.routes.has(channel)) {
      this.routes.set(channel, new Set());
    }

    this.routes.get(channel)!.add(callback);

    return () => {
      this.unregister(channel, callback);
    };
  }

  unregister(channel: string, callback: Callback): void {
    const callbacks = this.routes.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.routes.delete(channel);
      }
    }
  }

  emit(channel: string, data: any): void {
    const callbacks = this.routes.get(channel);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(
            `[MessageRouter] Callback error for ${channel}:`,
            error
          );
        }
      });
    }
  }

  hasChannel(channel: string): boolean {
    return this.routes.has(channel) && this.routes.get(channel)!.size > 0;
  }

  getChannels(): string[] {
    return Array.from(this.routes.keys());
  }
}
