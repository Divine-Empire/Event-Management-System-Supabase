import { participantService } from '@/services/participantService';

export const winnerStorage = {
  getWinners: async (eventId, serviceType = null) => {
    return await participantService.getWinners(eventId, serviceType);
  },

  saveWinners: async (eventId, winners, serviceType = null) => {
    return await participantService.saveWinners(eventId, winners, serviceType);
  },

  publishWinners: async (eventId, unPublishedWinners = null, serviceType = null) => {
    return await participantService.publishWinners(eventId, unPublishedWinners, serviceType);
  },

  resetWinners: async (eventId, serviceType = null) => {
    return await participantService.resetWinners(eventId, serviceType);
  }
};
