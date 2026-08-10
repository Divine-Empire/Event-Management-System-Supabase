import { create } from 'zustand';
import { participantService } from '@/services/participantService';
import { drawNextRankWinner, drawSequentialWinners } from '@/utils/drawAlgorithm';

export const DRAW_STATES = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  RANDOMIZING: 'RANDOMIZING',
  DRAWING: 'DRAWING',
  WINNER_SELECTED: 'WINNER_SELECTED',
  PUBLISHED: 'PUBLISHED'
};

export const useDrawStore = create((set, get) => ({
  winners: [],
  currentDraftWinners: [],
  drawState: DRAW_STATES.IDLE,
  currentDrawingRank: 1,

  setDrawState: (state) => set({ drawState: state }),
  setCurrentDrawingRank: (rank) => set({ currentDrawingRank: rank }),

  // Helper to check if rank is locked (already has published winner)
  isRankLocked: (rank, publishedWinners = []) => {
    return publishedWinners.some(w => (w.rank === rank || w.rank === Number(rank)) && (w.published || w.winner));
  },

  // Single rank draw action (per spinner spin)
  drawNextWinnerForRank: (rank, prizeName, participants = [], eventId, existingPublished = []) => {
    // Immutability Guard: Check if rank already published
    if (get().isRankLocked(rank, existingPublished)) {
      return { success: false, message: `Rank ${rank} winner is already published and locked!` };
    }

    const existingDrafts = get().currentDraftWinners;
    const combinedWinners = [...existingPublished, ...existingDrafts];

    set({ drawState: DRAW_STATES.RANDOMIZING });

    const newWinner = drawNextRankWinner(rank, prizeName, participants, combinedWinners);
    if (!newWinner) {
      set({ drawState: DRAW_STATES.IDLE });
      return { success: false, message: "No eligible joined participants available for this draw!" };
    }

    const updatedDrafts = [...existingDrafts.filter(w => w.rank !== rank), newWinner].sort((a, b) => a.rank - b.rank);
    set({
      currentDraftWinners: updatedDrafts,
      drawState: DRAW_STATES.WINNER_SELECTED,
      currentDrawingRank: rank
    });

    return { success: true, winner: newWinner };
  },

  // Perform draw for all ranks sequentially
  drawAllWinners: (participants = [], prizes = [], eventId, existingPublished = []) => {
    set({ drawState: DRAW_STATES.PREPARING });
    const draftWinners = drawSequentialWinners(participants, prizes, existingPublished);

    if (draftWinners.length === 0) {
      set({ drawState: DRAW_STATES.IDLE });
      return { success: false, message: "No eligible joined participants available to draw." };
    }

    set({
      currentDraftWinners: draftWinners,
      drawState: DRAW_STATES.WINNER_SELECTED
    });

    return { success: true, count: draftWinners.length, winners: draftWinners };
  },

  // Finalize & Publish Winners to Supabase
  publishWinners: async (eventId) => {
    const drafts = get().currentDraftWinners;
    if (drafts.length === 0) return { success: false, message: "No winners drawn to publish." };

    await participantService.saveWinners(eventId, drafts);
    const published = await participantService.publishWinners(eventId, drafts);

    set({ winners: published, currentDraftWinners: [], drawState: DRAW_STATES.PUBLISHED });
    return { success: true, published };
  },

  resetWinners: async (eventId) => {
    await participantService.resetWinners(eventId);
    set({ winners: [], currentDraftWinners: [], drawState: DRAW_STATES.IDLE });
  }
}));
