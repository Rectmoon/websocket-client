// ============================================
// MessageRouter 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MessageRouter } from "../MessageRouter";

describe("MessageRouter", () => {
  let router: MessageRouter;

  beforeEach(() => {
    router = new MessageRouter();
  });

  describe("register", () => {
    it("应该注册回调函数", () => {
      const callback = vi.fn();
      const unsubscribe = router.register("test-channel", callback);

      expect(router.hasChannel("test-channel")).toBe(true);
      expect(router.getChannels()).toContain("test-channel");

      unsubscribe();
    });

    it("应该支持多个回调函数", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      router.register("test-channel", callback1);
      router.register("test-channel", callback2);

      expect(router.hasChannel("test-channel")).toBe(true);
    });

    it("应该返回取消订阅函数", () => {
      const callback = vi.fn();
      const unsubscribe = router.register("test-channel", callback);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
      expect(router.hasChannel("test-channel")).toBe(false);
    });
  });

  describe("unregister", () => {
    it("应该移除回调函数", () => {
      const callback = vi.fn();
      router.register("test-channel", callback);

      router.unregister("test-channel", callback);

      expect(router.hasChannel("test-channel")).toBe(false);
    });

    it("应该在没有回调时删除频道", () => {
      const callback = vi.fn();
      router.register("test-channel", callback);

      router.unregister("test-channel", callback);

      expect(router.getChannels()).not.toContain("test-channel");
    });
  });

  describe("emit", () => {
    it("应该触发注册的回调函数", () => {
      const callback = vi.fn();
      router.register("test-channel", callback);

      router.emit("test-channel", { data: "test" });

      expect(callback).toHaveBeenCalledWith({ data: "test" });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("应该触发所有注册的回调函数", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      router.register("test-channel", callback1);
      router.register("test-channel", callback2);

      router.emit("test-channel", { data: "test" });

      expect(callback1).toHaveBeenCalledWith({ data: "test" });
      expect(callback2).toHaveBeenCalledWith({ data: "test" });
    });

    it("应该处理回调函数中的错误", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalCallback = vi.fn();

      router.register("test-channel", errorCallback);
      router.register("test-channel", normalCallback);

      router.emit("test-channel", { data: "test" });

      expect(normalCallback).toHaveBeenCalled();
    });

    it("不应该触发未注册频道的回调", () => {
      const callback = vi.fn();
      router.register("test-channel", callback);

      router.emit("other-channel", { data: "test" });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("hasChannel", () => {
    it("应该返回频道是否存在", () => {
      expect(router.hasChannel("test-channel")).toBe(false);

      router.register("test-channel", vi.fn());
      expect(router.hasChannel("test-channel")).toBe(true);
    });

    it("应该在移除所有回调后返回 false", () => {
      const callback = vi.fn();
      const unsubscribe = router.register("test-channel", callback);

      expect(router.hasChannel("test-channel")).toBe(true);

      unsubscribe();
      expect(router.hasChannel("test-channel")).toBe(false);
    });
  });

  describe("getChannels", () => {
    it("应该返回所有注册的频道", () => {
      router.register("channel1", vi.fn());
      router.register("channel2", vi.fn());

      const channels = router.getChannels();

      expect(channels).toContain("channel1");
      expect(channels).toContain("channel2");
      expect(channels.length).toBe(2);
    });

    it("应该在移除频道后更新列表", () => {
      const callback = vi.fn();
      const unsubscribe = router.register("test-channel", callback);

      expect(router.getChannels()).toContain("test-channel");

      unsubscribe();
      expect(router.getChannels()).not.toContain("test-channel");
    });
  });
});

