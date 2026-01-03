# @rectmoon/websocket-client

一个分层设计的 WebSocket 客户端库，支持 React 和 Vue，提供完整的类型安全和性能优化。

## ✨ 核心特性

### ✅ 自动引用计数 - 多组件订阅同一频道只发一次请求
智能管理订阅引用计数，多个组件订阅同一频道时，只向服务器发送一次订阅请求，减少网络开销。

### ✅ 断线自动重连 - 指数退避策略
连接断开后自动重连，采用指数退避策略（可配置延迟增长因子），避免频繁重连造成服务器压力。

### ✅ 重连后自动重订阅 - 无缝恢复
重连成功后自动重新订阅所有之前订阅的频道，无需手动处理，实现无缝恢复。

### ✅ 性能优化 - RAF + Throttle
- **RAF 批量更新**：使用 `requestAnimationFrame` 批量处理高频更新，减少渲染次数
- **Throttle 节流**：支持配置节流时间，控制更新频率，适用于高频数据场景

### ✅ 类型安全 - 完整 TypeScript 支持
完整的 TypeScript 类型定义，提供智能提示和编译时类型检查，确保代码安全。

### ✅ 框架无关 - 核心层可用于任何框架
核心层（Core Layer）完全独立，不依赖任何框架，可以在任何 JavaScript/TypeScript 项目中使用。

### ✅ 灵活的消息处理
- **自定义消息解析器**：支持自定义消息解析逻辑，适配各种消息格式（JSON、纯文本、二进制）
- **非 JSON 消息支持**：可配置严格模式，支持处理纯文本和二进制消息
- **特殊消息过滤**：自动过滤以 `__` 开头的内部消息 channel

### ✅ 自定义心跳机制
- **自定义心跳格式**：支持字符串、对象或函数形式的心跳消息
- **自定义 pong 检测**：可自定义 pong 响应检测逻辑
- **灵活配置**：支持禁用心跳和 pong 超时检查，适配不同服务器协议（如 echo.websocket.org、OKX 等）

## 📁 目录结构

```
websocket-client/
├── src/
│   ├── core/                      # 核心层（框架无关）
│   │   ├── __tests__/            # 单元测试
│   │   ├── types.ts               # 类型定义
│   │   ├── WSManager.ts           # 连接管理
│   │   ├── MessageRouter.ts       # 消息路由
│   │   ├── SubscriptionManager.ts  # 订阅管理（引用计数）
│   │   ├── WebSocketClient.ts     # 统一客户端
│   │   └── index.ts               # 核心层导出
│   │
│   ├── adapters/                  # 适配层
│   │   ├── react-adapter.tsx      # React Hooks
│   │   └── vue-adapter.ts         # Vue Composables
│   │
│   ├── store/                     # 状态管理层
│   │   ├── __tests__/            # 单元测试
│   │   ├── types.ts               # 类型定义
│   │   ├── store.ts               # Zustand Store
│   │   ├── StoreManager.ts        # Store 管理器（RAF 批量更新）
│   │   ├── react-hooks.ts         # React Hooks
│   │   ├── vue-composables.ts     # Vue Composables
│   │   └── index.ts               # Store 层导出
│   │
│   └── index.ts                   # 主入口
│
├── dist/                          # 打包输出目录
│   ├── core/
│   │   ├── index.esm.js
│   │   ├── index.cjs.js
│   │   ├── index.umd.js
│   │   └── index.d.ts
│   ├── adapters/
│   │   ├── react-adapter.esm.js
│   │   ├── react-adapter.cjs.js
│   │   ├── react-adapter.umd.js
│   │   ├── react-adapter.d.ts
│   │   ├── vue-adapter.esm.js
│   │   ├── vue-adapter.cjs.js
│   │   ├── vue-adapter.umd.js
│   │   └── vue-adapter.d.ts
│   ├── store/
│   │   ├── store-layer.esm.js
│   │   ├── store-layer.cjs.js
│   │   ├── store-layer.umd.js
│   │   └── store-layer.d.ts
│   ├── index.esm.js               # 主入口 ESM
│   ├── index.cjs.js               # 主入口 CJS
│   ├── index.umd.js               # 主入口 UMD
│   └── index.d.ts                 # 类型声明
│
├── tests/                         # 测试工具
│   └── setup.ts                   # 测试环境设置
│
├── .eslintrc.js                   # ESLint 配置
├── .gitignore                     # Git 忽略文件
├── package.json                   # 项目配置
├── rollup.config.js               # Rollup 配置
├── tsconfig.json                  # TypeScript 配置
├── vitest.config.ts               # Vitest 配置
└── README.md                      # 项目文档
```

