import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveSession } from '@/hooks/useLiveSession';
import { useLiveClock } from '@/hooks/useLiveClock';
import { liveSessionService } from '@/services/liveSessionService';
import { eventStorage } from '@/services/eventStorage';
import { winnerStorage } from '@/services/winnerStorage';
import { useDrawStore } from '@/stores/drawStore';
import { computeEventStatus, getLiveMs, EVENT_STATUS } from '@/utils/eventStatus';
import { FlipDigitCards } from '@/components/draw/FlipDigitCards';
import { Trophy, Users, LogOut, CheckCircle, Ticket, Sparkles, Gift, Clock, ShieldCheck, Check, Play, Pause, AlertCircle, Award, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/common/ConfirmModal';

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

export const AdminLivePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeService, setActiveService] = useState('NABL'); // 'NABL' | 'TOTAL_STATION'
  const [selectedRank, setSelectedRank] = useState(1);

  // Spinning states per service (backed by refs to prevent stale closure stalls)
  const isSpinningNablRef = useRef(false);
  const isSpinningTsRef = useRef(false);
  const [isSpinningNabl, _setIsSpinningNabl] = useState(false);
  const [isSpinningTs, _setIsSpinningTs] = useState(false);

  const setIsSpinningNabl = (val) => {
    isSpinningNablRef.current = Boolean(val);
    _setIsSpinningNabl(Boolean(val));
  };
  const setIsSpinningTs = (val) => {
    isSpinningTsRef.current = Boolean(val);
    _setIsSpinningTs(Boolean(val));
  };

  // Auto-running flags per service (backed by refs)
  const isAutoRunningNablRef = useRef(true);
  const isAutoRunningTsRef = useRef(true);
  const [isAutoRunningNabl, _setIsAutoRunningNabl] = useState(true);
  const [isAutoRunningTs, _setIsAutoRunningTs] = useState(true);

  const setIsAutoRunningNabl = (val) => {
    isAutoRunningNablRef.current = Boolean(val);
    _setIsAutoRunningNabl(Boolean(val));
  };
  const setIsAutoRunningTs = (val) => {
    isAutoRunningTsRef.current = Boolean(val);
    _setIsAutoRunningTs(Boolean(val));
  };

  const [isEnding, setIsEnding] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [isDrawingActive, setIsDrawingActive] = useState(false);

  const flipCardsRef = useRef(null);

  // 1. Dual session subscriptions for NABL and TOTAL_STATION
  const nablSessionData = useLiveSession(id, null, 'NABL');
  const tsSessionData = useLiveSession(id, null, 'TOTAL_STATION');

  const { event, prizes: nablPrizes, participants: nablParts, winners: nablWinners, session: nablSession, isLoading: isLoadingNabl, refetch: refetchNabl } = nablSessionData;
  const { prizes: tsPrizes, participants: tsParts, winners: tsWinners, session: tsSession, refetch: refetchTs } = tsSessionData;

  const activeSessionData = activeService === 'TOTAL_STATION' ? tsSessionData : nablSessionData;
  const { prizes, participants, winners, session, isLoading, refetch } = activeSessionData;

  const { preLiveSeconds, reverseCountdown } = useLiveClock(event, session?.phase_ends_at, activeService);
  const { drawNextWinnerForRank } = useDrawStore();

  const joinedParticipants = participants.filter(p => p.participating && Boolean(p.joined));
  const activePrize = prizes.find(p => Number(p.rank) === Number(selectedRank)) || prizes[0];
  const prizeImg = activePrize?.image || activePrize?.img || activePrize?.picture || activePrize?.logo || '';

  const computedStatus = computeEventStatus(event, winners, prizes);
  const nablComplete = nablPrizes.length > 0 && nablWinners.length >= nablPrizes.length;
  const tsComplete = tsPrizes.length > 0 && tsWinners.length >= tsPrizes.length;
  const allPrizesDrawn = (nablPrizes.length === 0 || nablComplete) && (tsPrizes.length === 0 || tsComplete);
  const isCompleted = computedStatus === EVENT_STATUS.ENDED || allPrizesDrawn;

  // Dedicated Refs for NABL
  const nablAutoLockRef = useRef(false);
  const nablDrawnRanksRef = useRef(new Set());
  const nablWinnersRef = useRef(nablWinners);
  const nablPrizesRef = useRef(nablPrizes);
  const nablPartsRef = useRef(nablParts);
  const nablSessionRef = useRef(nablSession);

  // Dedicated Refs for TOTAL_STATION
  const tsAutoLockRef = useRef(false);
  const tsDrawnRanksRef = useRef(new Set());
  const tsWinnersRef = useRef(tsWinners);
  const tsPrizesRef = useRef(tsPrizes);
  const tsPartsRef = useRef(tsParts);
  const tsSessionRef = useRef(tsSession);

  // Sync selectedRank with active live session current_rank
  useEffect(() => {
    if (session?.current_rank) {
      setSelectedRank(session.current_rank);
    }
  }, [session?.current_rank]);

  // Sync NABL Refs
  useEffect(() => {
    nablWinnersRef.current = nablWinners;
    const drawn = new Set();
    (nablWinners || []).forEach(w => {
      const r = Number(w.winnerRank || w.rank);
      if (r) drawn.add(r);
    });
    nablDrawnRanksRef.current = drawn;
  }, [nablWinners]);
  useEffect(() => { nablPrizesRef.current = nablPrizes; }, [nablPrizes]);
  useEffect(() => { nablPartsRef.current = nablParts; }, [nablParts]);
  useEffect(() => { nablSessionRef.current = nablSession; }, [nablSession]);

  // Sync TS Refs
  useEffect(() => {
    tsWinnersRef.current = tsWinners;
    const drawn = new Set();
    (tsWinners || []).forEach(w => {
      const r = Number(w.winnerRank || w.rank);
      if (r) drawn.add(r);
    });
    tsDrawnRanksRef.current = drawn;
  }, [tsWinners]);
  useEffect(() => { tsPrizesRef.current = tsPrizes; }, [tsPrizes]);
  useEffect(() => { tsPartsRef.current = tsParts; }, [tsParts]);
  useEffect(() => { tsSessionRef.current = tsSession; }, [tsSession]);

  // Automatically enable auto-running when live time is reached for NABL
  useEffect(() => {
    if (!event || isCompleted) return;
    const checkLiveTime = () => {
      const liveMs = getLiveMs(event, 'NABL');
      if (liveMs > 0 && Date.now() >= liveMs && !nablComplete) {
        setIsAutoRunningNabl(true);
      }
    };
    checkLiveTime();
    const interval = setInterval(checkLiveTime, 1000);
    return () => clearInterval(interval);
  }, [event, isCompleted, nablComplete]);

  // Automatically enable auto-running when live time is reached for TOTAL_STATION
  useEffect(() => {
    if (!event || isCompleted) return;
    const checkLiveTime = () => {
      const liveMs = getLiveMs(event, 'TOTAL_STATION');
      if (liveMs > 0 && Date.now() >= liveMs && !tsComplete) {
        setIsAutoRunningTs(true);
      }
    };
    checkLiveTime();
    const interval = setInterval(checkLiveTime, 1000);
    return () => clearInterval(interval);
  }, [event, isCompleted, tsComplete]);

  const triggerDrawForRank = async (targetRank, targetServiceType = 'NABL') => {
    const isTs = targetServiceType === 'TOTAL_STATION';
    const autoLockRef = isTs ? tsAutoLockRef : nablAutoLockRef;
    const drawnRanksRef = isTs ? tsDrawnRanksRef : nablDrawnRanksRef;
    const prizesRef = isTs ? tsPrizesRef : nablPrizesRef;
    const winnersRef = isTs ? tsWinnersRef : nablWinnersRef;
    const partsRef = isTs ? tsPartsRef : nablPartsRef;
    const setIsSpinning = isTs ? setIsSpinningTs : setIsSpinningNabl;
    const setIsAutoRunning = isTs ? setIsAutoRunningTs : setIsAutoRunningNabl;
    const refetchService = isTs ? refetchTs : refetchNabl;

    if (autoLockRef.current) return;
    autoLockRef.current = true;
    setIsDrawingActive(true);

    const currentPrizes = prizesRef.current || [];
    const currentWinners = winnersRef.current || [];
    const currentParts = partsRef.current || [];

    const prize = currentPrizes.find(p => Number(p.rank) === Number(targetRank));
    if (!prize) {
      autoLockRef.current = false;
      setIsDrawingActive(false);
      return;
    }

    if (activeService === targetServiceType) {
      setSelectedRank(targetRank);
    }

    // Only show countdown for Rank 1 if starting fresh
    if (Number(targetRank) === 1) {
      const countdownSession = {
        phase: 'COUNTDOWN',
        current_rank: targetRank,
        phase_started_at: new Date().toISOString(),
        phase_ends_at: new Date(Date.now() + 1000).toISOString()
      };
      await liveSessionService.upsertLiveSession(event.id, targetServiceType, countdownSession);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Direct Drawing Phase for instant digit card flip animation
    setIsSpinning(true);
    const drawingSession = {
      phase: 'DRAWING',
      current_rank: targetRank,
      phase_started_at: new Date().toISOString()
    };
    await liveSessionService.upsertLiveSession(event.id, targetServiceType, drawingSession);

    const availableParts = currentParts.filter(p => p.participating && Boolean(p.joined));
    const res = drawNextWinnerForRank(targetRank, prize.name || `Rank ${targetRank}`, availableParts, event.id, currentWinners);

    if (res.success && res.winner) {
      // Mark rank as drawn immediately in synchronous ref
      drawnRanksRef.current.add(Number(targetRank));

      if (activeService === targetServiceType && flipCardsRef.current?.spinToWinner) {
        flipCardsRef.current.spinToWinner(res.winner);
      }

      // Save & Publish winner to DB
      await winnerStorage.saveWinners(event.id, [res.winner], targetServiceType);
      await winnerStorage.publishWinners(event.id, null, targetServiceType);
      await refetchService();

      const winnerName = res.winner.customerName || res.winner.name || 'Winner';
      const luckyNo = res.winner.luckyNumber || res.winner.winningNumber || res.winner.invoiceNumber;

      // Revealed Phase
      const revealedSession = {
        phase: 'REVEALED',
        current_rank: targetRank,
        current_winner_lucky_number: String(luckyNo).padStart(3, '0'),
        current_winner_names: winnerName,
        last_completed_rank: targetRank,
        phase_started_at: new Date().toISOString()
      };
      await liveSessionService.upsertLiveSession(event.id, targetServiceType, revealedSession);

      toast.success(`${targetServiceType === 'TOTAL_STATION' ? 'Total Station' : 'NABL'} Rank ${targetRank} Winner: ${winnerName}!`);

      // Check if both services have completed all ranks
      const freshNablWinners = await winnerStorage.getWinners(event.id, 'NABL');
      const freshTsWinners = await winnerStorage.getWinners(event.id, 'TOTAL_STATION');

      const isNablDone = nablPrizesRef.current.length === 0 || freshNablWinners.length >= nablPrizesRef.current.length;
      const isTsDone = tsPrizesRef.current.length === 0 || freshTsWinners.length >= tsPrizesRef.current.length;

      if (isNablDone && isTsDone) {
        await eventStorage.saveEvent(event.id, { status: 'ENDED' });
        await winnerStorage.publishWinners(event.id, null, targetServiceType);
        const completedSession = { phase: 'COMPLETED', last_completed_rank: targetRank };
        await liveSessionService.upsertLiveSession(event.id, targetServiceType, completedSession);
        toast.success('All streams completed! Event OFFICIALLY ENDED 🎉');
        setIsAutoRunningNabl(false);
        setIsAutoRunningTs(false);
      } else if (isTs ? isTsDone : isNablDone) {
        setIsAutoRunning(false);
        toast.info(`${targetServiceType === 'TOTAL_STATION' ? 'Total Station' : 'NABL'} Stream Completed!`);
      }
    }

    setIsSpinning(false);
    // Hold revealed winner for 1.5 seconds, then immediately start next rank draw
    await new Promise(r => setTimeout(r, 1500));
    autoLockRef.current = false;
    setIsDrawingActive(false);
  };

  const handleConfirmAndEndEvent = () => {
    setEndConfirmOpen(true);
  };

  const handleExecuteEndEvent = async () => {
    if (!event) return;

    setIsEnding(true);
    try {
      await eventStorage.saveEvent(event.id, { status: 'ENDED' });
      await winnerStorage.publishWinners(event.id, null, activeService);
      const completedSession = { phase: 'COMPLETED' };
      await liveSessionService.upsertLiveSession(event.id, activeService, completedSession);
      toast.success('Event officially COMPLETED!');
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error('Failed to end event');
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-3 text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold tracking-wider text-amber-300">Loading Admin Live Control...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
          <AlertCircle size={38} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-bold mb-1">Event Not Found</h2>
          <button onClick={() => navigate('/admin/events')} className="mt-4 px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Mask winner data during countdown / preparation / next draw phases
  const isCurrentRankInCountdown = (session?.phase === 'BUILDUP' || session?.phase === 'COUNTDOWN' || session?.phase === 'NEXT_DRAW') && Number(session?.current_rank) === Number(selectedRank);

  const publishedRankWinners = isCurrentRankInCountdown
    ? []
    : winners.filter(w => Number(w.rank) === Number(selectedRank) || Number(w.winnerRank) === Number(selectedRank));

  const currentWinner = publishedRankWinners.length > 0 ? {
    customerName: Array.from(new Set(publishedRankWinners.map(w => w.customerName || w.name || w.customerNames))).join(', '),
    luckyNumber: publishedRankWinners[0]?.luckyNumber || publishedRankWinners[0]?.winningNumber || publishedRankWinners[0]?.invoiceNumber,
    rank: selectedRank
  } : null;

  const activeWinningNumber = isCurrentRankInCountdown
    ? null
    : (currentWinner?.luckyNumber || (Number(session?.current_rank) === Number(selectedRank) ? session?.current_winner_lucky_number : null));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full">
      {/* 5-Minute Pre-Live Countdown Banner */}
      {preLiveSeconds !== null && preLiveSeconds > 0 && (
        <div className="w-full bg-slate-900 text-white py-2 px-4 text-center font-bold text-xs flex items-center justify-center gap-2.5 border-b border-amber-500/30 sticky top-0 z-50 backdrop-blur-md">
          <Clock size={15} className="text-amber-400 animate-spin" />
          <span className="tracking-wide">
            OFFICIAL LIVE DRAW STARTING IN: <strong className="text-amber-300 font-mono text-xs ml-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">{Math.floor(preLiveSeconds / 60)}m {String(preLiveSeconds % 60).padStart(2, '0')}s</strong>
          </span>
        </div>
      )}

      {/* Admin Header Navbar */}
      <header className="w-full bg-[#0b1739] text-white px-3 sm:px-8 py-2.5 sm:py-3 border-b border-blue-900/40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <img 
            src={event?.logo || '/logo.jpg'} 
            alt="Company Logo" 
            className="h-8 sm:h-9 w-auto max-w-[100px] object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-xs shrink-0" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight text-white truncate max-w-[130px] sm:max-w-none">{event.name}</h1>
            <span className="text-[9px] font-extrabold tracking-widest text-amber-400 uppercase block truncate">
              {event.sponsor || 'Divine Empire'}
            </span>
          </div>
        </div>

        {/* Stream Switcher */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 border border-slate-700/80 p-0.5 sm:p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveService('NABL');
              setSelectedRank(1);
            }}
            className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              activeService === 'NABL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award size={13} className="text-blue-300 shrink-0" />
            <span>NABL <span className="hidden sm:inline">Stream</span> ({(event?.prizesNabl || event?.prizes || []).length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveService('TOTAL_STATION');
              setSelectedRank(1);
            }}
            className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
              activeService === 'TOTAL_STATION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={13} className="text-emerald-300 shrink-0" />
            <span>Total Station <span className="hidden sm:inline">Stream</span> ({(event?.prizesTs || event?.prizes || []).length})</span>
          </button>
        </div>
      </header>

      {/* Main Administrative Control Dashboard */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        
        {/* Central Live Control Card */}
        <div className="w-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 sm:p-5 border border-blue-800/50 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck size={13} /> CENTRAL SYNCHRONIZED DRAW CONTROLLER
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white break-words leading-tight">{event.name}</h2>
            <p className="text-xs text-slate-300">
              Active Stream: <strong className="text-amber-400">{activeService === 'TOTAL_STATION' ? 'Total Station' : 'NABL Calibration'}</strong> | Connected Participants: <strong className="text-emerald-400">{joinedParticipants.length}</strong>
            </p>
          </div>

          {allPrizesDrawn && !isCompleted && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleConfirmAndEndEvent}
                disabled={isEnding}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} />
                {isEnding ? 'Ending Event...' : 'Publish & Complete Event'}
              </button>
            </div>
          )}
        </div>

        {/* Phase Banners */}
        {session?.phase === 'BUILDUP' && (
          <div className="w-full bg-slate-900/90 border border-blue-800/60 rounded-2xl p-4 text-center text-white shadow-lg flex flex-col items-center justify-center gap-1.5 backdrop-blur-md">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              NEXT DRAW PREPARATION
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Preparing Rank {selectedRank} Winner Selection ({activePrize?.name || `Rank ${selectedRank}`})
            </h3>
          </div>
        )}

        {reverseCountdown !== null && reverseCountdown > 0 && (
          <div className="w-full bg-[#091330]/95 border border-amber-400/40 rounded-2xl p-5 text-center text-white shadow-xl flex flex-col items-center justify-center gap-1.5 backdrop-blur-xl">
            <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-400/30 px-3.5 py-0.5 rounded-full">
              REVEALING RANK {selectedRank} WINNER IN
            </span>
            <div className="text-5xl sm:text-6xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] my-1">
              00:0{reverseCountdown}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Synchronized Live Draw Engine</span>
          </div>
        )}

        {/* Flip Digit Cards Container */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <FlipDigitCards
            ref={flipCardsRef}
            isSpinningExternal={activeService === 'TOTAL_STATION' ? isSpinningTs : isSpinningNabl}
            participants={joinedParticipants}
            activeRank={selectedRank}
            prizeName={activePrize?.name || `Prize ${selectedRank}`}
            prizeImage={prizeImg}
            existingWinners={winners}
            winningLuckyNumber={activeWinningNumber}
          />
        </div>

        {/* Winner Details & Rank Switcher */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              <Trophy size={24} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={13} /> RANK {selectedRank} WINNER
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {currentWinner ? currentWinner.customerName : (session?.current_winner_names || 'Winner Pending...')}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Lucky Number: <strong className="text-slate-900 font-mono">#{currentWinner?.luckyNumber || activeWinningNumber || '---'}</strong> | Prize: <strong className="text-slate-900">{activePrize?.name || 'Grand Prize'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {prizes.map(p => {
              const isSelected = Number(selectedRank) === Number(p.rank);
              const pWinner = winners.find(w => Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank));

              return (
                <button
                  key={p.rank}
                  type="button"
                  disabled={isDrawingActive}
                  onClick={() => !isDrawingActive && setSelectedRank(p.rank)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isDrawingActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isSelected ? 'bg-blue-900 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:bg-slate-200 font-semibold'
                  }`}
                >
                  <span>Rank {p.rank}</span>
                  {pWinner && <Check size={12} className="text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prizes Grid */}
        <div className="w-full space-y-3 pt-1">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-[11px] uppercase tracking-widest px-4 py-1 rounded-full">
              OFFICIAL PRIZE REWARDS ({prizes.length} RANKS)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full">
            {prizes.map(p => {
              const pWinners = winners.filter(w => Number(w.rank) === Number(p.rank) || Number(w.winnerRank) === Number(p.rank) || w.prizeName === p.name);
              const winnerNames = pWinners.map(w => w.customerName || w.name || w.customerNames).filter(Boolean);
              const winnerText = Array.from(new Set(winnerNames)).join(', ');
              const img = p.image || p.img || p.picture || p.logo;

              return (
                <div key={p.rank} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative">
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="bg-slate-900 text-amber-400 border border-slate-700/80 font-black text-xs px-2.5 py-0.5 rounded-lg shadow-xs">
                      Rank {p.rank}
                    </span>
                  </div>

                  <div className="w-full h-32 sm:h-36 bg-gradient-to-b from-slate-50 to-slate-100/60 p-3 flex items-center justify-center relative overflow-hidden">
                    {img ? (
                      <img src={img} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Gift size={28} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="bg-slate-900 border-t border-slate-800 py-2 px-2.5 text-center text-white font-bold text-xs uppercase tracking-wider truncate">
                      {p.name || `Rank ${p.rank} Prize`}
                    </div>
                    {winnerText ? (
                      <div className="w-full bg-amber-500/10 border-t border-amber-500/30 py-1.5 px-2.5 text-center text-slate-900 font-extrabold text-xs truncate flex items-center justify-center gap-1.5">
                        <Trophy size={13} className="text-amber-600 shrink-0" />
                        <span className="truncate">{winnerText}</span>
                      </div>
                    ) : (
                      <div className="w-full bg-slate-50 border-t border-slate-200/80 py-1.5 px-2.5 text-center text-slate-400 font-semibold text-[11px] truncate">
                        Pending Draw...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* End Event Confirm Modal */}
        <ConfirmModal
          isOpen={endConfirmOpen}
          title="Publish & Complete Event"
          message="Are you sure you want to officially mark this live draw as COMPLETED for all participants?"
          confirmText="Complete Event"
          cancelText="Cancel"
          type="info"
          onConfirm={handleExecuteEndEvent}
          onClose={() => setEndConfirmOpen(false)}
        />
      </main>
    </div>
  );
};
