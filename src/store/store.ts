// ============================================
// Zustand Store 创建
// ============================================

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { WSStore } from "./types";

/**
 * 创建 WebSocket Store
 */
export function createWSStore() {
  return create<WSStore>()(
    subscribeWithSelector((set, get) => ({
      // 初始状态
      data: {},
      timestamps: {},
      connected: false,
      channels: new Set<string>(),

      // Actions
      updateChannel: (channel: string, data: any) => {
        set((state) => ({
          data: {
            ...state.data,
            [channel]: data,
          },
          timestamps: {
            ...state.timestamps,
            [channel]: Date.now(),
          },
        }));
      },

      batchUpdateChannels: (updates: Record<string, any>) => {
        const now = Date.now();
        set((state) => {
          const newData = { ...state.data };
          const newTimestamps = { ...state.timestamps };

          Object.entries(updates).forEach(([channel, data]) => {
            newData[channel] = data;
            newTimestamps[channel] = now;
          });

          return {
            data: newData,
            timestamps: newTimestamps,
          };
        });
      },

      setConnected: (connected: boolean) => {
        set({ connected });
      },

      addChannel: (channel: string) => {
        set((state) => {
          const newChannels = new Set(state.channels);
          newChannels.add(channel);
          return { channels: newChannels };
        });
      },

      removeChannel: (channel: string) => {
        set((state) => {
          const newChannels = new Set(state.channels);
          newChannels.delete(channel);
          return { channels: newChannels };
        });
      },

      clearChannel: (channel: string) => {
        set((state) => {
          const newData = { ...state.data };
          const newTimestamps = { ...state.timestamps };
          delete newData[channel];
          delete newTimestamps[channel];
          return {
            data: newData,
            timestamps: newTimestamps,
          };
        });
      },

      clearAll: () => {
        set({
          data: {},
          timestamps: {},
          channels: new Set<string>(),
        });
      },

      getChannelData: <T = any>(channel: string): T | null => {
        return (get().data[channel] as T) ?? null;
      },

      getChannelTimestamp: (channel: string): number | null => {
        return get().timestamps[channel] ?? null;
      },
    }))
  );
}
