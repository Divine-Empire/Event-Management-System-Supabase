import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { eventStorage } from '@/services/eventStorage';
import { participantStorage } from '@/services/participantStorage';
import { winnerStorage } from '@/services/winnerStorage';
import { liveSessionService } from '@/services/liveSessionService';

export const useLiveSession = (eventId, token, activeService = 'NABL') => {
  const [event, setEvent] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [winners, setWinners] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const sType = String(activeService).toUpperCase().includes('TOTAL') ? 'TOTAL_STATION' : 'NABL';

  const loadLiveData = useCallback(async () => {
    try {
      let evt = null;
      if (token) {
        evt = await eventStorage.getEventByToken(token);
      } else if (eventId) {
        evt = await eventStorage.getEvent(eventId);
      }

      if (evt) {
        setEvent(evt);

        // 1. Load exact Prizes for service type (prizesNabl for NABL, prizesTs for TOTAL_STATION)
        const streamPrizes = sType === 'TOTAL_STATION' 
          ? (evt.prizesTs && evt.prizesTs.length > 0 ? evt.prizesTs : []) 
          : (evt.prizesNabl && evt.prizesNabl.length > 0 ? evt.prizesNabl : (evt.prizes || []));
        setPrizes(streamPrizes);

        // 2. Load Service Type Specific Participants (Separate tables event_participants_nabl / event_participants_ts)
        const parts = await participantStorage.getParticipants(evt.id, sType);
        setParticipants(Array.isArray(parts) ? parts : []);

        // 3. Load Winners for service type
        const wins = await winnerStorage.getWinners(evt.id, sType);
        setWinners(Array.isArray(wins) ? wins : []);

        // 4. Load Centralized Live Session state
        const liveSess = await liveSessionService.getLiveSession(evt.id, sType);
        if (liveSess) {
          setSession(liveSess);
        }
      }
    } catch (err) {
      console.error('Error in useLiveSession loadLiveData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, token, sType]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Real-time synchronization listeners & polling fallback via Supabase
  useEffect(() => {
    if (!event?.id) return;

    const sessionChannel = supabase
      .channel(`live_session_${event.id}_${sType}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_live_sessions',
        filter: `event_id=eq.${event.id}` 
      }, (payload) => {
        if (payload.new) {
          setSession(payload.new);
          // Immediately sync winners and participants when phase becomes REVEALED or COMPLETED
          if (payload.new.phase === 'REVEALED' || payload.new.phase === 'COMPLETED') {
            loadLiveData();
          }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: sType === 'TOTAL_STATION' ? 'event_participants_ts' : 'event_participants_nabl'
      }, () => {
        loadLiveData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_events',
        filter: `id=eq.${event.id}`
      }, () => {
        loadLiveData();
      })
      .subscribe();

    // 2.5-second polling safety net for live sync across tabs
    const pollInterval = setInterval(() => {
      loadLiveData();
    }, 2500);

    return () => {
      supabase.removeChannel(sessionChannel);
      clearInterval(pollInterval);
    };
  }, [event?.id, sType, loadLiveData]);

  return {
    event,
    prizes,
    participants,
    winners,
    session,
    setSession,
    isLoading,
    refetch: loadLiveData
  };
};
