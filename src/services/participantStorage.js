import { participantService } from '@/services/participantService';

export const participantStorage = {
  getParticipants: async (eventId, serviceType = null) => {
    return await participantService.getParticipants(eventId, serviceType);
  },

  saveParticipants: async (eventId, list, serviceType = null) => {
    return list;
  },

  toggleParticipation: async (eventId, participantId, serviceType = null) => {
    return await participantService.toggleParticipation(eventId, participantId, serviceType);
  },

  verifyParticipant: async (eventId, data) => {
    return await participantService.verifyParticipant(eventId, data);
  },

  verifyByMobile: async (eventId, mobile, serviceType = null) => {
    return await participantService.verifyByMobile(eventId, mobile, serviceType);
  },

  assignLuckyNumber: async (eventId, participantId, luckyNumber, serviceType = null) => {
    return await participantService.assignLuckyNumber(eventId, participantId, luckyNumber, serviceType);
  },

  markJoined: async (eventId, participantId, serviceType = null) => {
    return await participantService.markJoined(eventId, participantId, serviceType);
  },

  importParticipants: async (eventId, rawList, replaceMode = false, serviceType = null) => {
    return await participantService.importParticipants(eventId, rawList, replaceMode, serviceType);
  },

  deleteParticipant: async (eventId, participantId, serviceType = null) => {
    return await participantService.deleteParticipant(eventId, participantId, serviceType);
  },

  bulkUpdateParticipation: async (eventId, participantIds, targetStatus) => {
    return await participantService.bulkUpdateParticipation(eventId, participantIds, targetStatus);
  },

  bulkDeleteParticipants: async (eventId, participantIds) => {
    return await participantService.bulkDeleteParticipants(eventId, participantIds);
  },

  updateParticipant: async (eventId, participantId, data, serviceType = null) => {
    return await participantService.updateParticipant(eventId, participantId, data, serviceType);
  },

  resetParticipants: async (eventId, serviceType = null) => {
    return await participantService.resetWinners(eventId, serviceType);
  }
};
