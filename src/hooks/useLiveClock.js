import { useState, useEffect } from 'react';
import { getLiveMs, getSecondsToLive } from '@/utils/eventStatus';

export const useLiveClock = (event, phaseEndsAt = null, serviceType = 'NABL') => {
  const [preLiveSeconds, setPreLiveSeconds] = useState(null);
  const [reverseCountdown, setReverseCountdown] = useState(null);

  // 1. 5-Minute (300 seconds) Pre-Live Countdown Timer
  useEffect(() => {
    if (!event || event.status === 'ENDED' || event.status === 'COMPLETED') {
      setPreLiveSeconds(null);
      return;
    }

    const checkPreLive = () => {
      const liveMs = getLiveMs(event, serviceType);
      if (liveMs === 0) {
        setPreLiveSeconds(null);
        return;
      }
      const secs = getSecondsToLive(event, serviceType);

      // Pre-live banner active within 5 minutes (300s) before start
      if (secs > 0 && secs <= 300) {
        setPreLiveSeconds(secs);
      } else {
        setPreLiveSeconds(null);
      }
    };

    checkPreLive();
    const interval = setInterval(checkPreLive, 1000);
    return () => clearInterval(interval);
  }, [event, serviceType]);

  // 2. Reverse Countdown Timer (5, 4, 3, 2, 1) synchronized via server phaseEndsAt timestamp
  useEffect(() => {
    if (!phaseEndsAt) {
      setReverseCountdown(null);
      return;
    }

    const updateReverse = () => {
      const targetMs = new Date(phaseEndsAt).getTime();
      const diffSecs = Math.ceil((targetMs - Date.now()) / 1000);
      if (diffSecs > 0 && diffSecs <= 10) {
        setReverseCountdown(diffSecs);
      } else {
        setReverseCountdown(null);
      }
    };

    updateReverse();
    const interval = setInterval(updateReverse, 250);
    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  return { preLiveSeconds, reverseCountdown };
};
