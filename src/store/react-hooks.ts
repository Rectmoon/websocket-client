// ============================================
// React Hooks
// ============================================

import type { StoreManager } from "./StoreManager";

/**
 * React Hook: 使用 Store 中的频道数据
 */
export function useWSStoreChannel<T = any>(
  storeManager: StoreManager,
  channel: string
): {
  data: T | null;
  timestamp: number | null;
  connected: boolean;
  loading: boolean;
} {
  // 动态导入 React，避免在非 React 环境中报错
  let useState: typeof import("react").useState;
  let useEffect: typeof import("react").useEffect;
  let useRef: typeof import("react").useRef;

  try {
    const react = require("react");
    useState = react.useState;
    useEffect = react.useEffect;
    useRef = react.useRef;
  } catch {
    throw new Error(
      "useWSStoreChannel requires React. Make sure React is installed."
    );
  }

  const store = storeManager.getStore();
  const [data, setData] = useState<T | null>(() =>
    store.getState().getChannelData<T>(channel)
  );
  const [timestamp, setTimestamp] = useState<number | null>(() =>
    store.getState().getChannelTimestamp(channel)
  );
  const [connected, setConnected] = useState(() => store.getState().connected);
  const [loading, setLoading] = useState(true);
  const subscribedRef = useRef(false);

  useEffect(() => {
    // 订阅频道
    if (!subscribedRef.current) {
      storeManager.subscribe(channel);
      subscribedRef.current = true;
      setLoading(false);
    }

    // 订阅 Store 更新
    const unsubscribe = store.subscribe(
      (state) => state.data[channel],
      (channelData) => {
        setData(channelData as T | null);
      }
    );

    const unsubscribeTimestamp = store.subscribe(
      (state) => state.timestamps[channel],
      (ts) => {
        setTimestamp(ts ?? null);
      }
    );

    const unsubscribeConnected = store.subscribe(
      (state) => state.connected,
      (isConnected) => {
        setConnected(isConnected);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeTimestamp();
      unsubscribeConnected();
    };
  }, [storeManager, channel, store]);

  return { data, timestamp, connected, loading };
}

/**
 * React Hook: 使用多个频道数据
 */
export function useWSStoreChannels<T = any>(
  storeManager: StoreManager,
  channels: string[]
): {
  dataMap: Record<string, T | null>;
  timestamps: Record<string, number | null>;
  connected: boolean;
} {
  let useState: typeof import("react").useState;
  let useEffect: typeof import("react").useEffect;

  try {
    const react = require("react");
    useState = react.useState;
    useEffect = react.useEffect;
  } catch {
    throw new Error(
      "useWSStoreChannels requires React. Make sure React is installed."
    );
  }

  const store = storeManager.getStore();
  const [dataMap, setDataMap] = useState<Record<string, T | null>>(() => {
    const initial: Record<string, T | null> = {};
    channels.forEach((channel) => {
      initial[channel] = store.getState().getChannelData<T>(channel);
    });
    return initial;
  });
  const [timestamps, setTimestamps] = useState<Record<string, number | null>>(
    () => {
      const initial: Record<string, number | null> = {};
      channels.forEach((channel) => {
        initial[channel] = store.getState().getChannelTimestamp(channel);
      });
      return initial;
    }
  );
  const [connected, setConnected] = useState(() => store.getState().connected);

  useEffect(() => {
    // 订阅所有频道
    channels.forEach((channel) => {
      storeManager.subscribe(channel);
    });

    // 订阅 Store 更新
    const unsubscribe = store.subscribe(
      (state) => {
        const result: Record<string, T | null> = {};
        channels.forEach((channel) => {
          result[channel] = state.data[channel] as T | null;
        });
        return result;
      },
      (newDataMap) => {
        setDataMap(newDataMap);
      }
    );

    const unsubscribeTimestamps = store.subscribe(
      (state) => {
        const result: Record<string, number | null> = {};
        channels.forEach((channel) => {
          result[channel] = state.timestamps[channel] ?? null;
        });
        return result;
      },
      (newTimestamps) => {
        setTimestamps(newTimestamps);
      }
    );

    const unsubscribeConnected = store.subscribe(
      (state) => state.connected,
      (isConnected) => {
        setConnected(isConnected);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeTimestamps();
      unsubscribeConnected();
    };
  }, [storeManager, channels.join(","), store]);

  return { dataMap, timestamps, connected };
}

/**
 * React Hook: 使用连接状态
 */
export function useWSStoreConnection(storeManager: StoreManager): boolean {
  let useState: typeof import("react").useState;
  let useEffect: typeof import("react").useEffect;

  try {
    const react = require("react");
    useState = react.useState;
    useEffect = react.useEffect;
  } catch {
    throw new Error(
      "useWSStoreConnection requires React. Make sure React is installed."
    );
  }

  const store = storeManager.getStore();
  const [connected, setConnected] = useState(() => store.getState().connected);

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (state) => state.connected,
      (isConnected) => {
        setConnected(isConnected);
      }
    );

    return unsubscribe;
  }, [storeManager, store]);

  return connected;
}
