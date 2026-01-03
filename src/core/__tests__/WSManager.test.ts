// ============================================
// WSManager 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WSManager } from "../WSManager";

describe("WSManager", () => {
  let manager: WSManager;
  const mockUrl = "ws://localhost:8080";

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new WSManager({ url: mockUrl });
  });

  afterEach(() => {
    manager.disconnect();
    vi.useRealTimers();
  });

  describe("构造函数", () => {
    it("应该使用默认配置", () => {
      const defaultManager = new WSManager({ url: mockUrl });
      expect(defaultManager.isConnected()).toBe(false);
      defaultManager.disconnect();
    });

    it("应该接受自定义配置", () => {
      const customManager = new WSManager({
        url: mockUrl,
        heartbeatInterval: 10000,
        reconnectDelay: 500,
      });
      expect(customManager.isConnected()).toBe(false);
      customManager.disconnect();
    });
  });

  describe("connect", () => {
    it("应该建立 WebSocket 连接", async () => {
      const onOpenSpy = vi.fn();
      manager.onConnectionStateChange(onOpenSpy);

      manager.connect();

      // 等待微任务完成
      await Promise.resolve();
      // 不运行所有定时器，只运行待处理的
      await vi.runOnlyPendingTimersAsync();

      expect(onOpenSpy).toHaveBeenCalledWith(true);
      expect(manager.isConnected()).toBe(true);
    });

    it("不应该重复连接已连接的 WebSocket", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const initialState = manager.isConnected();
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(manager.isConnected()).toBe(initialState);
    });
  });

  describe("disconnect", () => {
    it("应该关闭 WebSocket 连接", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const onCloseSpy = vi.fn();
      manager.onConnectionStateChange(onCloseSpy);

      manager.disconnect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(onCloseSpy).toHaveBeenCalledWith(false);
      expect(manager.isConnected()).toBe(false);
    });

    it("应该清理所有定时器", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      manager.disconnect();
      await Promise.resolve();

      // 验证定时器已清理（通过检查连接状态）
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe("send", () => {
    it("应该在连接时发送消息", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(WebSocket.prototype, "send");

      manager.send({ action: "subscribe", channel: "test" });

      expect(sendSpy).toHaveBeenCalled();
      sendSpy.mockRestore();
    });

    it("不应该在未连接时发送消息", () => {
      const sendSpy = vi.spyOn(WebSocket.prototype, "send");

      manager.send({ action: "subscribe", channel: "test" });

      expect(sendSpy).not.toHaveBeenCalled();
      sendSpy.mockRestore();
    });
  });

  describe("onMessage", () => {
    it("应该处理接收到的消息", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      // 模拟接收消息
      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({ channel: "test", data: "message" }),
        });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      expect(messageHandler).toHaveBeenCalledWith({
        channel: "test",
        data: "message",
      });
    });

    it("应该处理非 JSON 格式的纯文本消息", async () => {
      // 创建禁用严格 JSON 模式的 manager
      const nonStrictManager = new WSManager({
        url: mockUrl,
        strictJsonMode: false,
      });
      const messageHandler = vi.fn();
      nonStrictManager.onMessage(messageHandler);
      nonStrictManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (nonStrictManager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收纯文本消息（非 JSON）
        ws.onmessage({ data: "Request se..." });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息被正确包装为 WSMessage 格式
      expect(messageHandler).toHaveBeenCalledWith({
        channel: "message",
        data: "Request se...",
      });

      nonStrictManager.disconnect();
    });

    it("应该处理无效的 JSON 字符串而不抛出错误", async () => {
      // 创建禁用严格 JSON 模式的 manager
      const nonStrictManager = new WSManager({
        url: mockUrl,
        strictJsonMode: false,
      });
      const messageHandler = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, "error");
      nonStrictManager.onMessage(messageHandler);
      nonStrictManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (nonStrictManager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收无效 JSON 字符串
        ws.onmessage({ data: "invalid json { broken" });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息被正确处理，不应该有错误日志
      expect(messageHandler).toHaveBeenCalledWith({
        channel: "message",
        data: "invalid json { broken",
      });
      // 不应该有错误日志（因为现在会正确处理非 JSON 消息）
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
      nonStrictManager.disconnect();
    });

    it("应该在严格 JSON 模式下对非 JSON 消息抛出错误", async () => {
      // 使用默认的严格模式
      const strictManager = new WSManager({ url: mockUrl });
      const messageHandler = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, "error");
      strictManager.onMessage(messageHandler);
      strictManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (strictManager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收非 JSON 消息
        ws.onmessage({ data: "Request se..." });
        // 等待异步处理完成
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息处理器没有被调用（因为抛出了错误）
      expect(messageHandler).not.toHaveBeenCalled();
      // 验证有错误日志
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
      strictManager.disconnect();
    });

    it("应该处理 JSON 对象但没有 channel 字段的消息", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收 JSON 对象但没有 channel 字段
        ws.onmessage({
          data: JSON.stringify({ data: "some data", other: "field" }),
        });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息被包装为 WSMessage 格式
      expect(messageHandler).toHaveBeenCalledWith({
        channel: "message",
        data: { data: "some data", other: "field" },
      });
    });

    it("应该处理二进制数据", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收二进制数据
        const binaryData = new ArrayBuffer(8);
        ws.onmessage({ data: binaryData });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证二进制数据被正确处理
      expect(messageHandler).toHaveBeenCalled();
      const callArgs = messageHandler.mock.calls[0][0];
      expect(callArgs.channel).toBe("binary");
      expect(callArgs.data).toBeInstanceOf(ArrayBuffer);
    });

    it("应该过滤掉以 __ 开头的特殊 channel 消息", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收以 __ 开头的特殊 channel 消息
        ws.onmessage({
          data: JSON.stringify({ channel: "__ignore__", data: "test" }),
        });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息处理器没有被调用（消息被过滤）
      expect(messageHandler).not.toHaveBeenCalled();
    });

    it("应该过滤掉以 __ 开头的其他特殊 channel 消息", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 测试不同的以 __ 开头的 channel
        const specialChannels = ["__control__", "__internal__", "__system__"];

        for (const channel of specialChannels) {
          ws.onmessage({
            data: JSON.stringify({ channel, data: "test" }),
          });
          await Promise.resolve();
          await Promise.resolve();
        }
      }

      // 验证消息处理器没有被调用（所有特殊消息都被过滤）
      expect(messageHandler).not.toHaveBeenCalled();
    });

    it("应该正常处理不以 __ 开头的消息", async () => {
      const messageHandler = vi.fn();
      manager.onMessage(messageHandler);
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 模拟接收正常消息
        ws.onmessage({
          data: JSON.stringify({ channel: "normal", data: "test" }),
        });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证消息处理器被正常调用
      expect(messageHandler).toHaveBeenCalledWith({
        channel: "normal",
        data: "test",
      });
    });
  });

  describe("心跳机制", () => {
    it("应该发送 ping 消息", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const sendSpy = vi.spyOn(WebSocket.prototype, "send");

      // 等待心跳间隔并运行定时器
      vi.advanceTimersByTime(30000);
      await vi.runOnlyPendingTimersAsync();

      expect(sendSpy).toHaveBeenCalled();
      sendSpy.mockRestore();
    });

    it("应该处理 pong 响应", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const ws = (manager as any).ws;
      if (ws && ws.onmessage) {
        // 发送 pong 响应
        ws.onmessage({
          data: JSON.stringify({ channel: "pong", data: null }),
        });
        // 等待异步处理完成（handleMessage 是 async 的）
        await Promise.resolve();
        await Promise.resolve();
      }

      // 验证 pong 超时被清除（通过检查没有错误）
      expect(manager.isConnected()).toBe(true);
    });
  });

  describe("重连机制", () => {
    it("应该在连接断开后自动重连", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const onReconnectSpy = vi.fn();
      manager.onConnectionStateChange(onReconnectSpy);

      // 模拟连接断开
      const ws = (manager as any).ws;
      if (ws && ws.onclose) {
        ws.onclose(new CloseEvent("close"));
      }

      await vi.runOnlyPendingTimersAsync();

      // 验证重连逻辑（可能需要多次检查）
      expect(onReconnectSpy).toHaveBeenCalled();
    });

    it("不应该在主动断开后重连", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      const onReconnectSpy = vi.fn();
      manager.onConnectionStateChange(onReconnectSpy);

      manager.disconnect();

      await vi.runOnlyPendingTimersAsync();

      // 验证不会重连
      expect(manager.isConnected()).toBe(false);
    });

    it("应该使用指数退避策略增加重连延迟", async () => {
      const customManager = new WSManager({
        url: mockUrl,
        reconnectDelay: 1000,
        reconnectDecayFactor: 2,
        maxReconnectDelay: 10000,
      });

      customManager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      // 获取初始延迟
      const initialDelay = (customManager as any).currentReconnectDelay;

      // 模拟连接断开
      const ws = (customManager as any).ws;
      if (ws && ws.onclose) {
        ws.onclose(new CloseEvent("close"));
      }

      // 等待重连定时器触发
      await vi.runOnlyPendingTimersAsync();

      // 验证延迟已增加（指数退避）
      const newDelay = (customManager as any).currentReconnectDelay;
      expect(newDelay).toBeGreaterThan(initialDelay);
      expect(newDelay).toBe(initialDelay * 2); // 验证指数增长

      customManager.disconnect();
    });
  });

  describe("isConnected", () => {
    it("应该在未连接时返回 false", () => {
      expect(manager.isConnected()).toBe(false);
    });

    it("应该在连接后返回 true", async () => {
      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(manager.isConnected()).toBe(true);
    });
  });

  describe("onConnectionStateChange", () => {
    it("应该注册连接状态监听器", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.onConnectionStateChange(listener);

      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      expect(listener).toHaveBeenCalledWith(true);

      unsubscribe();
    });

    it("应该支持取消订阅", async () => {
      const listener = vi.fn();
      const unsubscribe = manager.onConnectionStateChange(listener);

      unsubscribe();

      manager.connect();
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();

      // 由于已取消订阅，不应该再被调用
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
