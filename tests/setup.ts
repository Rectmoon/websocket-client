// ============================================
// 测试环境设置
// ============================================

import { vi } from "vitest";

// Mock WebSocket
global.WebSocket = class WebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // 模拟异步连接 - 使用 queueMicrotask 确保在下一个微任务中执行
    queueMicrotask(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    });
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    // Mock send
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code, reason }));
    }
  }

  addEventListener(): void {
    // Mock addEventListener
  }

  removeEventListener(): void {
    // Mock removeEventListener
  }
} as any;

// Mock window.requestAnimationFrame - 使用同步执行避免定时器问题
let rafIdCounter = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  const id = ++rafIdCounter;
  rafCallbacks.set(id, cb);
  // 立即执行回调，避免定时器问题
  Promise.resolve().then(() => {
    if (rafCallbacks.has(id)) {
      cb(performance.now());
      rafCallbacks.delete(id);
    }
  });
  return id as any;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

