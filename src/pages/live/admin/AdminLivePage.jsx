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
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  const flipCardsRef = useRef(null);
  const autoLockRef = useRef(false);
  const drawnRanksRef = useRef(new Set());

  const { event, prizes, participants, winners, session, isLoading, refetch } = useLiveSession(id, null, activeService);
  const { preLiveSeconds, reverseCountdown } = useLiveClock(event, session?.phase_ends_at, activeService);
  const { drawNextWinnerForRank } = useDrawStore();

  const joinedParticipants = participants.filter(p => p.participating && (p.joined || (p.luckyNumber && String(p.luckyNumber).trim() !== '')));
  const activePrize = prizes.find(p => Number(p.rank) === Number(selectedRank)) || prizes[0];
  const prizeImg = activePrize?.image || activePrize?.img || activePrize?.picture || activePrize?.logo || '';

  const computedStatus = computeEventStatus(event, winners, prizes);
  const allPrizesDrawn = prizes.length > 0 && winners.length >= prizes.length;
  const isCompleted = computedStatus === EVENT_STATUS.ENDED;

  // Latest state references for async auto-loop safety
  const winnersRef = useRef(winners);
  const prizesRef = useRef(prizes);
  const participantsRef = useRef(participants);
  const sessionRef = useRef(session);

  useEffect(() => { 
    winnersRef.current = winners; 
    const drawn = new Set();
    (winners || []).forEach(w => {
      const r = Number(w.winnerRank || w.rank);
      if (r) drawn.add(r);
    });
    drawnRanksRef.current = drawn;
  }, [winners, activeService]);
  useEffect(() => { prizesRef.current = prizes; }, [prizes]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Automatically enable auto-running if live time is reached
  useEffect(() => {
    if (!event || isCompleted) return;
    const checkLiveTime = () => {
      const liveMs = getLiveMs(event, activeService);
      if (liveMs > 0 && Date.now() >= liveMs && !allPrizesDrawn) {
        setIsAutoRunning(true);
      }
    };
    checkLiveTime();
    const interval = setInterval(checkLiveTime, 1000);
    return () => clearInterval(interval);
  }, [event, activeService, isCompleted, allPrizesDrawn]);

  // Centralized Draw Trigger Action
  const triggerDrawForRank = async (targetRank) => {
    if (autoLockRef.current || isSpinning) return;
    autoLockRef.current = true;

    const currentPrizes = prizesRef.current || [];
    const currentWinners = winnersRef.current || [];
    const currentParts = participantsRef.current || [];

    const prize = currentPrizes.find(p => Number(p.rank) === Number(targetRank));
    if (!prize) {
      autoLockRef.current = false;
      return;
    }

    setSelectedRank(targetRank);

    // 1. Build Up Phase (2 seconds)
    const buildUpSession = {
      phase: 'BUILDUP',
      current_rank: targetRank,
      total_ranks: currentPrizes.length,
      phase_started_at: new Date().toISOString()
    };
    await liveSessionService.upsertLiveSession(event.id, activeService, buildUpSession);
    await new Promise(r => setTimeout(r, 2000));

    // 2. Reverse Countdown Phase (5 seconds)
    const phaseEndsAt = new Date(Date.now() + 5000).toISOString();
    const countdownSession = {
      phase: 'COUNTDOWN',
      current_rank: targetRank,
      phase_started_at: new Date().toISOString(),
      phase_ends_at: phaseEndsAt
    };
    await liveSessionService.upsertLiveSession(event.id, activeService, countdownSession);
    await new Promise(r => setTimeout(r, 5000));

    // 3. Drawing Phase
    setIsSpinning(true);
    const drawingSession = {
      phase: 'DRAWING',
      current_rank: targetRank,
      phase_started_at: new Date().toISOString()
    };
    await liveSessionService.upsertLiveSession(event.id, activeService, drawingSession);

    const availableParts = currentParts.filter(p => p.participating && (p.joined || (p.luckyNumber && String(p.luckyNumber).trim() !== '')));
    const res = drawNextWinnerForRank(targetRank, prize.name || `Rank ${targetRank}`, availableParts, event.id, currentWinners);

    if (res.success && res.winner) {
      // Mark rank as drawn immediately in synchronous ref
      drawnRanksRef.current.add(Number(targetRank));

      if (flipCardsRef.current?.spinToWinner) {
        flipCardsRef.current.spinToWinner(res.winner);
      }

      // Save & Publish winner to DB
      await winnerStorage.saveWinners(event.id, [res.winner], activeService);
      await winnerStorage.publishWinners(event.id, null, activeService);
      await refetch();

      const winnerName = res.winner.customerName || res.winner.name || 'Winner';
      const luckyNo = res.winner.luckyNumber || res.winner.winningNumber || res.winner.invoiceNumber;

      // 4. Revealed Phase
      const revealedSession = {
        phase: 'REVEALED',
        current_rank: targetRank,
        current_winner_lucky_number: String(luckyNo).padStart(3, '0'),
        current_winner_names: winnerName,
        last_completed_rank: targetRank,
        phase_started_at: new Date().toISOString()
      };
      await liveSessionService.upsertLiveSession(event.id, activeService, revealedSession);

      toast.success(`Rank ${targetRank} Winner: ${winnerName}!`);

      // Check if all ranks are drawn
      const freshWinners = await winnerStorage.getWinners(event.id, activeService);
      if (currentPrizes.length > 0 && freshWinners.length >= currentPrizes.length) {
        await eventStorage.saveEvent(event.id, { status: 'ENDED' });
        await winnerStorage.publishWinners(event.id, null, activeService);
        const completedSession = { phase: 'COMPLETED', last_completed_rank: targetRank };
        await liveSessionService.upsertLiveSession(event.id, activeService, completedSession);
        toast.success('All winners revealed! Event COMPLETED');
        setIsAutoRunning(false);
      }
    }

    setIsSpinning(false);
    // Hold revealed winner for 4 seconds before unlocking next rank
    await new Promise(r => setTimeout(r, 4000));
    autoLockRef.current = false;
  };

  // Central Automatic Loop
  useEffect(() => {
    if (!event || isCompleted) return;

    const autoLoop = async () => {
      const liveMs = getLiveMs(event, activeService);
      if (liveMs > 0 && Date.now() < liveMs) return; // Not live time yet

      if (!isAutoRunning) return;
      if (autoLockRef.current || isSpinning) return;
      
      const currentPhase = sessionRef.current?.phase;
      if (currentPhase === 'BUILDUP' || currentPhase === 'COUNTDOWN' || currentPhase === 'DRAWING') return;

      const currentPrizes = prizesRef.current || [];
      const currentWinners = winnersRef.current || [];

      const sortedPrizes = [...currentPrizes].sort((a, b) => Number(a.rank) - Number(b.rank));
      const unrevealedPrize = sortedPrizes.find(p => {
        const pRank = Number(p.rank);
        if (drawnRanksRef.current.has(pRank)) return false;
        const hasW = currentWinners.some(w => Number(w.rank) === pRank || Number(w.winnerRank) === pRank);
        return !hasW;
      });

      if (!unrevealedPrize) {
        setIsAutoRunning(false);
        return;
      }

      await triggerDrawForRank(unrevealedPrize.rank);
    };

    const interval = setInterval(autoLoop, 1500);
    return () => clearInterval(interval);
  }, [event, activeService, isAutoRunning, isCompleted, isSpinning]);

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

  const publishedRankWinners = winners.filter(w => Number(w.rank) === Number(selectedRank) || Number(w.winnerRank) === Number(selectedRank));
  const currentWinner = publishedRankWinners.length > 0 ? {
    customerName: Array.from(new Set(publishedRankWinners.map(w => w.customerName || w.name || w.customerNames))).join(', '),
    luckyNumber: publishedRankWinners[0]?.luckyNumber || publishedRankWinners[0]?.winningNumber || publishedRankWinners[0]?.invoiceNumber,
    rank: selectedRank
  } : null;

  const activeWinningNumber = currentWinner?.luckyNumber || (Number(session?.current_rank) === Number(selectedRank) ? session?.current_winner_lucky_number : null);

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
            isSpinningExternal={isSpinning}
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
                  onClick={() => setSelectedRank(p.rank)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
