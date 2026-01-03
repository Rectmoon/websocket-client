// ============================================
// Store 层统一导出
// ============================================

// 类型定义
export type {
  WSStoreState,
  WSStoreActions,
  WSStore,
  StoreManagerOptions,
} from "./types";

// StoreManager
export { StoreManager } from "./StoreManager";
export type { StoreManager as StoreManagerType } from "./StoreManager";

// 工厂函数（从 StoreManager 导出）
export { createStoreManager } from "./StoreManager";

// React Hooks
export {
  useWSStoreChannel,
  useWSStoreChannels,
  useWSStoreConnection,
} from "./react-hooks";

// Vue Composables
export {
  useWSStoreChannelVue,
  useWSStoreChannelsVue,
  useWSStoreConnectionVue,
} from "./vue-composables";

// Store 创建函数（高级用法）
export { createWSStore } from "./store";
