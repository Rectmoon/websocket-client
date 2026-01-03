import type {
  WSConfig,
  WSMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  Unsubscribe,
} from "./types";

export class WSManager {
  private ws: WebSocket | null = null;
  private config: Required<WSConfig>;
  private heartbeatTimer: number | null = null;
  private pongTimeoutTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private currentReconnectDelay: number;
  private isIntentionallyClosed = false;
  private messageHandler: ((data: WSMessage) => void) | null = null;
  private connectionStateListeners: Set<(connected: boolean) => void> =
    new Set();

  constructor(config: WSConfig) {
    this.config = {
      url: config.url,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      pongTimeout: config.pongTimeout ?? 10000,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectDecayFactor: config.reconnectDecayFactor ?? 1.5,
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
      try {
        const message: WSMessage = JSON.parse(event.data);

        // 处理 pong 响应
        if (message.channel === "pong") {
          this.clearPongTimeout();
        }

        this.messageHandler?.(message);
      } catch (error) {
        console.error("[WSManager] Parse message failed:", error);
      }
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
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ action: "subscribe", channel: "ping" });
      this.setPongTimeout();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  private setPongTimeout(): void {
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
}
