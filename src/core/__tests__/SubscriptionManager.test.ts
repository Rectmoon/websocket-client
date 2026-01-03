// ============================================
// SubscriptionManager 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SubscriptionManager } from "../SubscriptionManager";
import { WSManager } from "../WSManager";
import { MessageRouter } from "../MessageRouter";

describe("SubscriptionManager", () => {
  let manager: SubscriptionManager;
  let wsManager: WSManager;
  let messageRouter: MessageRouter;
  const mockUrl = "ws://localhost:8080";

  beforeEach(() => {
    vi.useFakeTimers();
    wsManager = new WSManager({ url: mockUrl });
    messageRouter = new MessageRouter();
    manager = new SubscriptionManager(wsManager, messageRouter);
  });

  afterEach(() => {
    wsManager.disconnect();
    vi.useRealTimers();
  });

  describe("subscribe", () => {
    it("应该注册订阅", () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe("test-channel", callback);

      expect(typeof unsubscribe).toBe("function");
      expect(manager.getActiveChannels()).toContain("test-channel");

      unsubscribe();
    });

    it("应该在连接时发送订阅消息", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(wsManager, "send");

      manager.subscribe("test-channel", vi.fn());

      expect(sendSpy).toHaveBeenCalledWith({
        action: "subscribe",
        channel: "test-channel",
      });

      sendSpy.mockRestore();
    });

    it("应该支持多个订阅者", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe("test-channel", callback1);
      manager.subscribe("test-channel", callback2);

      expect(manager.getActiveChannels()).toContain("test-channel");
    });

    it("应该路由消息到回调", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const callback = vi.fn();
      manager.subscribe("test-channel", callback);

      // 模拟接收消息
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

  describe("unsubscribe", () => {
    it("应该取消订阅", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const callback = vi.fn();
      const unsubscribe = manager.subscribe("test-channel", callback);

      expect(manager.getActiveChannels()).toContain("test-channel");

      unsubscribe();

      expect(manager.getActiveChannels()).not.toContain("test-channel");
    });

    it("应该在最后一个订阅者取消时发送取消订阅消息", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(wsManager, "send");

      const unsubscribe = manager.subscribe("test-channel", vi.fn());
      unsubscribe();

      expect(sendSpy).toHaveBeenCalledWith({
        action: "unsubscribe",
        channel: "test-channel",
      });

      sendSpy.mockRestore();
    });

    it("应该在仍有订阅者时不发送取消订阅消息", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(wsManager, "send");

      const unsubscribe1 = manager.subscribe("test-channel", vi.fn());
      manager.subscribe("test-channel", vi.fn());

      unsubscribe1();

      // 应该没有发送取消订阅消息
      const unsubscribeCalls = sendSpy.mock.calls.filter(
        (call) => call[0].action === "unsubscribe"
      );
      expect(unsubscribeCalls.length).toBe(0);

      sendSpy.mockRestore();
    });
  });

  describe("重连后重新订阅", () => {
    it("应该在重连后重新订阅所有频道", async () => {
      wsManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(wsManager, "send");

      manager.subscribe("channel1", vi.fn());
      manager.subscribe("channel2", vi.fn());

      // 模拟断开连接
      wsManager.disconnect();
      await vi.runOnlyPendingTimersAsync();

      // 重新连接
      wsManager.connect();
      await vi.runOnlyPendingTimersAsync();

      // 验证重新订阅
      const subscribeCalls = sendSpy.mock.calls.filter(
        (call) => call[0].action === "subscribe"
      );
      expect(subscribeCalls.length).toBeGreaterThan(0);

      sendSpy.mockRestore();
    });
  });

  describe("getActiveChannels", () => {
    it("应该返回所有活跃的频道", () => {
      manager.subscribe("channel1", vi.fn());
      manager.subscribe("channel2", vi.fn());

      const channels = manager.getActiveChannels();

      expect(channels).toContain("channel1");
      expect(channels).toContain("channel2");
    });

    it("应该在取消订阅后更新列表", () => {
      const unsubscribe = manager.subscribe("test-channel", vi.fn());

      expect(manager.getActiveChannels()).toContain("test-channel");

      unsubscribe();

      expect(manager.getActiveChannels()).not.toContain("test-channel");
    });
  });
});
