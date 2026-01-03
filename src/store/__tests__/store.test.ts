// ============================================
// Store 单元测试
// ============================================

import { describe, it, expect, beforeEach } from "vitest";
import { createWSStore } from "../store";

describe("createWSStore", () => {
  let store: ReturnType<typeof createWSStore>;

  beforeEach(() => {
    store = createWSStore();
  });

  describe("初始状态", () => {
    it("应该有正确的初始状态", () => {
      const state = store.getState();

      expect(state.data).toEqual({});
      expect(state.timestamps).toEqual({});
      expect(state.connected).toBe(false);
      expect(state.channels.size).toBe(0);
    });
  });

  describe("updateChannel", () => {
    it("应该更新频道数据", () => {
      store.getState().updateChannel("test-channel", { value: 123 });

      const data = store.getState().getChannelData("test-channel");
      expect(data).toEqual({ value: 123 });
    });

    it("应该更新时间戳", () => {
      const before = Date.now();
      store.getState().updateChannel("test-channel", { value: 123 });
      const after = Date.now();

      const timestamp = store.getState().getChannelTimestamp("test-channel");
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("batchUpdateChannels", () => {
    it("应该批量更新多个频道", () => {
      store.getState().batchUpdateChannels({
        "channel1": { value: 1 },
        "channel2": { value: 2 },
      });

      expect(store.getState().getChannelData("channel1")).toEqual({
        value: 1,
      });
      expect(store.getState().getChannelData("channel2")).toEqual({
        value: 2,
      });
    });

    it("应该使用相同的时间戳", () => {
      store.getState().batchUpdateChannels({
        "channel1": { value: 1 },
        "channel2": { value: 2 },
      });

      const ts1 = store.getState().getChannelTimestamp("channel1");
      const ts2 = store.getState().getChannelTimestamp("channel2");

      expect(ts1).toBe(ts2);
    });
  });

  describe("setConnected", () => {
    it("应该设置连接状态", () => {
      store.getState().setConnected(true);
      expect(store.getState().connected).toBe(true);

      store.getState().setConnected(false);
      expect(store.getState().connected).toBe(false);
    });
  });

  describe("addChannel / removeChannel", () => {
    it("应该添加频道", () => {
      store.getState().addChannel("test-channel");
      expect(store.getState().channels.has("test-channel")).toBe(true);
    });

    it("应该移除频道", () => {
      store.getState().addChannel("test-channel");
      store.getState().removeChannel("test-channel");
      expect(store.getState().channels.has("test-channel")).toBe(false);
    });
  });

  describe("clearChannel", () => {
    it("应该清除频道数据", () => {
      store.getState().updateChannel("test-channel", { value: 123 });
      store.getState().clearChannel("test-channel");

      expect(store.getState().getChannelData("test-channel")).toBeNull();
      expect(store.getState().getChannelTimestamp("test-channel")).toBeNull();
    });
  });

  describe("clearAll", () => {
    it("应该清除所有数据", () => {
      store.getState().updateChannel("channel1", { value: 1 });
      store.getState().updateChannel("channel2", { value: 2 });
      store.getState().addChannel("channel1");
      store.getState().setConnected(true);

      store.getState().clearAll();

      expect(store.getState().data).toEqual({});
      expect(store.getState().timestamps).toEqual({});
      expect(store.getState().channels.size).toBe(0);
    });
  });

  describe("getChannelData", () => {
    it("应该返回频道数据", () => {
      store.getState().updateChannel("test-channel", { value: 123 });

      const data = store.getState().getChannelData<{ value: number }>(
        "test-channel"
      );
      expect(data).toEqual({ value: 123 });
    });

    it("应该在频道不存在时返回 null", () => {
      const data = store.getState().getChannelData("non-existent");
      expect(data).toBeNull();
    });
  });

  describe("getChannelTimestamp", () => {
    it("应该返回频道时间戳", () => {
      store.getState().updateChannel("test-channel", { value: 123 });

      const timestamp = store.getState().getChannelTimestamp("test-channel");
      expect(typeof timestamp).toBe("number");
      expect(timestamp).toBeGreaterThan(0);
    });

    it("应该在频道不存在时返回 null", () => {
      const timestamp = store.getState().getChannelTimestamp("non-existent");
      expect(timestamp).toBeNull();
    });
  });
});

