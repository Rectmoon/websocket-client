// ============================================
// Vue Composables
// ============================================

import type { StoreManager } from "./StoreManager";

/**
 * Vue Composable: 使用 Store 中的频道数据
 */
export function useWSStoreChannelVue<T = any>(
  storeManager: StoreManager,
  channel: string
): {
  data: import("vue").Ref<T | null>;
  timestamp: import("vue").Ref<number | null>;
  connected: Readonly<import("vue").Ref<boolean>>;
  loading: import("vue").Ref<boolean>;
} {
  let ref: typeof import("vue").ref;
  let computed: typeof import("vue").computed;
  let onMounted: typeof import("vue").onMounted;
  let onUnmounted: typeof import("vue").onUnmounted;

  try {
    const vue = require("vue");
    ref = vue.ref;
    computed = vue.computed;
    onMounted = vue.onMounted;
    onUnmounted = vue.onUnmounted;
  } catch {
    throw new Error(
      "useWSStoreChannelVue requires Vue. Make sure Vue is installed."
    );
  }

  const store = storeManager.getStore();
  const data = ref(
    store.getState().getChannelData<T>(channel)
  ) as import("vue").Ref<T | null>;
  const timestamp = ref<number | null>(
    store.getState().getChannelTimestamp(channel)
  );
  const connected = computed(() => store.getState().connected);
  const loading = ref(true);

  onMounted(() => {
    // 订阅频道
    storeManager.subscribe(channel);
    loading.value = false;

    // 订阅 Store 更新
    const unsubscribe = store.subscribe(
      (state) => state.data[channel],
      (channelData) => {
        data.value = channelData as T | null;
      }
    );

    const unsubscribeTimestamp = store.subscribe(
      (state) => state.timestamps[channel],
      (ts) => {
        timestamp.value = ts ?? null;
      }
    );

    onUnmounted(() => {
      unsubscribe();
      unsubscribeTimestamp();
    });
  });

  return { data, timestamp, connected, loading };
}

/**
 * Vue Composable: 使用多个频道数据
 */
export function useWSStoreChannelsVue<T = any>(
  storeManager: StoreManager,
  channels: import("vue").Ref<string[]> | string[]
): {
  dataMap: import("vue").Ref<Record<string, T | null>>;
  timestamps: import("vue").Ref<Record<string, number | null>>;
  connected: Readonly<import("vue").Ref<boolean>>;
} {
  let ref: typeof import("vue").ref;
  let computed: typeof import("vue").computed;
  let watch: typeof import("vue").watch;
  let onMounted: typeof import("vue").onMounted;
  let onUnmounted: typeof import("vue").onUnmounted;

  try {
    const vue = require("vue");
    ref = vue.ref;
    computed = vue.computed;
    watch = vue.watch;
    onMounted = vue.onMounted;
    onUnmounted = vue.onUnmounted;
  } catch {
    throw new Error(
      "useWSStoreChannelsVue requires Vue. Make sure Vue is installed."
    );
  }

  const store = storeManager.getStore();
  // 如果 channels 已经是 Ref，直接使用；否则创建 Ref
  const channelsRef = Array.isArray(channels)
    ? ref(channels)
    : (channels as import("vue").Ref<string[]>);
  const dataMap = ref<Record<string, T | null>>({});
  const timestamps = ref<Record<string, number | null>>({});
  const connected = computed(() => store.getState().connected);

  // 初始化数据
  const initData = () => {
    const data: Record<string, T | null> = {};
    const ts: Record<string, number | null> = {};
    channelsRef.value.forEach((channel) => {
      data[channel] = store.getState().getChannelData<T>(channel);
      ts[channel] = store.getState().getChannelTimestamp(channel);
    });
    dataMap.value = data;
    timestamps.value = ts;
  };

  onMounted(() => {
    initData();

    // 订阅所有频道
    channelsRef.value.forEach((channel) => {
      storeManager.subscribe(channel);
    });

    // 订阅 Store 更新
    const unsubscribe = store.subscribe(
      (state) => {
        const result: Record<string, T | null> = {};
        channelsRef.value.forEach((channel) => {
          result[channel] = state.data[channel] as T | null;
        });
        return result;
      },
      (newDataMap) => {
        dataMap.value = newDataMap;
      }
    );

    const unsubscribeTimestamps = store.subscribe(
      (state) => {
        const result: Record<string, number | null> = {};
        channelsRef.value.forEach((channel) => {
          result[channel] = state.timestamps[channel] ?? null;
        });
        return result;
      },
      (newTimestamps) => {
        timestamps.value = newTimestamps;
      }
    );

    // 监听频道变化
    watch(
      channelsRef,
      (newChannels) => {
        // 取消旧订阅
        channelsRef.value.forEach((channel) => {
          if (!newChannels.includes(channel)) {
            storeManager.unsubscribe(channel);
          }
        });

        // 添加新订阅
        newChannels.forEach((channel) => {
          if (!channelsRef.value.includes(channel)) {
            storeManager.subscribe(channel);
          }
        });

        initData();
      },
      { deep: true }
    );

    onUnmounted(() => {
      unsubscribe();
      unsubscribeTimestamps();
    });
  });

  return { dataMap, timestamps, connected };
}

/**
 * Vue Composable: 使用连接状态
 */
export function useWSStoreConnectionVue(
  storeManager: StoreManager
): Readonly<import("vue").Ref<boolean>> {
  let computed: typeof import("vue").computed;

  try {
    const vue = require("vue");
    computed = vue.computed;
  } catch {
    throw new Error(
      "useWSStoreConnectionVue requires Vue. Make sure Vue is installed."
    );
  }

  const store = storeManager.getStore();
  return computed(() => store.getState().connected);
}
