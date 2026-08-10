import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEvent } from '@/context/EventContext';
import { useDrawStore } from '@/stores/drawStore';
import { eventStorage } from '@/services/eventStorage';
import { participantStorage } from '@/services/participantStorage';
import { winnerStorage } from '@/services/winnerStorage';
import { computeEventStatus, getLiveMs, getSecondsToLive, EVENT_STATUS } from '@/utils/eventStatus';
import { FlipDigitCards } from '@/components/draw/FlipDigitCards';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { Trophy, Users, LogOut, CheckCircle, Ticket, Sparkles, Gift, Clock, ShieldCheck, Check, Flame, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Rank Color Themes (Dynamic for N ranks)
const RANK_COLORS = [
  { bg: 'bg-blue-600', bar: 'bg-blue-900', border: 'border-blue-200' },
  { bg: 'bg-emerald-600', bar: 'bg-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-amber-500', bar: 'bg-amber-700', border: 'border-amber-200' },
  { bg: 'bg-red-600', bar: 'bg-red-900', border: 'border-red-200' },
  { bg: 'bg-purple-600', bar: 'bg-purple-900', border: 'border-purple-200' },
  { bg: 'bg-pink-600', bar: 'bg-pink-900', border: 'border-pink-200' },
  { bg: 'bg-cyan-600', bar: 'bg-cyan-900', border: 'border-cyan-200' },
];

const getRankStyle = (rank) => {
  const num = Number(rank) || 1;
  return RANK_COLORS[(num - 1) % RANK_COLORS.length];
};

export const LivePage = () => {
  const { token, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { eventData } = useEvent();
  const flipCardsRef = useRef(null);
  
  const autoSequenceLockRef = useRef(false);

  const [activeService, setActiveService] = useState('NABL'); // 'NABL' | 'TOTAL_STATION'
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [winners, setWinners] = useState([]);
  const [selectedRank, setSelectedRank] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Reveal Animation States
  const [isBuildUpActive, setIsBuildUpActive] = useState(false);
  const [reverseCountdown, setReverseCountdown] = useState(null); // 5, 4, 3, 2, 1, 0 or null
  const [preLiveSeconds, setPreLiveSeconds] = useState(null); // seconds until live (within 60s)

  const { currentDraftWinners, drawNextWinnerForRank, isRankLocked } = useDrawStore();

  const isAdminView = location.pathname.startsWith('/admin') || Boolean(id);

  const loadEvent = async () => {
    setIsLoading(true);
    try {
      let evt = null;
      if (token) {
        evt = await eventStorage.getEventByToken(token);
      } else if (id) {
        evt = await eventStorage.getEvent(id);
      }

      if (!evt) evt = eventData;
      if (evt) {
        const storedPrizes = await eventStorage.getPrizes(evt.id, activeService);
        const eventPrizes = (storedPrizes && storedPrizes.length > 0) ? storedPrizes : (activeService === 'TOTAL_STATION' ? (evt.prizesTs || []) : (evt.prizesNabl || evt.prizes || []));
        setPrizes(eventPrizes);

        const parts = await participantStorage.getParticipants(evt.id, activeService);
        setParticipants(Array.isArray(parts) ? parts : []);
        const wins = await winnerStorage.getWinners(evt.id, activeService);
        setWinners(Array.isArray(wins) ? wins : []);

        // Auto-mark event as ENDED in DB if all prizes are drawn
        if (eventPrizes.length > 0 && Array.isArray(wins) && wins.length >= eventPrizes.length && evt.status !== 'ENDED') {
          evt = { ...evt, status: 'ENDED' };
          await eventStorage.saveEvent(evt.id, { status: 'ENDED' });
          await winnerStorage.publishWinners(evt.id, activeService);
        }
        setEvent(evt);
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [token, id, activeService]);

  // Real-time listener via Supabase for multi-tab / multi-browser sync
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`live_channel_${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        loadEvent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_events' }, () => {
        loadEvent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const joinedParticipants = participants.filter(p => p.participating && (p.joined || (p.luckyNumber && String(p.luckyNumber).trim() !== '')));
  const activePrize = prizes.find(p => p.rank === selectedRank || p.rank === Number(selectedRank)) || prizes[0];
  const prizeImg = activePrize?.image || activePrize?.img || activePrize?.picture || activePrize?.logo || '';

  const computedStatus = computeEventStatus(event, winners, prizes);
  const liveTimeMs = getLiveMs(event);

  // 1-Minute Countdown Timer before Live Time
  useEffect(() => {
    if (!event || computedStatus === EVENT_STATUS.ENDED) {
      setPreLiveSeconds(null);
      return;
    }

    const checkPreLive = () => {
      if (liveTimeMs === 0) {
        setPreLiveSeconds(null);
        return;
      }
      const secs = getSecondsToLive(event);

      if (secs > 0 && secs <= 60) {
        setPreLiveSeconds(secs);
      } else {
        setPreLiveSeconds(null);
      }
    };

    checkPreLive();
    const interval = setInterval(checkPreLive, 1000);
    return () => clearInterval(interval);
  }, [event, liveTimeMs, computedStatus]);

  // Keep fresh refs to state to prevent stale closures inside async reveal loop
  const latestWinnersRef = useRef(winners);
  const latestParticipantsRef = useRef(participants);
  const latestPrizesRef = useRef(prizes);

  useEffect(() => { latestWinnersRef.current = winners; }, [winners]);
  useEffect(() => { latestParticipantsRef.current = participants; }, [participants]);
  useEffect(() => { latestPrizesRef.current = prizes; }, [prizes]);

  // Automatic Reveal Sequence (Dynamic for any number of prize ranks)
  useEffect(() => {
    if (!event || computedStatus === EVENT_STATUS.ENDED) return;
    if (liveTimeMs === 0) return;

    const checkAndTriggerDraw = async () => {
      const now = Date.now();
      if (now < liveTimeMs) return;

      if (autoSequenceLockRef.current || isSpinning || isBuildUpActive) return;

      // Find the next prize rank that does NOT have a published winner yet (using FRESH refs)
      const currentPrizes = latestPrizesRef.current || [];
      const currentWinners = latestWinnersRef.current || [];
      const currentParts = latestParticipantsRef.current || [];

      const sortedPrizes = [...currentPrizes].sort((a, b) => Number(a.rank) - Number(b.rank));
      const unrevealedPrize = sortedPrizes.find(p => {
        const hasW = currentWinners.some(w => (Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank)) && (w.published || w.winner));
        return !hasW;
      });

      if (!unrevealedPrize) return;

      // Lock auto-sequence execution to avoid duplicate triggers
      autoSequenceLockRef.current = true;
      setSelectedRank(unrevealedPrize.rank);

      // Phase 1: 2-Second Dramatic Build-up Banner
      setIsBuildUpActive(true);
      await new Promise(r => setTimeout(r, 2000));
      setIsBuildUpActive(false);

      // Phase 2: Reverse 5 to 0 Countdown (5, 4, 3, 2, 1)
      for (let count = 5; count >= 1; count--) {
        setReverseCountdown(count);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Phase 3: Winner Selection & Card Flip Animation
      setReverseCountdown(0);
      setIsSpinning(true);

      const availableParts = currentParts.filter(p => p.participating && (p.joined || (p.luckyNumber && String(p.luckyNumber).trim() !== '')));
      const res = drawNextWinnerForRank(unrevealedPrize.rank, unrevealedPrize.name || `Rank ${unrevealedPrize.rank}`, availableParts, event.id, currentWinners);

      if (res.success && res.winner) {
        if (flipCardsRef.current?.spinToWinner) {
          flipCardsRef.current.spinToWinner(res.winner);
        }

        // Save & Publish winner immediately to Supabase
        const updatedWins = await winnerStorage.saveWinners(event.id, [res.winner], activeService);
        await winnerStorage.publishWinners(event.id, null, activeService);

        // Update local winners state and ref so next rank is selected sequentially
        const finalWinnerObj = { ...res.winner, winner: true, published: true };
        const newList = Array.isArray(updatedWins) && updatedWins.length > 0 ? updatedWins : [...currentWinners, finalWinnerObj];
        const map = new Map();
        newList.forEach(w => map.set(w.id || w.participantId || `${w.rank}_${w.invoiceNumber || w.invoiceNo}`, w));
        const finalWinnersArray = Array.from(map.values()).sort((a, b) => Number(a.rank || a.winnerRank) - Number(b.rank || b.winnerRank));

        latestWinnersRef.current = finalWinnersArray;
        setWinners(finalWinnersArray);

        const winnerName = res.winner.customerName || res.winner.name || res.winner.customerNames || 'Winner';
        toast.success(`Rank ${unrevealedPrize.rank} Winner Revealed: ${winnerName}!`);

        // If all prize ranks have now been revealed, automatically mark event as ENDED in Supabase DB
        const totalPrizesCount = currentPrizes.length;
        const currentWinnerCount = finalWinnersArray.length;
        if (totalPrizesCount > 0 && currentWinnerCount >= totalPrizesCount) {
          await eventStorage.saveEvent(event.id, { status: 'ENDED' });
          await winnerStorage.publishWinners(event.id, null, activeService);
          toast.success('★ All winners announced! Event officially COMPLETED and marked as ENDED ★');
          setEvent(prev => prev ? { ...prev, status: 'ENDED' } : prev);
        }
      }

      setIsSpinning(false);
      setReverseCountdown(null);

      // Phase 4: Hold revealed winner for 4 seconds before unlocking for next prize rank
      await new Promise(r => setTimeout(r, 4000));
      autoSequenceLockRef.current = false;
    };

    const interval = setInterval(checkAndTriggerDraw, 1500);
    return () => clearInterval(interval);
  }, [event, liveTimeMs, computedStatus, isSpinning, isBuildUpActive, drawNextWinnerForRank]);

  // Admin Manual Confirmation Handler to Finalize ENDED Event
  const handleConfirmAndEndEvent = async () => {
    if (!event) return;
    if (!window.confirm('Are you sure all winners are announced and you want to officially END this event?')) {
      return;
    }

    setIsEnding(true);
    try {
      await eventStorage.saveEvent(event.id, { status: 'ENDED' });
      await winnerStorage.publishWinners(event.id, null, activeService);
      toast.success('Event successfully completed and marked as ENDED!');
      await loadEvent();
    } catch (err) {
      console.error(err);
      toast.error('Failed to end event');
    } finally {
      setIsEnding(false);
    }
  };

  // Get exact logged-in participant details from tab-isolated sessionStorage or localStorage
  const getLoggedParticipant = () => {
    if (!event) return null;
    try {
      let raw = null;
      const s1 = sessionStorage.getItem(`dei_logged_participant_${event.id}`);
      if (s1) raw = JSON.parse(s1);
      else {
        const s2 = sessionStorage.getItem('dei_current_participant');
        if (s2) raw = JSON.parse(s2);
        else {
          const p1 = localStorage.getItem(`dei_logged_participant_${event.id}`);
          if (p1) raw = JSON.parse(p1);
          else {
            const p2 = localStorage.getItem('dei_current_participant');
            if (p2) raw = JSON.parse(p2);
          }
        }
      }

      if (raw) {
        const latest = participants.find(p => p.id === raw.id || (raw.invoiceNumber && (p.invoiceNumber === raw.invoiceNumber || p.invoiceNo === raw.invoiceNumber)));
        return latest || raw;
      }
    } catch (e) {
      console.error(e);
    }
    return joinedParticipants[0] || null;
  };

  const currentLoggedUser = getLoggedParticipant();
  const rawTicket = currentLoggedUser?.luckyNumber || currentLoggedUser?.invoiceNumber || currentLoggedUser?.invoiceNo || joinedParticipants[0]?.luckyNumber || joinedParticipants[0]?.invoiceNumber || '001';
  const ticketNo = String(rawTicket).padStart(3, '0');
  const customerName = currentLoggedUser?.customerName || currentLoggedUser?.name || joinedParticipants[0]?.customerName || joinedParticipants[0]?.name || 'Participant';

  const publishedRankWinners = winners.filter(w => Number(w.rank) === Number(selectedRank) || Number(w.winnerRank) === Number(selectedRank));
  const draftWinner = currentDraftWinners.find(w => Number(w.rank) === Number(selectedRank));
  const currentWinner = publishedRankWinners.length > 0 ? {
    customerName: Array.from(new Set(publishedRankWinners.map(w => w.customerName || w.name))).join(', '),
    luckyNumber: publishedRankWinners[0]?.luckyNumber || publishedRankWinners[0]?.winningNumber || publishedRankWinners[0]?.invoiceNumber,
    rank: selectedRank
  } : draftWinner;

  const allPrizesDrawn = prizes.length > 0 && winners.length >= prizes.length;
  const isCompleted = computedStatus === EVENT_STATUS.ENDED;

  const handleLogout = () => {
    try {
      if (event) {
        sessionStorage.removeItem(`dei_logged_participant_${event.id}`);
        localStorage.removeItem(`dei_logged_participant_${event.id}`);
      }
      sessionStorage.removeItem('dei_current_participant');
      localStorage.removeItem('dei_current_participant');
    } catch (e) {
      console.error(e);
    }
    toast.success('Logged out of live portal');
    if (token) {
      navigate(`/event/${token}`);
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-3 text-white">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold tracking-wider text-amber-300">Loading Live Portal...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-white">
          <AlertCircle size={44} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-xl font-bold mb-1">Event Not Found</h2>
          <p className="text-slate-400 text-xs mb-4">The event link you followed is invalid or has expired.</p>
          <a href="/admin/login" className="text-xs font-bold text-amber-400 hover:underline">Organizer Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full">
      
      {/* 1. PRE-LIVE 1-MINUTE COUNTDOWN BANNER (SHOWS ON ALL LIVE PAGES) */}
      {preLiveSeconds !== null && preLiveSeconds > 0 && (
        <div className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-2.5 px-4 text-center font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-md animate-pulse sticky top-0 z-50">
          <Clock size={18} className="animate-spin" />
          <span>WINNER REVEAL STARTING IN: <strong className="text-yellow-300 font-mono text-base ml-1">00:{String(preLiveSeconds).padStart(2, '0')}</strong></span>
        </div>
      )}

      {/* 2. FULL WIDTH TOP HEADER NAVBAR */}
      <header className="w-full bg-[#0b1739] text-white px-6 sm:px-12 py-3.5 border-b border-blue-900/40 flex items-center justify-between shadow-md sticky top-0 z-40">
        {/* Left Logo & Portal Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight text-white">{event.name}</h1>
            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block">
              {event.sponsor || 'Divine Empire'}
            </span>
          </div>
        </div>

        {/* Center: Admin Stream Switcher */}
        {isAdminView ? (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveService('NABL')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeService === 'NABL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 NABL Stream (5 Prizes)
            </button>
            <button
              type="button"
              onClick={() => setActiveService('TOTAL_STATION')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeService === 'TOTAL_STATION'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛠️ Total Station Stream (5 Prizes)
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
              currentLoggedUser?.serviceType === 'TOTAL_STATION'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}>
              {currentLoggedUser?.serviceType === 'TOTAL_STATION' ? 'Total Station Stream' : 'NABL Calibration Stream'}
            </span>
          </div>
        )}

        {/* Right Ticket, User & Logout */}
        <div className="flex items-center gap-3.5">
          <div className="bg-amber-500/10 border border-amber-400/30 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Ticket size={14} className="text-amber-400" />
            <span>Lucky Number #{ticketNo}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs font-bold shadow-xs">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[11px]">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-200">{customerName}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Logout / Exit Live Portal"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* HERO BANNER CARD */}
        <div className="w-full bg-gradient-to-b from-[#0d1b46] via-[#0c183d] to-[#0a1330] rounded-3xl p-6 sm:p-8 border border-blue-800/50 shadow-2xl text-white relative overflow-hidden flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            
            {/* Left Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  computedStatus === EVENT_STATUS.ENDED ? 'bg-emerald-500 text-slate-950' :
                  computedStatus === EVENT_STATUS.LIVE ? 'bg-red-600 text-white animate-pulse' :
                  'bg-blue-600 text-white'
                }`}>
                  <CheckCircle size={14} />
                  {computedStatus === EVENT_STATUS.ENDED ? 'EVENT COMPLETED' :
                   computedStatus === EVENT_STATUS.LIVE ? 'LIVE DRAW REVEAL IN PROGRESS' :
                   computedStatus === EVENT_STATUS.ACTIVE ? 'EVENT ACTIVE' : 'UPCOMING'}
                </span>

                <span className="bg-slate-800/80 text-slate-200 border border-slate-700/80 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Users size={14} className="text-blue-400" />
                  {joinedParticipants.length} Participants
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{event.name}</h2>
              <p className="text-xs sm:text-base text-slate-300 font-medium">{event.description || 'Select your lucky number and win'}</p>
            </div>

            {/* Right Reserved Ticket Box */}
            <div className="bg-[#142354]/90 border border-blue-700/40 rounded-2xl p-5 flex items-center gap-4 min-w-[240px] shadow-lg shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                <Ticket size={28} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block">
                  YOUR LUCKY NUMBER
                </span>
                <div className="text-2xl font-black text-white font-mono">#{ticketNo}</div>
                <div className="text-xs sm:text-sm text-slate-300 font-semibold">{customerName}</div>
              </div>
            </div>
          </div>

          {/* Hero Bottom Bar */}
          <div className="bg-[#080f26]/80 border border-blue-900/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400">
              <CheckCircle size={18} />
              <span>
                {isCompleted
                  ? 'Event Completed — All Official Winners Announced Below'
                  : computedStatus === EVENT_STATUS.LIVE
                  ? 'Live Draw Sequence Active — Winners Revealing Automatically'
                  : 'Live Participant Portal Connected'}
              </span>
            </div>

            {/* Admin Manual Confirmation Button (Only shown to Admin when all prizes drawn & event not ended) */}
            {isAdminView && allPrizesDrawn && !isCompleted && (
              <button
                type="button"
                onClick={handleConfirmAndEndEvent}
                disabled={isEnding}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                {isEnding ? 'Ending Event...' : 'Publish & Complete Event'}
              </button>
            )}
          </div>
        </div>

        {/* 4. DRAMATIC BUILD-UP ANIMATION BANNER */}
        {isBuildUpActive && (
          <div className="w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 border-2 border-purple-400 rounded-3xl p-6 text-center text-white shadow-2xl flex flex-col items-center justify-center gap-2 animate-pulse">
            <Flame size={32} className="text-amber-400 animate-bounce" />
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
              BUILDING SUSPENSE...
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Preparing Rank {selectedRank} Winner Selection ({activePrize?.name || `Rank ${selectedRank}`})
            </h3>
          </div>
        )}

        {/* 5. REVERSE 5 TO 0 COUNTDOWN OVERLAY */}
        {reverseCountdown !== null && reverseCountdown > 0 && (
          <div className="w-full bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-6 text-center text-white shadow-2xl flex flex-col items-center justify-center gap-2 animate-bounce">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
              REVEALING RANK {selectedRank} WINNER IN
            </span>
            <div className="text-6xl sm:text-8xl font-black text-amber-400 font-mono tracking-tighter">
              {reverseCountdown}
            </div>
          </div>
        )}

        {/* 6. MECHANICAL FLIP CARD CONTAINER */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <FlipDigitCards
            ref={flipCardsRef}
            isSpinningExternal={isSpinning}
            participants={joinedParticipants}
            activeRank={selectedRank}
            prizeName={activePrize?.name || `Prize ${selectedRank}`}
            prizeImage={prizeImg}
            existingWinners={winners}
          />
        </div>

        {/* 7. WINNER ANNOUNCEMENT & RANK SELECTOR CARD */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Winner Details Left */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              <Trophy size={28} />
            </div>

            <div>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider block">
                ★ RANK {selectedRank} WINNER ★
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {currentWinner ? (currentWinner.customerName || currentWinner.customerNames || currentWinner.name) : 'Winner Pending...'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                Lucky Number: <strong className="text-slate-900 font-mono">#{currentWinner?.luckyNumber || currentWinner?.winningNumber || currentWinner?.invoiceNumber || '---'}</strong> | Prize: <strong className="text-slate-900">{activePrize?.name || 'Grand Prize'}</strong>
              </p>
            </div>
          </div>

          {/* Rank Selector Pills Right */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
            {prizes.map(p => {
              const isSelected = Number(selectedRank) === Number(p.rank);
              const pWinner = winners.find(w => Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank));

              return (
                <button
                  key={p.rank}
                  type="button"
                  onClick={() => setSelectedRank(p.rank)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-900 text-white shadow-sm font-extrabold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200 font-semibold'
                  }`}
                >
                  <span>Rank {p.rank}</span>
                  {pWinner && <Check size={12} className="text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 8. PRIZES GRID CARDS (RANKS 1 TO N) */}
        <div className="w-full space-y-4 pt-2">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-xs uppercase tracking-widest px-5 py-1.5 rounded-full shadow-xs">
              OFFICIAL PRIZE REWARDS ({prizes.length} {prizes.length === 1 ? 'PRIZE' : 'RANKS'})
            </span>
          </div>

          <div className="flex flex-wrap items-stretch justify-center gap-5">
            {prizes.map(p => {
              const style = getRankStyle(p.rank);
              const pWinner = winners.find(w => Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank)) || currentDraftWinners.find(w => Number(w.rank) === Number(p.rank));
              const img = p.image || p.img || p.picture || p.logo;

              return (
                <div 
                  key={p.rank} 
                  className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between w-full sm:w-60 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
                >
                  {/* Top Rank Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`${style.bg} text-white font-black text-xs w-7 h-7 rounded-xl flex items-center justify-center shadow-md border border-white/20`}>
                      {p.rank}
                    </span>
                  </div>

                  {/* Prize Image Container */}
                  <div className="w-full h-44 bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 flex items-center justify-center relative overflow-hidden">
                    {img ? (
                      <img 
                        src={img} 
                        alt={p.name} 
                        className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-200/70 text-slate-400 flex items-center justify-center shadow-inner">
                        <Gift size={40} />
                      </div>
                    )}
                  </div>

                  {/* Prize Details & Bottom Colored Bar */}
                  <div className="flex flex-col">
                    <div className={`${style.bar} w-full py-3 px-3 text-center text-white font-black text-xs uppercase tracking-wider truncate shadow-xs`}>
                      {p.name || `Rank ${p.rank} Prize`}
                    </div>

                    {/* Winner Footer */}
                    {(() => {
                      const pRankWinners = winners.filter(w => Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank));
                      const winnerText = pRankWinners.length > 0 
                        ? Array.from(new Set(pRankWinners.map(w => w.customerName || w.name))).join(', ') 
                        : (pWinner ? (pWinner.customerName || pWinner.customerNames || pWinner.name) : '');
                      
                      if (!winnerText) return null;

                      return (
                        <div className="w-full bg-amber-50 border-t border-amber-200 py-2 px-3 text-center text-slate-900 font-extrabold text-xs truncate flex items-center justify-center gap-1.5">
                          <Trophy size={14} className="text-amber-600 shrink-0" />
                          <span className="truncate">{winnerText}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
};