## 🚀 快速开始

### 安装

```bash
npm install @rectmoon/websocket-client
```

### 基础使用

#### 核心层（框架无关）

```typescript
import { WebSocketClient } from '@rectmoon/websocket-client/core';

const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
  heartbeatInterval: 30000,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectDecayFactor: 1.5, // 指数退避因子
});

client.connect();

// 订阅频道
const unsubscribe = client.subscribe('market.btc', (data) => {
  console.log('BTC 价格:', data);
});

// 取消订阅
unsubscribe();

// 发送消息
client.send({ type: 'message', content: 'Hello' });
client.send('Hello World'); // 字符串
client.send(buffer); // ArrayBuffer

// 监听连接状态
client.onConnectionStateChange((connected) => {
  console.log('连接状态:', connected ? '已连接' : '已断开');
});
```

#### React 使用

```typescript
import { WebSocketClient } from '@rectmoon/websocket-client/core';
import { WSProvider, useChannel } from '@rectmoon/websocket-client/react';

const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
});

function App() {
  return (
    <WSProvider client={client}>
      <MarketComponent />
    </WSProvider>
  );
}

function MarketComponent() {
  // 使用节流，每 100ms 最多更新一次
  const { data, loading, connected } = useChannel('market.btc', {
    throttle: 100,
  });

  if (loading) return <div>加载中...</div>;
  if (!connected) return <div>连接断开</div>;

  return <div>BTC 价格: {data?.price}</div>;
}
```

#### Vue 使用

```typescript
import { WebSocketClient } from '@rectmoon/websocket-client/core';
import { createWSClient, useChannel } from '@rectmoon/websocket-client/vue';

const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
});

// 在根组件中设置
createWSClient(client);
```

```vue
<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="!connected">连接断开</div>
  <div v-else>BTC 价格: {{ data?.price }}</div>
</template>

<script setup lang="ts">
import { useChannel } from '@rectmoon/websocket-client/vue';

// 使用节流，每 100ms 最多更新一次
const { data, loading, connected } = useChannel('market.btc', {
  throttle: 100,
});
</script>
```

#### Store 层（Zustand 集成）

```typescript
import { WebSocketClient } from '@rectmoon/websocket-client/core';
import { createStoreManager, useWSStoreChannel } from '@rectmoon/websocket-client/store';

const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
});

// 创建 Store Manager（默认使用 RAF 批量更新）
const storeManager = createStoreManager(client, {
  useRAF: true, // 使用 requestAnimationFrame
  batchDelay: 16, // 批量更新延迟（毫秒）
});

// React 中使用
function MarketComponent() {
  const { data, connected } = useWSStoreChannel(storeManager, 'market.btc');
  return <div>{data?.price}</div>;
}
```

## 📊 测试覆盖

### 单元测试覆盖情况

| 功能特性 | 测试文件 | 测试用例 | 状态 |
|---------|---------|---------|------|
| **自动引用计数** | `SubscriptionManager.test.ts` | ✅ 多订阅者测试<br>✅ 引用计数取消订阅测试<br>✅ 最后一个订阅者取消时发送取消订阅 | ✅ 已覆盖 |
| **断线自动重连** | `WSManager.test.ts` | ✅ 自动重连测试<br>✅ 指数退避策略测试<br>✅ 主动断开不重连 | ✅ 已覆盖 |
| **重连后自动重订阅** | `SubscriptionManager.test.ts` | ✅ 重连后重订阅所有频道测试 | ✅ 已覆盖 |
| **RAF 批量更新** | `StoreManager.test.ts` | ✅ RAF 批量更新测试<br>✅ 定时器批量更新测试 | ✅ 已覆盖 |
| **Throttle 节流** | - | ⚠️ 功能已实现，但适配层测试需要额外依赖 | ⚠️ 功能已实现 |
| **类型安全** | - | ✅ TypeScript 编译检查<br>✅ 所有文件通过类型检查 | ✅ 已覆盖 |
| **框架无关** | `WebSocketClient.test.ts` | ✅ 核心层独立测试<br>✅ 不依赖任何框架 | ✅ 已覆盖 |

