// ============================================
// React 适配层 - Hooks
// ============================================

import { useState, useEffect, useRef } from "react";
import { WebSocketClient } from "../core";

// ============================================
// 1. Context Provider
// ============================================

import { createContext, useContext, ReactNode } from "react";

interface WSContextValue {
  client: WebSocketClient;
  connected: boolean;
}

const WSContext = createContext<WSContextValue | null>(null);

interface WSProviderProps {
  client: WebSocketClient;
  children: ReactNode;
}

export function WSProvider({ client, children }: WSProviderProps) {
  const [connected, setConnected] = useState(client.isConnected());

  useEffect(() => {
    client.connect();

    const unsubscribe = client.onConnectionStateChange((isConnected) => {
      setConnected(isConnected);
    });

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  return (
    <WSContext.Provider value={{ client, connected }}>
      {children}
    </WSContext.Provider>
  );
}

function useWSContext() {
  const context = useContext(WSContext);
  if (!context) {
    throw new Error("useWSContext must be used within WSProvider");
  }
  return context;
}

// ============================================
// 2. useSubscription - 基础订阅 Hook
// ============================================

export function useSubscription<T = any>(
  channel: string,
  callback: (data: T) => void,
  deps: any[] = []
) {
  const { client } = useWSContext();
  const callbackRef = useRef(callback);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = client.subscribe(channel, (data: T) => {
      callbackRef.current(data);
    });

    return unsubscribe;
  }, [client, channel, ...deps]);
}

// ============================================
// 3. useChannel - 带状态的订阅 Hook
// ============================================

interface UseChannelOptions {
  throttle?: number;
  enabled?: boolean;
}

export function useChannel<T = any>(
  channel: string,
  options: UseChannelOptions = {}
) {
  const { client, connected } = useWSContext();
  const { throttle = 0, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);

    const unsubscribe = client.subscribe(channel, (newData: T) => {
      const now = Date.now();

      if (throttle === 0 || now - lastUpdateRef.current >= throttle) {
        setData(newData);
        setLoading(false);
        lastUpdateRef.current = now;
      }
    });

    return unsubscribe;
  }, [client, channel, enabled, throttle]);

  return { data, loading, connected };
}

// ============================================
// 4. useAggregatedData - 聚合多个频道
// ============================================

export function useAggregatedData<T = any>(channels: string[]) {
  const { client, connected } = useWSContext();
  const [dataMap, setDataMap] = useState<Record<string, T>>({});

  useEffect(() => {
    const unsubscribers = channels.map((channel) => {
      return client.subscribe(channel, (data: T) => {
        setDataMap((prev) => ({
          ...prev,
          [channel]: data,
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [client, channels.join(",")]);

  return { dataMap, connected };
}

// ============================================
// 5. useConnectionStatus - 连接状态 Hook
// ============================================

export function useConnectionStatus() {
  const { connected } = useWSContext();
  return connected;
}

// ============================================
// 6. useMarket - 市场数据 Hook
// ============================================

// interface MarketData {
//   symbol: string;
//   price: number;
//   volume: number;
//   change: number;
//   timestamp: number;
// }

// export function useMarket(symbol: string) {
//   const channel = `market.${symbol.toLowerCase()}`;
//   return useChannel<MarketData>(channel, { throttle: 100 });
// }

// ============================================
// 7. useDepth - 深度数据 Hook (带 RAF 优化)
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

// export function useDepth(symbol: string, levels: number = 20) {
//   const { client, connected } = useWSContext();
//   const channel = `depth.${symbol.toLowerCase()}.${levels}`;

//   const [data, setData] = useState<DepthData | null>(null);
//   const pendingDataRef = useRef<DepthData | null>(null);
//   const rafIdRef = useRef<number | null>(null);

//   useEffect(() => {
//     const updateData = () => {
//       if (pendingDataRef.current) {
//         setData(pendingDataRef.current);
//         pendingDataRef.current = null;
//       }
//       rafIdRef.current = null;
//     };

//     const unsubscribe = client.subscribe(channel, (newData: DepthData) => {
//       pendingDataRef.current = newData;

//       if (rafIdRef.current === null) {
//         rafIdRef.current = requestAnimationFrame(updateData);
//       }
//     });

//     return () => {
//       unsubscribe();
//       if (rafIdRef.current !== null) {
//         cancelAnimationFrame(rafIdRef.current);
//       }
//     };
//   }, [client, channel]);

//   return { data, connected };
// }

// ============================================
// 8. 使用示例组件
// ============================================

// export function MarketExample() {
//   const { data, loading, connected } = useMarket("BTCUSDT");

//   if (loading) return <div>Loading...</div>;
//   if (!connected) return <div>Disconnected</div>;
//   if (!data) return <div>No data</div>;

//   return (
//     <div>
//       <h2>{data.symbol}</h2>
//       <p>Price: ${data.price.toFixed(2)}</p>
//       <p>Volume: {data.volume}</p>
//       <p>
//         Change: {data.change > 0 ? "+" : ""}
//         {data.change.toFixed(2)}%
//       </p>
//     </div>
//   );
// }

// export function DepthExample() {
//   const { data, connected } = useDepth("BTCUSDT", 10);

//   if (!connected) return <div>Disconnected</div>;
//   if (!data) return <div>Loading depth data...</div>;

//   return (
//     <div style={{ display: "flex", gap: "20px" }}>
//       <div>
//         <h3>Bids</h3>
//         {data.bids.map((bid, i) => (
//           <div key={i}>
//             {bid.price.toFixed(2)} - {bid.amount.toFixed(4)}
//           </div>
//         ))}
//       </div>
//       <div>
//         <h3>Asks</h3>
//         {data.asks.map((ask, i) => (
//           <div key={i}>
//             {ask.price.toFixed(2)} - {ask.amount.toFixed(4)}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// ============================================
// 9. App 集成示例
// ============================================

/*
import { WebSocketClient } from './ws-core';
import { WSProvider, MarketExample, DepthExample } from './react-adapter';

const wsClient = new WebSocketClient({
  url: 'wss://api.example.com/ws',
});

function App() {
  return (
    <WSProvider client={wsClient}>
      <MarketExample />
      <DepthExample />
    </WSProvider>
  );
}
*/
