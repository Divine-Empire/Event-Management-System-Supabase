import { supabase } from '@/lib/supabase';

const DEFAULT_PRIZES = [
  { rank: 1, title: 'Rank 1 Prize', name: 'Grand Prize - Car', image: '' },
  { rank: 2, title: 'Rank 2 Prize', name: 'Second Prize - Smartphone', image: '' },
  { rank: 3, title: 'Rank 3 Prize', name: 'Third Prize - Smart TV', image: '' },
  { rank: 4, title: 'Rank 4 Prize', name: 'Fourth Prize - Tablet', image: '' },
  { rank: 5, title: 'Rank 5 Prize', name: 'Fifth Prize - Smartwatch', image: '' }
];

const DEFAULT_PRIZES_TS = [
  { rank: 1, title: 'Rank 1 Prize', name: 'Total Station Grand Prize', image: '' },
  { rank: 2, title: 'Rank 2 Prize', name: 'Total Station Second Prize', image: '' },
  { rank: 3, title: 'Rank 3 Prize', name: 'Total Station Third Prize', image: '' },
  { rank: 4, title: 'Rank 4 Prize', name: 'Total Station Fourth Prize', image: '' },
  { rank: 5, title: 'Rank 5 Prize', name: 'Total Station Fifth Prize', image: '' }
];

const mapEventFromDb = (row) => {
  if (!row) return null;
  const liveDateTimeStr = row.live_datetime ? new Date(row.live_datetime).toISOString() : '';
  const liveDate = liveDateTimeStr ? liveDateTimeStr.slice(0, 10) : '';
  const liveTime = row.live_datetime ? new Date(row.live_datetime).toTimeString().slice(0, 5) : '18:00';

  const liveDateTimeNablStr = row.live_datetime_nabl ? new Date(row.live_datetime_nabl).toISOString() : liveDateTimeStr;
  const liveDateNabl = liveDateTimeNablStr ? liveDateTimeNablStr.slice(0, 10) : '';
  const liveTimeNabl = row.live_datetime_nabl ? new Date(row.live_datetime_nabl).toTimeString().slice(0, 5) : '18:00';

  const liveDateTimeTsStr = row.live_datetime_ts ? new Date(row.live_datetime_ts).toISOString() : liveDateTimeStr;
  const liveDateTs = liveDateTimeTsStr ? liveDateTimeTsStr.slice(0, 10) : '';
  const liveTimeTs = row.live_datetime_ts ? new Date(row.live_datetime_ts).toTimeString().slice(0, 5) : '18:00';

  const startDateTimeStr = row.start_date ? new Date(row.start_date).toISOString() : '';
  const startDate = startDateTimeStr ? startDateTimeStr.slice(0, 10) : (row.start_date || '');

  const endDateTimeStr = row.end_date ? new Date(row.end_date).toISOString() : '';
  const endDate = endDateTimeStr ? endDateTimeStr.slice(0, 10) : (row.end_date || '');

  const prizesNabl = Array.isArray(row.prizes_nabl) && row.prizes_nabl.length > 0
    ? row.prizes_nabl
    : (Array.isArray(row.prizes) && row.prizes.length > 0 ? row.prizes : DEFAULT_PRIZES);
  const prizesTs = Array.isArray(row.prizes_ts) && row.prizes_ts.length > 0
    ? row.prizes_ts
    : DEFAULT_PRIZES_TS;

  return {
    id: row.id,
    token: row.token,
    name: row.name,
    description: row.description || '',
    sponsor: row.sponsor || 'Divine Empire Global',
    startDate: startDate,
    endDate: endDate,
    startDateTime: startDateTimeStr || row.start_date || '',
    endDateTime: endDateTimeStr || row.end_date || '',
    liveDateTime: liveDateTimeStr,
    liveDate: liveDate,
    liveTime: liveTime,
    liveDateTimeNabl: liveDateTimeNablStr,
    liveDateNabl: liveDateNabl,
    liveTimeNabl: liveTimeNabl,
    liveDateTimeTs: liveDateTimeTsStr,
    liveDateTs: liveDateTs,
    liveTimeTs: liveTimeTs,
    status: row.status || 'UPCOMING',
    prizes: prizesNabl, // fallback
    prizesNabl: prizesNabl,
    prizesTs: prizesTs,
    settings: row.settings || {
      theme: 'light',
      confettiEnabled: true,
      autoPublishWinner: false,
      winnerAnimation: 'confetti'
    },
    createdAt: row.created_at
  };
};

