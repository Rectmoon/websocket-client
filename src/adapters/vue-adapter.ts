// ============================================
// Vue 适配层 - Composables (Vue 3)
// ============================================

import {
  ref,
  onMounted,
  onUnmounted,
  provide,
  inject,
  watch,
  readonly,
  shallowRef,
  type Ref,
  type InjectionKey,
} from "vue";
import { WebSocketClient } from "../core";

// ============================================
// 1. Injection Key
// ============================================

interface WSContextValue {
  client: WebSocketClient;
  connected: Readonly<Ref<boolean>>;
}

const WSClientKey: InjectionKey<WSContextValue> = Symbol("ws-client");

// ============================================
// 2. createWSClient - 创建并提供客户端
// ============================================

export function createWSClient(client: WebSocketClient) {
  const connected = ref(client.isConnected());

  onMounted(() => {
    client.connect();

    const unsubscribe = client.onConnectionStateChange((isConnected) => {
      connected.value = isConnected;
    });

    onUnmounted(() => {
      unsubscribe();
      client.disconnect();
    });
  });

  provide(WSClientKey, {
    client,
    connected: readonly(connected),
  });

  return {
    client,
    connected: readonly(connected),
  };
}

// ============================================
// 3. useWSClient - 获取客户端上下文
// ============================================

function useWSClient() {
  const context = inject(WSClientKey);
  if (!context) {
    throw new Error(
      "useWSClient must be used within a component that called createWSClient"
    );
  }
  return context;
}

// ============================================
// 4. useSubscription - 基础订阅 Composable
// ============================================

