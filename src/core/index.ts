// ============================================
// Core 模块统一导出
// ============================================

// 主要客户端类
export { WebSocketClient } from "./WebSocketClient";

// 底层模块（高级用法）
export { WSManager } from "./WSManager";
export { MessageRouter } from "./MessageRouter";
export { SubscriptionManager } from "./SubscriptionManager";

// 类型定义
export type {
  // 基础类型
  Callback,
  Unsubscribe,
  ConnectionStateListener,

  // 配置类型
  WSConfig,
  RequiredWSConfig,
  ConnectOptions,
  SubscriptionOptions,

  // 消息类型
  SubscribeMessage,
  UnsubscribeMessage,
  WSControlMessage,
  WSMessage,
  MessageHandler,

  // 枚举
  WSState,
} from "./types";

/**
 * 创建 WebSocket 客户端的工厂函数
 *
 * @param config - WebSocket 配置
 * @returns WebSocket 客户端实例
 *
 * @example
 * ```ts
 * import { createWSClient } from '@/core';
 *
 * const client = createWSClient({
 *   url: 'wss://api.example.com/ws',
 *   heartbeatInterval: 30000,
 * });
 *
 * client.connect();
 * ```
 */
export { WebSocketClient as createWSClient } from "./WebSocketClient";
