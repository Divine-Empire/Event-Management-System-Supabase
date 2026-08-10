import { create } from 'zustand';

export const LIVE_PHASES = {
  WAITING: 'WAITING',
  BUILDUP: 'BUILDUP',
  COUNTDOWN: 'COUNTDOWN',
  DRAWING: 'DRAWING',
  REVEALED: 'REVEALED',
  COMPLETED: 'COMPLETED'
};

export const useLiveStore = create((set, get) => ({
  session: null,
  activeService: 'NABL', // 'NABL' | 'TOTAL_STATION'
  currentRank: 1,
  winners: [],
  participants: [],
  prizes: [],
  connectionStatus: 'connected', // 'connected' | 'reconnecting' | 'error'

  setSession: (session) => set({ session }),
  setActiveService: (serviceType) => set({ activeService: serviceType }),
  setCurrentRank: (rank) => set({ currentRank: rank }),
  setWinners: (winners) => set({ winners }),
  setParticipants: (participants) => set({ participants }),
  setPrizes: (prizes) => set({ prizes }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  updateSessionPhase: (phase, extraData = {}) => set((state) => ({
    session: {
      ...(state.session || {}),
      phase,
      ...extraData,
      updated_at: new Date().toISOString()
    }
  }))
}));