export function useSubscription<T = any>(
  channel: Ref<string> | string,
  callback: (data: T) => void
) {
  const { client } = useWSClient();
  const channelRef = ref(channel);

  let unsubscribe: (() => void) | null = null;

  const subscribe = () => {
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = client.subscribe(channelRef.value, callback);
  };

  onMounted(() => {
    subscribe();
  });

  watch(channelRef, () => {
    subscribe();
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
}

// ============================================
// 5. useChannel - 带状态的订阅 Composable
// ============================================

interface UseChannelOptions {
  throttle?: number;
  enabled?: Ref<boolean> | boolean;
}

export function useChannel<T = any>(
  channel: Ref<string> | string,
  options: UseChannelOptions = {}
) {
  const { client, connected } = useWSClient();
  const { throttle = 0 } = options;
  const enabled = ref(options.enabled ?? true);

  const channelRef = ref(channel);
  const data = shallowRef<T | null>(null);
  const loading = ref(true);
  let lastUpdate = 0;
  let unsubscribe: (() => void) | null = null;

  const subscribe = () => {
    if (!enabled.value) return;

    if (unsubscribe) {
      unsubscribe();
    }

    loading.value = true;

    unsubscribe = client.subscribe(channelRef.value, (newData: T) => {
      const now = Date.now();

      if (throttle === 0 || now - lastUpdate >= throttle) {
        data.value = newData;
        loading.value = false;
        lastUpdate = now;
      }
    });
  };

  onMounted(() => {
    subscribe();
  });

  watch([channelRef, enabled], () => {
    if (enabled.value) {
      subscribe();
    } else if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return {
    data: readonly(data),
    loading: readonly(loading),
    connected,
  };
}

// ============================================
// 6. useAggregatedData - 聚合多个频道
// ============================================

export function useAggregatedData<T = any>(channels: Ref<string[]> | string[]) {
  const { client, connected } = useWSClient();
  const channelsRef = ref(channels);
  const dataMap = ref<Record<string, T>>({});
  const unsubscribers: (() => void)[] = [];

  const subscribeAll = () => {
    // 清理旧订阅
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers.length = 0;

    // 创建新订阅
    channelsRef.value.forEach((channel) => {
      const unsubscribe = client.subscribe(channel, (data: T) => {
        dataMap.value = {
          ...dataMap.value,
          [channel]: data,
        };
      });
      unsubscribers.push(unsubscribe);
    });
  };

  onMounted(() => {
    subscribeAll();
  });

  watch(
    channelsRef,
    () => {
      subscribeAll();
    },
    { deep: true }
  );

  onUnmounted(() => {
    unsubscribers.forEach((unsub) => unsub());
  });

  return { dataMap: readonly(dataMap), connected };
}

// ============================================
// 7. useConnectionStatus - 连接状态 Composable
// ============================================

export function useConnectionStatus() {
  const { connected } = useWSClient();
  return connected;
}

// ============================================
// 8. useMarket - 市场数据 Composable
// ============================================

// interface MarketData {
//   symbol: string;
//   price: number;
//   volume: number;
//   change: number;
//   timestamp: number;
// }

// export function useMarket(symbol: Ref<string> | string) {
//   const symbolRef = ref(symbol);
//   const channel = ref(`market.${symbolRef.value.toLowerCase()}`);

//   watch(symbolRef, (newSymbol) => {
//     channel.value = `market.${newSymbol.toLowerCase()}`;
//   });

//   return useChannel<MarketData>(channel, { throttle: 100 });
// }

// ============================================
// 9. useDepth - 深度数据 Composable (带 RAF 优化)
// ============================================

// interface DepthLevel {
//   price: number;
//   amount: number;
// }

// interface DepthData {
//   bids: DepthLevel[];
//   asks: DepthLevel[];
//   timestamp: number;
// }

// export function useDepth(symbol: Ref<string> | string, levels: number = 20) {
//   const { client, connected } = useWSClient();
//   const symbolRef = ref(symbol);
//   const channel = ref(`depth.${symbolRef.value.toLowerCase()}.${levels}`);

//   const data = shallowRef<DepthData | null>(null);
//   let pendingData: DepthData | null = null;
//   let rafId: number | null = null;
//   let unsubscribe: (() => void) | null = null;

//   watch(symbolRef, (newSymbol) => {
//     channel.value = `depth.${newSymbol.toLowerCase()}.${levels}`;
//   });

//   const updateData = () => {
//     if (pendingData) {
//       data.value = pendingData;
//       pendingData = null;
//     }
//     rafId = null;
//   };

//   const subscribe = () => {
//     if (unsubscribe) {
//       unsubscribe();
//     }

//     unsubscribe = client.subscribe(channel.value, (newData: DepthData) => {
//       pendingData = newData;

//       if (rafId === null) {
//         rafId = requestAnimationFrame(updateData);
//       }
//     });
//   };

//   onMounted(() => {
//     subscribe();
//   });

//   watch(channel, () => {
//     subscribe();
//   });

//   onUnmounted(() => {
//     if (unsubscribe) {
//       unsubscribe();
//     }
//     if (rafId !== null) {
//       cancelAnimationFrame(rafId);
//     }
//   });

//   return { data: readonly(data), connected };
// }

// ============================================
// 10. Vue 组件使用示例
// ============================================

/*
<template>
  <!-- 在根组件中设置 -->
  <div id="app">
    <MarketExample />
    <DepthExample />
  </div>
</template>

<script setup lang="ts">
import { WebSocketClient } from './ws-core';
import { createWSClient } from './vue-adapter';

const wsClient = new WebSocketClient({
  url: 'wss://api.example.com/ws',
});

createWSClient(wsClient);
</script>
*/

/*
<!-- MarketExample.vue -->
<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="!connected">Disconnected</div>
  <div v-else-if="data">
    <h2>{{ data.symbol }}</h2>
    <p>Price: ${{ data.price.toFixed(2) }}</p>
    <p>Volume: {{ data.volume }}</p>
    <p>Change: {{ data.change > 0 ? '+' : '' }}{{ data.change.toFixed(2) }}%</p>
  </div>
</template>

<script setup lang="ts">
import { useMarket } from './vue-adapter';

const { data, loading, connected } = useMarket('BTCUSDT');
</script>
*/

/*
<!-- DepthExample.vue -->
<template>
  <div v-if="!connected">Disconnected</div>
  <div v-else-if="data" style="display: flex; gap: 20px;">
    <div>
      <h3>Bids</h3>
      <div v-for="(bid, i) in data.bids" :key="i">
        {{ bid.price.toFixed(2) }} - {{ bid.amount.toFixed(4) }}
      </div>
    </div>
    <div>
      <h3>Asks</h3>
      <div v-for="(ask, i) in data.asks" :key="i">
        {{ ask.price.toFixed(2) }} - {{ ask.amount.toFixed(4) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDepth } from './vue-adapter';

const { data, connected } = useDepth('BTCUSDT', 10);
</script>
*/
