/**
 * Computed Event Status Lifecycle Utility
 * 
 * Status Lifecycle:
 * - UPCOMING: Current time < start_date (or not started yet)
 * - ACTIVE: start_date <= Current time <= end_date (participants can join & pick numbers)
 * - LIVE: Current time >= live_datetime AND not all prize winners published yet
 * - ENDED: All prizes have a published winner (or manually confirmed as ENDED)
 */

export const EVENT_STATUS = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  LIVE: 'LIVE',
  ENDED: 'ENDED'
};

export const getLiveMs = (event, serviceType = 'NABL') => {
  if (!event) return 0;
  const isTs = String(serviceType).toUpperCase().includes('TOTAL');
  const targetDateTime = isTs 
    ? (event.liveDateTimeTs || event.liveDateTime) 
    : (event.liveDateTimeNabl || event.liveDateTime);

  if (targetDateTime) {
    const ms = new Date(targetDateTime).getTime();
    if (!isNaN(ms)) return ms;
  }
  if (event.liveDateTime) {
    const ms = new Date(event.liveDateTime).getTime();
    if (!isNaN(ms)) return ms;
  }
  if (event.liveDate && event.liveTime) {
    const ms = new Date(`${event.liveDate}T${event.liveTime}:00`).getTime();
    if (!isNaN(ms)) return ms;
  }
  if (event.liveDate) {
    const ms = new Date(`${event.liveDate}T18:00:00`).getTime();
    if (!isNaN(ms)) return ms;
  }
  return 0;
};

export const getStartMs = (event) => {
  if (!event) return 0;
  if (event.startDateTime) {
    const ms = new Date(event.startDateTime).getTime();
    if (!isNaN(ms)) return ms;
  }
  if (event.startDate) {
    const ms = new Date(`${event.startDate}T00:00:00`).getTime();
    if (!isNaN(ms)) return ms;
  }
  return 0;
};

export const getEndMs = (event) => {
  if (!event) return Infinity;
  if (event.endDateTime) {
    const ms = new Date(event.endDateTime).getTime();
    if (!isNaN(ms)) return ms;
  }
  if (event.endDate) {
    const ms = new Date(`${event.endDate}T23:59:59`).getTime();
    if (!isNaN(ms)) return ms;
  }
  return Infinity;
};

export const getSecondsToLive = (event, serviceType = 'NABL') => {
  const liveMs = getLiveMs(event, serviceType);
  if (!liveMs) return 0;
  return Math.floor((liveMs - Date.now()) / 1000);
};

export const computeEventStatus = (event, winners = [], prizes = []) => {
  if (!event) return EVENT_STATUS.UPCOMING;

  // DB override or manual ENDED status
  if (event.status === EVENT_STATUS.ENDED || event.status === 'COMPLETED') {
    return EVENT_STATUS.ENDED;
  }

  const effectivePrizes = (prizes && prizes.length > 0) ? prizes : (event.prizes || []);
  const publishedWinnersCount = (winners || []).filter(w => w.published || w.winner).length;

  // If all prize ranks have published winners, the event is ENDED
  if (effectivePrizes.length > 0 && publishedWinnersCount >= effectivePrizes.length) {
    return EVENT_STATUS.ENDED;
  }

  const now = Date.now();
  const liveMs = getLiveMs(event);
  const startMs = getStartMs(event);
  const endMs = getEndMs(event);

  // If live time is reached and not all prizes published yet -> LIVE
  if (liveMs > 0 && now >= liveMs) {
    return EVENT_STATUS.LIVE;
  }

  // If current time is before start time -> UPCOMING
  if (startMs > 0 && now < startMs) {
    return EVENT_STATUS.UPCOMING;
  }

  // If current time is between start and end date -> ACTIVE
  if (now >= startMs && now <= endMs) {
    return EVENT_STATUS.ACTIVE;
  }

  // Past end date
  if (endMs !== Infinity && now > endMs) {
    return EVENT_STATUS.LIVE;
  }

  return EVENT_STATUS.UPCOMING;
};

export const isEventLocked = (event, winners = [], prizes = []) => {
  const status = computeEventStatus(event, winners, prizes);
  return status === EVENT_STATUS.ENDED;
};