**测试统计**：6 个测试文件，78+ 个测试用例，全部通过 ✅

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# UI 模式
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 运行测试
npm test
```

## 📦 导出说明

- `@rectmoon/websocket-client` - 主入口（包含所有功能）
- `@rectmoon/websocket-client/core` - 核心层（框架无关）
- `@rectmoon/websocket-client/react` - React 适配层
- `@rectmoon/websocket-client/vue` - Vue 适配层
- `@rectmoon/websocket-client/store` - Store 层（Zustand 集成）

## 📚 示例

项目提供了多个示例文件，位于 `examples/` 目录：

- **chat.html** - WebSocket 聊天室示例（对接 echo.websocket.org）
  - 演示如何处理非 JSON 消息
  - 展示如何禁用心跳和 pong 超时检查
  - 自定义消息解析器示例

- **okx-market.html** - OKX 公共行情 WebSocket 示例
  - 演示如何对接第三方 WebSocket API（OKX）
  - 自定义消息解析器处理 OKX 消息格式
  - 实时行情数据显示

- **logs.html** - WebSocket 连接日志示例
  - 展示连接状态监控
  - 消息日志记录功能

## 📝 配置选项

### WSConfig

```typescript
interface WSConfig {
  url: string;                      // WebSocket 服务器 URL
  heartbeatInterval?: number | false; // 心跳间隔（毫秒），默认 30000，设置为 false 或 0 可禁用心跳
  pongTimeout?: number | false;     // Pong 响应超时（毫秒），默认 10000，设置为 false 或 0 可禁用超时检查
  reconnectDelay?: number;           // 初始重连延迟（毫秒），默认 1000
  maxReconnectDelay?: number;       // 最大重连延迟（毫秒），默认 30000
  reconnectDecayFactor?: number;    // 重连延迟增长因子，默认 1.5（指数退避）
  
  // 消息处理
  messageParser?: (data: string | ArrayBuffer | Blob) => WSMessage | Promise<WSMessage>; // 自定义消息解析器
  strictJsonMode?: boolean;         // 严格 JSON 模式，默认 true（非 JSON 消息会抛出错误）
  
  // 自定义心跳
  heartbeatMessage?: string | object | (() => string | object); // 自定义心跳消息格式
  isPongMessage?: (message: WSMessage) => boolean; // 自定义 pong 检测函数
  useNativePing?: boolean;          // 是否使用 WebSocket 原生 ping（如果浏览器支持），默认 false
}
```

### 高级配置示例

#### 自定义心跳格式

```typescript
const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
  heartbeatInterval: 30000,
  heartbeatMessage: 'PING', // 字符串格式
  // 或
  heartbeatMessage: { type: 'heartbeat' }, // 对象格式
  // 或
  heartbeatMessage: () => `ping-${Date.now()}`, // 函数格式
  isPongMessage: (message) => message.data === 'PONG' // 自定义 pong 检测
});
```

#### 禁用心跳（适用于不支持 ping/pong 的服务器）

```typescript
const client = new WebSocketClient({
  url: 'wss://echo.websocket.org',
  heartbeatInterval: false, // 禁用心跳
  pongTimeout: false, // 禁用 pong 超时检查
  strictJsonMode: false // 允许非 JSON 消息
});
```

#### 自定义消息解析器

```typescript
const client = new WebSocketClient({
  url: 'wss://api.example.com/ws',
  messageParser: (data) => {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        // 自定义解析逻辑
        if (parsed.type === 'custom') {
          return { channel: 'custom', data: parsed };
        }
        return { channel: 'message', data: parsed };
      } catch {
        return { channel: 'message', data: data };
      }
    }
    return { channel: 'binary', data: data };
  }
});
```

#### 发送消息

```typescript
// 发送字符串
client.send('Hello World');

// 发送对象（会自动 JSON.stringify）
client.send({ type: 'message', content: 'Hello' });

// 发送 ArrayBuffer
const buffer = new ArrayBuffer(8);
client.send(buffer);
```

## 📄 许可证

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request！
