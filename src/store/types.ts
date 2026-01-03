// ============================================
// Store 类型定义
// ============================================

/**
 * Store 状态接口
 */
export interface WSStoreState {
  /** 频道数据映射 */
  data: Record<string, any>;
  /** 频道时间戳映射 */
  timestamps: Record<string, number>;
  /** 连接状态 */
  connected: boolean;
  /** 订阅的频道列表 */
  channels: Set<string>;
}

/**
 * Store Actions
 */
export interface WSStoreActions {
  /** 更新频道数据 */
  updateChannel: (channel: string, data: any) => void;
  /** 批量更新频道数据 */
  batchUpdateChannels: (updates: Record<string, any>) => void;
  /** 设置连接状态 */
  setConnected: (connected: boolean) => void;
  /** 添加订阅频道 */
  addChannel: (channel: string) => void;
  /** 移除订阅频道 */
  removeChannel: (channel: string) => void;
  /** 清除频道数据 */
  clearChannel: (channel: string) => void;
  /** 清除所有数据 */
  clearAll: () => void;
  /** 获取频道数据 */
  getChannelData: <T = any>(channel: string) => T | null;
  /** 获取频道时间戳 */
  getChannelTimestamp: (channel: string) => number | null;
}

/**
 * Store 类型
 */
export type WSStore = WSStoreState & WSStoreActions;

/**
 * StoreManager 配置选项
 */
export interface StoreManagerOptions {
  /** 是否启用 RAF 批量更新，默认 true */
  useRAF?: boolean;
  /** 批量更新最大延迟（毫秒），默认 16ms */
  batchDelay?: number;
}
