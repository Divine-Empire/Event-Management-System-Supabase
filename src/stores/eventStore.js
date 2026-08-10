import { create } from 'zustand';
import { eventStorage } from '@/services/eventStorage';

export const useEventStore = create((set, get) => ({
  event: eventStorage.getEvent(),
  
  updateEvent: (fields) => {
    const updated = { ...get().event, ...fields };
    eventStorage.saveEvent(updated);
    set({ event: updated });
  },

  updateSettings: (newSettings) => {
    const current = get().event;
    const updated = {
      ...current,
      settings: { ...current.settings, ...newSettings }
    };
    eventStorage.saveEvent(updated);
    set({ event: updated });
  },

  resetEvent: () => {
    const { event } = eventStorage.resetEventData();
    set({ event });
  }
}));
