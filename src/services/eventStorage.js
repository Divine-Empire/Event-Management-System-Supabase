import { eventService } from '@/services/eventService';

export const eventStorage = {
  getAllEvents: async () => {
    return await eventService.getAllEvents();
  },

  saveAllEvents: async (eventsList) => {
    // Legacy stub
    return eventsList;
  },

  getActiveEventId: () => {
    return null;
  },

  setActiveEventId: (id) => {
    return id;
  },

  getEvent: async (eventId) => {
    return await eventService.getEvent(eventId);
  },

  getEventByToken: async (token) => {
    return await eventService.getEventByToken(token);
  },

  saveEvent: async (eventId, eventData) => {
    return await eventService.saveEvent(eventId, eventData);
  },

  getPrizes: async (eventId) => {
    return await eventService.getPrizes(eventId);
  },

  savePrizes: async (eventId, prizes) => {
    return await eventService.savePrizes(eventId, prizes);
  },

  createEvent: async (newEventData) => {
    return await eventService.createEvent(newEventData);
  },

  deleteEvent: async (id) => {
    return await eventService.deleteEvent(id);
  }
};
