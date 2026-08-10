import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { eventService } from '@/services/eventService';
import { participantService } from '@/services/participantService';
import { useEventStore } from '@/stores/eventStore';
import { useDrawStore } from '@/stores/drawStore';
import { supabase } from '@/lib/supabase';

const EventContext = createContext(null);

const INITIAL_NOTIFICATIONS = [
  { id: '1', text: 'Supabase Database connected successfully.', time: 'Just now', read: false }
];

export const EventProvider = ({ children }) => {
  const [activeEventId, setActiveEventIdState] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [winners, setWinners] = useState([]);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState(true);

  const activeEventIdRef = useRef(activeEventId);
  useEffect(() => {
    activeEventIdRef.current = activeEventId;
  }, [activeEventId]);

  const refreshEventContext = useCallback(async (targetId, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const allEvents = await eventService.getAllEvents();
      setEventsList(allEvents);

      const validId = targetId || activeEventIdRef.current || allEvents[0]?.id || null;
      setActiveEventIdState(validId);

      if (validId) {
        const event = await eventService.getEvent(validId);
        setEventData(event);

        const eventPrizes = await eventService.getPrizes(validId);
        setPrizes(eventPrizes);

        const eventParticipants = await participantService.getParticipants(validId);
        setParticipants(eventParticipants);

        const eventWinners = await participantService.getWinners(validId);
        setWinners(eventWinners);

        useEventStore.setState({ event });
        useDrawStore.setState({ winners: eventWinners, currentDraftWinners: [] });
      } else {
        setEventData(null);
        setPrizes([]);
        setParticipants([]);
        setWinners([]);
      }
    } catch (err) {
      console.error('Error refreshing EventContext:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch with spinner
    refreshEventContext(null, false);

    // Global Supabase Realtime Subscription for instant updates across all pages
    const channel = supabase
      .channel('global_event_system_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_events' }, () => {
        refreshEventContext(activeEventIdRef.current, true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        refreshEventContext(activeEventIdRef.current, true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants_nabl' }, () => {
        refreshEventContext(activeEventIdRef.current, true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants_ts' }, () => {
        refreshEventContext(activeEventIdRef.current, true);
      })
      .subscribe();

    // 2-second background ticker to keep time-based status badges (UPCOMING -> ACTIVE -> LIVE) updating in real-time
    const ticker = setInterval(() => {
      setEventsList(prev => [...prev]);
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  }, [refreshEventContext]);

  const setActiveEvent = async (id) => {
    setActiveEventIdState(id);
    await refreshEventContext(id, true);
    const event = eventsList.find(e => e.id === id);
    addNotification(`Active event switched to "${event?.name || id}"`);
  };

  const createEvent = async (data) => {
    const newEvt = await eventService.createEvent(data);
    if (newEvt) {
      await refreshEventContext(newEvt.id, true);
      addNotification(`New Event "${newEvt.name}" created.`);
    }
    return newEvt;
  };

  const updateEventDetails = async (fields) => {
    if (!activeEventId) return null;
    const updated = await eventService.saveEvent(activeEventId, fields);
    await refreshEventContext(activeEventId, true);
    addNotification(`Event details updated for "${updated?.name || 'Event'}".`);
    return updated;
  };

  const updateEvent = async (eventId, fields) => {
    const targetId = eventId || activeEventId;
    if (!targetId) return null;
    const updated = await eventService.saveEvent(targetId, fields);
    await refreshEventContext(targetId, true);
    addNotification(`Event details updated for "${updated?.name || 'Event'}".`);
    return updated;
  };

  const deleteEvent = async (id) => {
    const updatedList = await eventService.deleteEvent(id);
    const nextId = updatedList[0]?.id || null;
    await refreshEventContext(nextId, true);
    addNotification(`Event deleted successfully.`);
  };

  const addNotification = (text) => {
    const newLog = {
      id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newLog, ...prev].slice(0, 20));
  };

  const registerParticipant = async (data, targetEventId) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId) return null;
    const result = await participantService.registerParticipant(eventId, data);
    await refreshEventContext(eventId, true);
    return result;
  };

  const updateParticipant = async (participantId, updateData, targetEventId) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId || !participantId) return null;
    const updated = await participantService.updateParticipant(eventId, participantId, updateData);
    await refreshEventContext(eventId, true);
    addNotification(`Participant "${updateData.name || 'Details'}" updated.`);
    return updated;
  };

  const importBulkParticipants = async (rawList, replaceMode = false, targetEventId, serviceType = 'NABL') => {
    const eventId = targetEventId || activeEventId;
    if (!eventId) return [];
    const updated = await participantService.importParticipants(eventId, rawList, replaceMode, serviceType);
    await refreshEventContext(eventId, true);
    addNotification(`Imported ${updated.length} participants into event.`);
    return updated;
  };

  const toggleParticipation = async (participantId, targetEventId, serviceType = null) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId || !participantId) return null;
    const updated = await participantService.toggleParticipation(eventId, participantId, serviceType);
    await refreshEventContext(eventId, true);
    return updated;
  };

  const verifyParticipant = async (dataOrMobile, targetEventId) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId) return null;
    if (typeof dataOrMobile === 'object' && dataOrMobile !== null) {
      return await participantService.verifyParticipant(eventId, dataOrMobile);
    }
    return await participantService.verifyByMobile(eventId, dataOrMobile);
  };

  const assignLuckyNumber = async (participantId, luckyNumber, targetEventId, serviceType = null) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId || !participantId) return null;
    const updated = await participantService.assignLuckyNumber(eventId, participantId, luckyNumber, serviceType);
    await refreshEventContext(eventId, true);
    addNotification(`Participant assigned lucky number #${luckyNumber}.`);
    return updated;
  };

  const joinEvent = async (participantId, targetEventId) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId || !participantId) return null;
    const updated = await participantService.markJoined(eventId, participantId);
    await refreshEventContext(eventId, true);
    return updated;
  };

  const deleteParticipant = async (participantId, targetEventId, serviceType = null) => {
    const eventId = targetEventId || activeEventId;
    if (!eventId || !participantId) return [];
    const updated = await participantService.deleteParticipant(eventId, participantId, serviceType);
    await refreshEventContext(eventId, true);
    addNotification(`Participant removed.`);
    return updated;
  };

  const saveWinnersRoster = async (newWinners, targetEventId, serviceType = 'NABL') => {
    const eventId = targetEventId || activeEventId;
    if (!eventId) return [];
    const saved = await participantService.saveWinners(eventId, newWinners, serviceType);
    await refreshEventContext(eventId, true);
    addNotification(`Saved ${newWinners.length} winner records.`);
    return saved;
  };

  return (
    <EventContext.Provider value={{
      activeEventId,
      eventsList,
      eventData,
      prizes,
      participants,
      winners,
      notifications,
      isLoading,

      setActiveEvent,
      createEvent,
      updateEvent,
      updateEventDetails,
      deleteEvent,

      registerParticipant,
      updateParticipant,
      importBulkParticipants,
      toggleParticipation,
      verifyParticipant,
      assignLuckyNumber,
      joinEvent,
      deleteParticipant,
      saveWinnersRoster,
      refreshEventContext
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
