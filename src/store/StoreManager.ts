// ============================================
// StoreManager - RAF 批量更新
// ============================================

import type { WebSocketClient } from "../core";
import { createWSStore } from "./store";
import type { StoreManagerOptions } from "./types";

// ============================================
// 工厂函数
// ============================================

/**
 * 创建 StoreManager 实例
 */
export function createStoreManager(
  client: WebSocketClient,
  options?: StoreManagerOptions
): StoreManager {
  return new StoreManager(client, options);
}

/**
 * StoreManager - 管理 WebSocket 客户端与 Store 的连接
 */
export class StoreManager {
  private client: WebSocketClient;
  private store: ReturnType<typeof createWSStore>;
  private pendingUpdates: Map<string, any> = new Map();
  private rafId: number | null = null;
  private batchTimer: number | null = null;
  private options: Required<StoreManagerOptions>;
  private unsubscribers: Map<string, () => void> = new Map();

  constructor(client: WebSocketClient, options: StoreManagerOptions = {}) {
    this.client = client;
    this.store = createWSStore();
    this.options = {
      useRAF: options.useRAF ?? true,
      batchDelay: options.batchDelay ?? 16,
    };

    // 监听连接状态
    this.client.onConnectionStateChange((connected) => {
      this.store.getState().setConnected(connected);
    });

    // 初始化连接状态
    this.store.getState().setConnected(this.client.isConnected());
  }

  /**
   * 订阅频道并自动更新到 Store
   */
  subscribe<T = any>(channel: string): () => void {
    // 如果已经订阅，返回现有的取消订阅函数
    if (this.unsubscribers.has(channel)) {
      return this.unsubscribers.get(channel)!;
    }

    // 添加到频道列表
    this.store.getState().addChannel(channel);

    // 订阅 WebSocket 频道
    const unsubscribe = this.client.subscribe(channel, (data: T) => {
      this.handleChannelUpdate(channel, data);
    });

    // 保存取消订阅函数
    this.unsubscribers.set(channel, () => {
      unsubscribe();
      this.unsubscribers.delete(channel);
      this.store.getState().removeChannel(channel);
      this.store.getState().clearChannel(channel);
    });

    return this.unsubscribers.get(channel)!;
  }

  /**
   * 处理频道更新（RAF 批量更新）
   */
  private handleChannelUpdate(channel: string, data: any): void {
    // 将更新添加到待处理队列
    this.pendingUpdates.set(channel, data);

    if (this.options.useRAF) {
      // 使用 RAF 批量更新
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
          this.flushUpdates();
        });
      }
    } else {
      // 使用定时器批量更新
      if (this.batchTimer === null) {
        this.batchTimer = window.setTimeout(() => {
          this.flushUpdates();
        }, this.options.batchDelay);
      }
    }
  }

  /**
   * 批量刷新更新
   */
  private flushUpdates(): void {
    if (this.pendingUpdates.size === 0) {
      this.rafId = null;
      this.batchTimer = null;
      return;
    }

    // 批量更新到 Store
    const updates: Record<string, any> = {};
    this.pendingUpdates.forEach((data, channel) => {
      updates[channel] = data;
    });

    this.store.getState().batchUpdateChannels(updates);

    // 清空待处理队列
    this.pendingUpdates.clear();

    // 重置定时器
    this.rafId = null;
    this.batchTimer = null;
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channel: string): void {
    const unsubscribe = this.unsubscribers.get(channel);
    if (unsubscribe) {
      unsubscribe();
    }
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.clear();
  }

  /**
   * 获取 Store 实例
   */
  getStore(): ReturnType<typeof createWSStore> {
    return this.store;
  }

  /**
   * 获取客户端实例
   */
  getClient(): WebSocketClient {
    return this.client;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.unsubscribeAll();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingUpdates.clear();
    this.store.getState().clearAll();
  }
}
