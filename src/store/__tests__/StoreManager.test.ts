// ============================================
// StoreManager 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StoreManager } from "../StoreManager";
import { WebSocketClient } from "../../core";

describe("StoreManager", () => {
  let manager: StoreManager;
  let client: WebSocketClient;
  const mockUrl = "ws://localhost:8080";

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient({ url: mockUrl });
    manager = new StoreManager(client);
  });

  afterEach(() => {
    manager.destroy();
    client.disconnect();
    vi.useRealTimers();
  });

  describe("构造函数", () => {
    it("应该创建 StoreManager 实例", () => {
      expect(manager).toBeInstanceOf(StoreManager);
    });

    it("应该使用默认配置", () => {
      const defaultManager = new StoreManager(client);
      expect(defaultManager).toBeInstanceOf(StoreManager);
      defaultManager.destroy();
    });

    it("应该接受自定义配置", () => {
      const customManager = new StoreManager(client, {
        useRAF: false,
        batchDelay: 50,
      });
      expect(customManager).toBeInstanceOf(StoreManager);
      customManager.destroy();
    });
  });

  describe("subscribe", () => {
    it("应该订阅频道并更新 Store", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const unsubscribe = manager.subscribe("test-channel");

      expect(typeof unsubscribe).toBe("function");

      // 模拟接收消息
      client.subscribe("test-channel", (data) => {
        // 消息会被 StoreManager 处理
      });

      unsubscribe();
    });

    it("应该返回相同的取消订阅函数（幂等）", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const unsubscribe1 = manager.subscribe("test-channel");
      const unsubscribe2 = manager.subscribe("test-channel");

      expect(unsubscribe1).toBe(unsubscribe2);

      unsubscribe1();
    });
  });

  describe("unsubscribe", () => {
    it("应该取消订阅频道", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      manager.subscribe("test-channel");
      manager.unsubscribe("test-channel");

      const store = manager.getStore();
      expect(store.getState().channels.has("test-channel")).toBe(false);
    });
  });

  describe("unsubscribeAll", () => {
    it("应该取消所有订阅", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      manager.subscribe("channel1");
      manager.subscribe("channel2");

      manager.unsubscribeAll();

      const store = manager.getStore();
      expect(store.getState().channels.size).toBe(0);
    });
  });

  describe("批量更新", () => {
    it("应该使用 RAF 批量更新", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const store = manager.getStore();
      const rafSpy = vi.spyOn(window, "requestAnimationFrame");

      manager.subscribe("test-channel");

      // 模拟接收消息触发更新
      const wsManager = (client as any).wsManager;
      const messageHandler = (wsManager as any).messageHandler;
      if (messageHandler) {
        // 快速多次触发消息更新
        for (let i = 0; i < 5; i++) {
          messageHandler({
            channel: "test-channel",
            data: `test-data-${i}`,
          });
        }
      }

      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(rafSpy).toHaveBeenCalled();
      rafSpy.mockRestore();
    });

    it("应该使用定时器批量更新（当 useRAF 为 false）", async () => {
      const timerManager = new StoreManager(client, { useRAF: false });
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const setTimeoutSpy = vi.spyOn(window, "setTimeout");

      timerManager.subscribe("test-channel");

      // 模拟接收消息触发更新
      const wsManager = (client as any).wsManager;
      const messageHandler = (wsManager as any).messageHandler;
      if (messageHandler) {
        messageHandler({
          channel: "test-channel",
          data: "test-data",
        });
      }

      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
      timerManager.destroy();
    });
  });

  describe("getStore", () => {
    it("应该返回 Store 实例", () => {
      const store = manager.getStore();
      expect(store).toBeDefined();
      expect(typeof store.getState).toBe("function");
    });
  });

  describe("getClient", () => {
    it("应该返回客户端实例", () => {
      const returnedClient = manager.getClient();
      expect(returnedClient).toBe(client);
    });
  });

  describe("destroy", () => {
    it("应该清理所有资源", async () => {
      client.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      manager.subscribe("test-channel");

      manager.destroy();

      const store = manager.getStore();
      expect(store.getState().channels.size).toBe(0);
      expect(store.getState().data).toEqual({});
    });
  });
});
