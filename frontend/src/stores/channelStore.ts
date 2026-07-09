/**
 * @fileoverview Channel state management using Zustand.
 * Manages the list of channels and the currently selected channel.
 */

import { create } from 'zustand';
import type { Channel } from '../types';

/**
 * Channel store state and actions.
 */
interface ChannelState {
  /** List of channels the user has joined */
  channels: Channel[];
  /** Currently selected/viewed channel */
  currentChannel: Channel | null;
  /** Whether channels are being loaded */
  isLoading: boolean;

  /**
   * Replaces the entire channel list.
   * @param channels - New channel list
   */
  setChannels: (channels: Channel[]) => void;

  /**
   * Sets the currently active channel.
   * @param channel - Channel to set as current, or null to clear
   */
  setCurrentChannel: (channel: Channel | null) => void;

  /**
   * Adds a new channel to the list.
   * @param channel - Channel to add
   */
  addChannel: (channel: Channel) => void;

  /**
   * Updates an existing channel.
   * @param id - Channel ID to update
   * @param updates - Fields to update
   */
  updateChannel: (id: number, updates: Partial<Channel>) => void;

  /**
   * Removes a channel from the list.
   * @param id - Channel ID to remove
   */
  removeChannel: (id: number) => void;

  /**
   * Sets the loading state.
   * @param loading - Loading state
   */
  setLoading: (loading: boolean) => void;
}

/**
 * Channel store hook.
 *
 * @example
 * ```tsx
 * function ChannelList() {
 *   const { channels, setCurrentChannel } = useChannelStore();
 *
 *   return (
 *     <ul>
 *       {channels.map(channel => (
 *         <li key={channel.id} onClick={() => setCurrentChannel(channel)}>
 *           {channel.name}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export const useChannelStore = create<ChannelState>((set) => ({
  channels: [],
  currentChannel: null,
  isLoading: false,

  setChannels: (channels) => set({ channels }),

  setCurrentChannel: (channel) => set({ currentChannel: channel }),

  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel],
    })),

  updateChannel: (id, updates) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === id ? { ...ch, ...updates } : ch
      ),
      currentChannel:
        state.currentChannel?.id === id
          ? { ...state.currentChannel, ...updates }
          : state.currentChannel,
    })),

  removeChannel: (id) =>
    set((state) => ({
      channels: state.channels.filter((ch) => ch.id !== id),
      currentChannel:
        state.currentChannel?.id === id ? null : state.currentChannel,
    })),

  setLoading: (isLoading) => set({ isLoading }),
}));