export const eventService = {
  getAllEvents: async () => {
    try {
      const { data, error } = await supabase
        .from('event_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getAllEvents error:', error);
        return [];
      }
      return (data || []).map(mapEventFromDb);
    } catch (err) {
      console.error('getAllEvents exception:', err);
      return [];
    }
  },

  getEvent: async (eventId) => {
    if (!eventId) return null;
    try {
      const { data, error } = await supabase
        .from('event_events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Supabase getEvent error:', error);
        return null;
      }
      return mapEventFromDb(data);
    } catch (err) {
      console.error('getEvent exception:', err);
      return null;
    }
  },

  getEventByToken: async (token) => {
    if (!token) return null;
    try {
      const { data, error } = await supabase
        .from('event_events')
        .select('*')
        .or(`token.eq.${token},id.eq.${token}`)
        .maybeSingle();

      if (error) {
        console.error('Supabase getEventByToken error:', error);
        return null;
      }
      return mapEventFromDb(data);
    } catch (err) {
      console.error('getEventByToken exception:', err);
      return null;
    }
  },

  createEvent: async (newEventData) => {
    const id = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const slug = (newEventData.name || 'reward-event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const token = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    const initialPrizesNabl = newEventData.prizesNabl || newEventData.prizes || DEFAULT_PRIZES;
    const initialPrizesTs = newEventData.prizesTs || newEventData.prizes || DEFAULT_PRIZES;

    let startDateTimeValue = newEventData.startDateTime
      ? new Date(newEventData.startDateTime).toISOString()
      : (newEventData.startDate ? new Date(newEventData.startDate).toISOString() : new Date().toISOString());

    let endDateTimeValue = newEventData.endDateTime
      ? new Date(newEventData.endDateTime).toISOString()
      : (newEventData.endDate ? new Date(newEventData.endDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString());

    let liveDateTimeValue = newEventData.liveDateTime ? new Date(newEventData.liveDateTime).toISOString() : new Date().toISOString();
    let liveDateTimeNablValue = newEventData.liveDateTimeNabl ? new Date(newEventData.liveDateTimeNabl).toISOString() : liveDateTimeValue;
    let liveDateTimeTsValue = newEventData.liveDateTimeTs ? new Date(newEventData.liveDateTimeTs).toISOString() : liveDateTimeValue;

    const payload = {
      id,
      name: newEventData.name || 'Customer Reward Event',
      token,
      description: newEventData.description || '',
      sponsor: newEventData.sponsor || 'Divine Empire Global',
      start_date: startDateTimeValue,
      end_date: endDateTimeValue,
      live_datetime: liveDateTimeValue,
      live_datetime_nabl: liveDateTimeNablValue,
      live_datetime_ts: liveDateTimeTsValue,
      status: ['UPCOMING', 'ACTIVE', 'ENDED'].includes(newEventData.status) ? newEventData.status : 'UPCOMING',
      prizes: initialPrizesNabl,
      prizes_nabl: initialPrizesNabl,
      prizes_ts: initialPrizesTs,
      settings: newEventData.settings || {
        theme: 'light',
        confettiEnabled: true,
        autoPublishWinner: false,
        winnerAnimation: 'confetti'
      }
    };

    try {
      const { data, error } = await supabase
        .from('event_events')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase createEvent error:', error);
        throw error;
      }
      return mapEventFromDb(data);
    } catch (err) {
      console.error('createEvent exception:', err);
      return null;
    }
  },

  saveEvent: async (eventId, eventData) => {
    if (!eventId) return null;

    let liveDateTimeValue = undefined;
    if (eventData.liveDateTime) {
      liveDateTimeValue = new Date(eventData.liveDateTime).toISOString();
    }
    let liveDateTimeNablValue = undefined;
    if (eventData.liveDateTimeNabl) {
      liveDateTimeNablValue = new Date(eventData.liveDateTimeNabl).toISOString();
    }
    let liveDateTimeTsValue = undefined;
    if (eventData.liveDateTimeTs) {
      liveDateTimeTsValue = new Date(eventData.liveDateTimeTs).toISOString();
    }

    let startDateTimeValue = undefined;
    if (eventData.startDateTime) {
      startDateTimeValue = new Date(eventData.startDateTime).toISOString();
    } else if (eventData.startDate) {
      startDateTimeValue = new Date(eventData.startDate).toISOString();
    }

    let endDateTimeValue = undefined;
    if (eventData.endDateTime) {
      endDateTimeValue = new Date(eventData.endDateTime).toISOString();
    } else if (eventData.endDate) {
      endDateTimeValue = new Date(eventData.endDate).toISOString();
    }

    const updates = {};
    if (eventData.name !== undefined) updates.name = eventData.name;
    if (eventData.description !== undefined) updates.description = eventData.description;
    if (eventData.sponsor !== undefined) updates.sponsor = eventData.sponsor;
    if (startDateTimeValue !== undefined) updates.start_date = startDateTimeValue;
    if (endDateTimeValue !== undefined) updates.end_date = endDateTimeValue;
    if (liveDateTimeValue !== undefined) updates.live_datetime = liveDateTimeValue;
    if (liveDateTimeNablValue !== undefined) updates.live_datetime_nabl = liveDateTimeNablValue;
    if (liveDateTimeTsValue !== undefined) updates.live_datetime_ts = liveDateTimeTsValue;
    if (eventData.status !== undefined && ['UPCOMING', 'ACTIVE', 'ENDED'].includes(eventData.status)) {
      updates.status = eventData.status;
    }
    if (eventData.prizes !== undefined) updates.prizes = eventData.prizes;
    if (eventData.prizesNabl !== undefined) updates.prizes_nabl = eventData.prizesNabl;
    if (eventData.prizesTs !== undefined) updates.prizes_ts = eventData.prizesTs;
    if (eventData.settings !== undefined) updates.settings = eventData.settings;

    try {
      const { data, error } = await supabase
        .from('event_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Supabase saveEvent error:', error);
        throw error;
      }
      return mapEventFromDb(data);
    } catch (err) {
      console.error('saveEvent exception:', err);
      return null;
    }
  },

  getPrizes: async (eventId, serviceType = 'NABL') => {
    const event = await eventService.getEvent(eventId);
    if (!event) return DEFAULT_PRIZES;
    if (serviceType === 'TS' || serviceType === 'TOTAL_STATION') {
      return event.prizesTs && event.prizesTs.length > 0 ? event.prizesTs : DEFAULT_PRIZES_TS;
    }
    return event.prizesNabl && event.prizesNabl.length > 0 ? event.prizesNabl : DEFAULT_PRIZES;
  },

  savePrizes: async (eventId, prizes) => {
    return await eventService.saveEvent(eventId, { prizes });
  },

  deleteEvent: async (eventId) => {
    if (!eventId) return [];
    try {
      const { error } = await supabase
        .from('event_events')
        .delete()
        .eq('id', eventId);

      if (error) console.error('Supabase deleteEvent error:', error);
      return await eventService.getAllEvents();
    } catch (err) {
      console.error('deleteEvent exception:', err);
      return [];
    }
  }
};
