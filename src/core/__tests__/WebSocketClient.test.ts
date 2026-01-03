// ============================================
// WebSocketClient 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketClient } from "../WebSocketClient";

describe("WebSocketClient", () => {
  let client: WebSocketClient;
  const mockUrl = "ws://localhost:8080";

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient({ url: mockUrl });
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
  });

  describe("构造函数", () => {
    it("应该创建客户端实例", () => {
      expect(client).toBeInstanceOf(WebSocketClient);
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("connect", () => {
    it("应该建立连接", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(client.isConnected()).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("应该断开连接", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      client.disconnect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(client.isConnected()).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("应该订阅频道", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const callback = vi.fn();
      const unsubscribe = client.subscribe("test-channel", callback);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
    });

    it("应该接收频道消息", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const callback = vi.fn();
      client.subscribe("test-channel", callback);

      // 模拟接收消息
      const wsManager = (client as any).wsManager;
      const messageHandler = (wsManager as any).messageHandler;
      if (messageHandler) {
        messageHandler({
          channel: "test-channel",
          data: "test-data",
        });
      }

      expect(callback).toHaveBeenCalledWith("test-data");
    });
  });

  describe("isConnected", () => {
    it("应该返回连接状态", async () => {
      expect(client.isConnected()).toBe(false);

      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(client.isConnected()).toBe(true);
    });
  });

  describe("onConnectionStateChange", () => {
    it("应该监听连接状态变化", async () => {
      const listener = vi.fn();
      const unsubscribe = client.onConnectionStateChange(listener);

      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(listener).toHaveBeenCalledWith(true);

      unsubscribe();
    });
  });
});

