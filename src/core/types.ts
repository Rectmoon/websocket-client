// ============================================
// 类型定义文件
// ============================================

/**
 * 回调函数类型
 */
export type Callback<T = any> = (data: T) => void;

/**
 * 取消订阅函数类型
 */
export type Unsubscribe = () => void;

/**
 * 连接状态监听器
 */
export type ConnectionStateListener = (connected: boolean) => void;

/**
 * WebSocket 配置
 */
export interface WSConfig {
  /** WebSocket 服务器 URL */
  url: string;
  /** 心跳间隔（毫秒），默认 30000，设置为 0 或 false 可禁用心跳 */
  heartbeatInterval?: number | false;
  /** Pong 响应超时时间（毫秒），默认 10000，设置为 0 或 false 可禁用 pong 超时检查 */
  pongTimeout?: number | false;
  /** 初始重连延迟（毫秒），默认 1000 */
  reconnectDelay?: number;
  /** 最大重连延迟（毫秒），默认 30000 */
  maxReconnectDelay?: number;
  /** 重连延迟增长因子，默认 1.5 */
  reconnectDecayFactor?: number;
  // 新增：自定义消息解析器
  messageParser?: (
    data: string | ArrayBuffer | Blob
  ) => WSMessage | Promise<WSMessage>;

  // 新增：严格 JSON 模式
  strictJsonMode?: boolean;
  /** 自定义心跳消息，可以是字符串、对象或函数。默认: { action: "subscribe", channel: "ping" } */
  heartbeatMessage?: string | object | (() => string | object);
  /** 自定义 pong 检测函数，返回 true 表示收到 pong 响应。默认检测 channel === "pong" */
  isPongMessage?: (message: WSMessage) => boolean;
  /** 是否使用 WebSocket 原生 ping（如果浏览器支持），默认 false */
  useNativePing?: boolean;
}

/**
 * 完整的 WebSocket 配置（所有字段必填）
 */
export type RequiredWSConfig = Required<WSConfig>;

/**
 * 订阅消息
 */
export interface SubscribeMessage {
  action: "subscribe";
  channel: string;
}

/**
 * 取消订阅消息
 */
export interface UnsubscribeMessage {
  action: "unsubscribe";
  channel: string;
}

/**
 * WebSocket 消息类型（联合类型）
 */
export type WSControlMessage = SubscribeMessage | UnsubscribeMessage;

/**
 * 接收到的 WebSocket 消息
 */
export interface WSMessage<T = any> {
  channel: string;
  data: T;
}

/**
 * 消息处理器
 */
export type MessageHandler<T = any> = (message: WSMessage<T>) => void;

/**
 * WebSocket 状态
 */
export enum WSState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * 连接选项
 */
export interface ConnectOptions {
  /** 认证 token */
  token?: string;
  /** 额外的查询参数 */
  params?: Record<string, string>;
}

/**
 * 订阅选项
 */
export interface SubscriptionOptions {
  /** 是否立即订阅（即使未连接） */
  immediate?: boolean;
  /** 订阅失败重试次数 */
  retries?: number;
}
