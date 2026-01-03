import { WSManager } from "./WSManager";
import { MessageRouter } from "./MessageRouter";
import { SubscriptionManager } from "./SubscriptionManager";
import type { WSConfig, Callback, Unsubscribe } from "./types";

export class WebSocketClient {
  private wsManager: WSManager;
  private messageRouter: MessageRouter;
  private subscriptionManager: SubscriptionManager;

  constructor(config: WSConfig) {
    this.wsManager = new WSManager(config);
    this.messageRouter = new MessageRouter();
    this.subscriptionManager = new SubscriptionManager(
      this.wsManager,
      this.messageRouter
    );
  }

  connect(): void {
    this.wsManager.connect();
  }

  disconnect(): void {
    this.wsManager.disconnect();
  }

  subscribe(channel: string, callback: Callback): Unsubscribe {
    return this.subscriptionManager.subscribe(channel, callback);
  }

  isConnected(): boolean {
    return this.wsManager.isConnected();
  }

  onConnectionStateChange(listener: (connected: boolean) => void): Unsubscribe {
    return this.wsManager.onConnectionStateChange(listener);
  }

  send(data: string | object | ArrayBuffer): void {
    this.wsManager.sendRaw(data);
  }
}
