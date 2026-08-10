import { supabase } from '@/lib/supabase';
import { participantService } from '@/services/participantService';
import { eventStorage } from '@/services/eventStorage';

export const liveSessionService = {
  // Get active session or initialize if missing
  getLiveSession: async (eventId, serviceType = 'NABL') => {
    if (!eventId) return null;
    const sType = String(serviceType).toUpperCase().includes('TOTAL') ? 'TOTAL_STATION' : 'NABL';

    try {
      // 1. Try to fetch existing live session from DB table event_live_sessions
      const { data, error } = await supabase
        .from('event_live_sessions')
        .select('*')
        .eq('event_id', eventId)
        .eq('service_type', sType)
        .maybeSingle();

      if (data) return data;

      if (error && error.code !== 'PGRST116') {
        console.warn('event_live_sessions query fallback:', error.message);
      }
      return null;
    } catch (err) {
      console.error('getLiveSession exception:', err);
      return null;
    }
  },

  // Save or update live session state in DB (triggers Supabase Realtime postgres_changes)
  upsertLiveSession: async (eventId, serviceType, sessionPayload) => {
    if (!eventId) return null;
    const sType = String(serviceType).toUpperCase().includes('TOTAL') ? 'TOTAL_STATION' : 'NABL';

    const payload = {
      event_id: eventId,
      service_type: sType,
      phase: sessionPayload.phase || 'WAITING',
      current_rank: sessionPayload.currentRank || sessionPayload.current_rank || 1,
      total_ranks: sessionPayload.totalRanks || sessionPayload.total_ranks || 0,
      phase_started_at: sessionPayload.phaseStartedAt || sessionPayload.phase_started_at || new Date().toISOString(),
      phase_ends_at: sessionPayload.phaseEndsAt || sessionPayload.phase_ends_at || null,
      current_winner_lucky_number: sessionPayload.currentWinnerLuckyNumber || sessionPayload.current_winner_lucky_number || null,
      current_winner_names: sessionPayload.currentWinnerNames || sessionPayload.current_winner_names || null,
      last_completed_rank: sessionPayload.lastCompletedRank || sessionPayload.last_completed_rank || 0,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('event_live_sessions')
        .upsert([payload], { onConflict: 'event_id,service_type' })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('upsertLiveSession warning:', error.message);
      }
      return data || payload;
    } catch (err) {
      console.error('upsertLiveSession exception:', err);
      return payload;
    }
  },

  // No-op for broadcast to avoid broken channel errors
  broadcastLiveState: async () => {}
};
