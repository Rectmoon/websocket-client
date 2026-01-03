import type {
  WSConfig,
  WSMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  Unsubscribe,
} from "./types";

export class WSManager {
  private ws: WebSocket | null = null;
  private config: Omit<
    Required<WSConfig>,
    "heartbeatInterval" | "pongTimeout"
  > & {
    heartbeatInterval: number; // 内部总是 number（false 已转换为 0）
    pongTimeout: number; // 内部总是 number（false 已转换为 0）
    heartbeatMessage?: string | object | (() => string | object);
    isPongMessage?: (message: WSMessage) => boolean;
    useNativePing?: boolean;
  };
  private heartbeatTimer: number | null = null;
  private pongTimeoutTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private currentReconnectDelay: number;
  private isIntentionallyClosed = false;
  private messageHandler: ((data: WSMessage) => void) | null = null;
  private connectionStateListeners: Set<(connected: boolean) => void> =
    new Set();

  constructor(config: WSConfig) {
    const heartbeatInterval =
      config.heartbeatInterval === false || config.heartbeatInterval === 0
        ? 0
        : config.heartbeatInterval ?? 30000;

    const pongTimeout =
      config.pongTimeout === false || config.pongTimeout === 0
        ? 0
        : config.pongTimeout ?? 10000;

    this.config = {
      url: config.url,
      heartbeatInterval: heartbeatInterval,
      pongTimeout: pongTimeout,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectDecayFactor: config.reconnectDecayFactor ?? 1.5,
      messageParser:
        config.messageParser ?? ((data) => this.parseMessage(data)),
      strictJsonMode: config.strictJsonMode ?? true,
      heartbeatMessage: config.heartbeatMessage ?? {
        action: "subscribe",
        channel: "ping",
      },
      isPongMessage:
        config.isPongMessage ?? ((message) => message.channel === "pong"),
      useNativePing: config.useNativePing ?? false,
    } as Omit<Required<WSConfig>, "heartbeatInterval" | "pongTimeout"> & {
      heartbeatInterval: number;
      pongTimeout: number;
      heartbeatMessage?: string | object | (() => string | object);
      isPongMessage?: (message: WSMessage) => boolean;
      useNativePing?: boolean;
    };
    this.currentReconnectDelay = this.config.reconnectDelay;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isIntentionallyClosed = false;
    this.ws = new WebSocket(this.config.url);

    this.ws.onopen = () => {
      console.log("[WSManager] Connected");
      this.currentReconnectDelay = this.config.reconnectDelay;
      this.startHeartbeat();
      this.notifyConnectionState(true);
    };

    this.ws.onmessage = (event) => {
      // 使用 handleMessage 方法处理消息，支持 JSON 和非 JSON 格式
      this.handleMessage(event.data).catch((error) => {
        console.error("[WSManager] Message handling failed:", error);
      });
    };

    this.ws.onerror = (error) => {
      console.error("[WSManager] Error:", error);
    };

    this.ws.onclose = () => {
      console.log("[WSManager] Disconnected");
      this.stopHeartbeat();
      this.notifyConnectionState(false);

      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.clearPongTimeout();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: SubscribeMessage | UnsubscribeMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * 发送原始数据到 WebSocket 服务器
   * @param data 要发送的数据，可以是字符串、对象或 ArrayBuffer
   */
  sendRaw(data: string | object | ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (data instanceof ArrayBuffer) {
        this.ws.send(data);
      } else if (typeof data === "string") {
        this.ws.send(data);
      } else {
        this.ws.send(JSON.stringify(data));
      }
    }
  }

  onMessage(handler: (data: WSMessage) => void): void {
    this.messageHandler = handler;
  }

  onConnectionStateChange(listener: (connected: boolean) => void): Unsubscribe {
    this.connectionStateListeners.add(listener);
    return () => this.connectionStateListeners.delete(listener);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    // 如果心跳间隔为 0，禁用心跳
    if (this.config.heartbeatInterval === 0) {
      return;
    }

    this.stopHeartbeat();

    // 如果使用原生 ping（浏览器支持）
    if (this.config.useNativePing && this.ws) {
      // 使用 WebSocket 原生的 ping（如果支持）
      // 注意：浏览器 WebSocket API 不直接支持 ping，但某些环境（如 Node.js）支持
      // 这里我们仍然使用应用层心跳，但可以优化为更轻量的方式
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          // 尝试使用原生 ping（如果可用）
          // 由于浏览器限制，我们仍然发送应用层心跳
          this.sendHeartbeat();
          // 只有在启用了 pong 超时检查时才设置超时
          if (this.config.pongTimeout > 0) {
            this.setPongTimeout();
          }
        }
      }, this.config.heartbeatInterval);
    } else {
      // 使用应用层心跳
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendHeartbeat();
          // 只有在启用了 pong 超时检查时才设置超时
          if (this.config.pongTimeout > 0) {
            this.setPongTimeout();
          }
        }
      }, this.config.heartbeatInterval);
    }
  }

  private sendHeartbeat(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const heartbeatMsg = this.config.heartbeatMessage;
    let message: string;

    if (typeof heartbeatMsg === "function") {
      const result = heartbeatMsg();
      message = typeof result === "string" ? result : JSON.stringify(result);
    } else if (typeof heartbeatMsg === "string") {
      message = heartbeatMsg;
    } else {
      message = JSON.stringify(heartbeatMsg);
    }

    this.ws.send(message);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  private setPongTimeout(): void {
    // 如果 pong 超时为 0，不设置超时
    if (this.config.pongTimeout === 0) {
      return;
    }

    this.clearPongTimeout();
    this.pongTimeoutTimer = window.setTimeout(() => {
      console.warn("[WSManager] Pong timeout, closing connection");
      if (this.ws) {
        this.ws.close();
      }
    }, this.config.pongTimeout);
  }

  private clearPongTimeout(): void {
    if (this.pongTimeoutTimer !== null) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    console.log(
      `[WSManager] Reconnecting in ${this.currentReconnectDelay}ms...`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * this.config.reconnectDecayFactor,
        this.config.maxReconnectDelay
      );
    }, this.currentReconnectDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionStateListeners.forEach((listener) => listener(connected));
  }

  /**
   * 处理接收到的消息
   */
  private async handleMessage(
    data: string | ArrayBuffer | Blob
  ): Promise<void> {
    try {
      let message: WSMessage;

      // 如果有自定义解析器，使用自定义解析器
      if (this.config.messageParser) {
        message = await this.config.messageParser(data);
      } else {
        // 默认解析逻辑
        message = this.parseMessage(data);
      }

      // 处理 pong 响应（使用自定义检测函数）
      if (this.config.isPongMessage && this.config.isPongMessage(message)) {
        this.clearPongTimeout();
      }

      // 过滤掉以 __ 开头的特殊 channel（用于内部消息过滤）
      if (message.channel.startsWith("__")) {
        return;
      }

      this.messageHandler?.(message);
    } catch (error) {
      console.error("[WSManager] Message handling failed:", error);
    }
  }

  /**
   * 默认消息解析器
   */
  private parseMessage(data: string | ArrayBuffer | Blob): WSMessage {
    // 提前处理二进制数据
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      return { channel: "binary", data };
    }

    // 处理字符串数据
    const text = data as string;

    // 尝试解析 JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // 不是 JSON，作为纯文本处理
      if (this.config.strictJsonMode) {
        throw new Error("Strict JSON mode: received non-JSON message");
      }
      return { channel: "message", data: text };
    }

    // 检查是否是标准消息格式 { channel, data }
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "channel" in parsed
    ) {
      return parsed as WSMessage;
    }

    // JSON 但不是标准格式，包装为 WSMessage
    return { channel: "message", data: parsed };
  }
}
