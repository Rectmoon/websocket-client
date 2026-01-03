import { WSManager } from "./WSManager";
import { MessageRouter } from "./MessageRouter";
import type { Callback, Unsubscribe } from "./types";

export class SubscriptionManager {
  private subscriptions = new Map<string, number>(); // channel -> refCount
  private wsManager: WSManager;
  private messageRouter: MessageRouter;

  constructor(wsManager: WSManager, messageRouter: MessageRouter) {
    this.wsManager = wsManager;
    this.messageRouter = messageRouter;

    // 监听连接状态，重连后重新订阅
    this.wsManager.onConnectionStateChange((connected) => {
      if (connected) {
        this.resubscribeAll();
      }
    });

    // 接收消息并路由
    this.wsManager.onMessage((message) => {
      this.messageRouter.emit(message.channel, message.data);
    });
  }

  subscribe(channel: string, callback: Callback): Unsubscribe {
    // 注册回调
    const unregister = this.messageRouter.register(channel, callback);

    // 增加引用计数
    const currentCount = this.subscriptions.get(channel) ?? 0;
    this.subscriptions.set(channel, currentCount + 1);

    // 如果是首次订阅，发送订阅指令
    if (currentCount === 0 && this.wsManager.isConnected()) {
      this.wsManager.send({ action: "subscribe", channel });
      console.log(`[SubscriptionManager] Subscribed to ${channel}`);
    }

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(channel, unregister);
    };
  }

  private unsubscribe(channel: string, unregister: Unsubscribe): void {
    // 注销回调
    unregister();

    // 减少引用计数
    const currentCount = this.subscriptions.get(channel);
    if (currentCount === undefined) return;

    if (currentCount <= 1) {
      this.subscriptions.delete(channel);

      // 如果没有订阅者了，发送取消订阅指令
      if (this.wsManager.isConnected()) {
        this.wsManager.send({ action: "unsubscribe", channel });
        console.log(`[SubscriptionManager] Unsubscribed from ${channel}`);
      }
    } else {
      this.subscriptions.set(channel, currentCount - 1);
    }
  }

  private resubscribeAll(): void {
    console.log("[SubscriptionManager] Resubscribing to all channels...");

    this.subscriptions.forEach((_, channel) => {
      this.wsManager.send({ action: "subscribe", channel });
    });
  }

  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}
