import { participantService } from '@/services/participantService';

export const participantStorage = {
  getParticipants: async (eventId) => {
    return await participantService.getParticipants(eventId);
  },

  saveParticipants: async (eventId, list) => {
    return list;
  },

  toggleParticipation: async (eventId, participantId) => {
    return await participantService.toggleParticipation(eventId, participantId);
  },

  verifyParticipant: async (eventId, data) => {
    return await participantService.verifyParticipant(eventId, data);
  },

  verifyByMobile: async (eventId, mobile) => {
    return await participantService.verifyByMobile(eventId, mobile);
  },

  assignLuckyNumber: async (eventId, participantId, luckyNumber) => {
    return await participantService.assignLuckyNumber(eventId, participantId, luckyNumber);
  },

  markJoined: async (eventId, participantId) => {
    return await participantService.markJoined(eventId, participantId);
  },

  importParticipants: async (eventId, rawList, replaceMode = false) => {
    return await participantService.importParticipants(eventId, rawList, replaceMode);
  },

  deleteParticipant: async (eventId, participantId, serviceType) => {
    return await participantService.deleteParticipant(eventId, participantId, serviceType);
  },

  updateParticipant: async (eventId, participantId, data) => {
    return await participantService.updateParticipant(eventId, participantId, data);
  },

  resetParticipants: async (eventId) => {
    return await participantService.resetWinners(eventId);
  }
};
