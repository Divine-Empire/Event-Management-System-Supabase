import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveSession } from '@/hooks/useLiveSession';
import { useLiveClock } from '@/hooks/useLiveClock';
import { computeEventStatus, getLiveMs, EVENT_STATUS } from '@/utils/eventStatus';
import { liveSessionService } from '@/services/liveSessionService';
import { eventStorage } from '@/services/eventStorage';
import { winnerStorage } from '@/services/winnerStorage';
import { useDrawStore } from '@/stores/drawStore';
import { FlipDigitCards } from '@/components/draw/FlipDigitCards';
import confetti from 'canvas-confetti';
import { Trophy, Users, LogOut, CheckCircle, Ticket, Sparkles, Gift, Clock, AlertCircle, Flame, Check } from 'lucide-react';
import { toast } from 'sonner';

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

export const ParticipantLivePage = () => {
  const { token, id } = useParams();
  const navigate = useNavigate();

  // Retrieve exact participant from tab-isolated storage
  const getLoggedParticipant = () => {
    try {
      let raw = null;
      if (id) raw = sessionStorage.getItem(`dei_logged_participant_${id}`);
      if (!raw) raw = sessionStorage.getItem('dei_current_participant');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading logged participant:', e);
    }
    return null;
  };

  const loggedUser = getLoggedParticipant();
  const serviceType = loggedUser?.serviceType === 'TOTAL_STATION' ? 'TOTAL_STATION' : 'NABL';

  const { event, prizes, participants, winners, session, isLoading, refetch } = useLiveSession(id, token, serviceType);
  const { preLiveSeconds, reverseCountdown } = useLiveClock(event, session?.phase_ends_at, serviceType);
  const { drawNextWinnerForRank } = useDrawStore();

  const [selectedRank, setSelectedRank] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const flipCardsRef = useRef(null);
  const autoLockRef = useRef(false);

  const winnersRef = useRef(winners);
  const prizesRef = useRef(prizes);
  const participantsRef = useRef(participants);

  useEffect(() => { winnersRef.current = winners; }, [winners]);
  useEffect(() => { prizesRef.current = prizes; }, [prizes]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  useEffect(() => {
    if (session?.current_rank) {
      setSelectedRank(session.current_rank);
    }
  }, [session?.current_rank]);

  const joinedParticipants = participants.filter(p => p.participating && (p.joined || (p.luckyNumber && String(p.luckyNumber).trim() !== '')));
  const currentLoggedUser = participants.find(p => p.id === loggedUser?.id || p.invoiceNumber === loggedUser?.invoiceNumber) || loggedUser;

  const rawTicket = currentLoggedUser?.luckyNumber || currentLoggedUser?.invoiceNumber || joinedParticipants[0]?.luckyNumber || '001';
  const ticketNo = String(rawTicket).padStart(3, '0');
  const customerName = currentLoggedUser?.customerName || currentLoggedUser?.name || joinedParticipants[0]?.customerName || 'Participant';

  const activePrize = prizes.find(p => Number(p.rank) === Number(selectedRank)) || prizes[0];
  const prizeImg = activePrize?.image || activePrize?.img || activePrize?.picture || activePrize?.logo || '';

  const computedStatus = computeEventStatus(event, winners, prizes);
  const isCompleted = computedStatus === EVENT_STATUS.ENDED || session?.phase === 'COMPLETED';

  const handleLogout = () => {
    try {
      if (event?.id) {
        sessionStorage.removeItem(`dei_logged_participant_${event.id}`);
        localStorage.removeItem(`dei_logged_participant_${event.id}`);
      }
      sessionStorage.removeItem('dei_current_participant');
      localStorage.removeItem('dei_current_participant');
    } catch (e) {}
    toast.success('Exited live portal');
    if (token) navigate(`/event/${token}`);
    else navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-3 text-white">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold tracking-wider text-amber-300">Connecting to Live Draw Stream...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl text-white">
          <AlertCircle size={44} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-xl font-bold mb-1">Event Not Found</h2>
          <p className="text-slate-400 text-xs mb-4">The event link you followed is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const publishedRankWinners = winners.filter(w => Number(w.rank) === Number(selectedRank) || Number(w.winnerRank) === Number(selectedRank));
  const currentWinner = publishedRankWinners.length > 0 ? {
    customerName: Array.from(new Set(publishedRankWinners.map(w => w.customerName || w.name || w.customerNames))).join(', '),
    luckyNumber: publishedRankWinners[0]?.luckyNumber || publishedRankWinners[0]?.winningNumber || publishedRankWinners[0]?.invoiceNumber
  } : null;

  const activeWinningNumber = currentWinner?.luckyNumber || (Number(session?.current_rank) === Number(selectedRank) ? session?.current_winner_lucky_number : null);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full">
      {/* 1. PROFESSIONAL 5-MINUTE PRE-LIVE COUNTDOWN BANNER */}
      {preLiveSeconds !== null && preLiveSeconds > 0 && (
        <div className="w-full bg-slate-900 text-white py-2.5 px-4 text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-3 border-b border-amber-500/30 sticky top-0 z-50 backdrop-blur-md">
          <Clock size={16} className="text-amber-400 animate-spin" />
          <span className="tracking-wide">
            OFFICIAL LIVE DRAW STARTING IN: <strong className="text-amber-300 font-mono text-sm ml-1.5 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30">{Math.floor(preLiveSeconds / 60)}m {String(preLiveSeconds % 60).padStart(2, '0')}s</strong>
          </span>
        </div>
      )}

      {/* 2. PARTICIPANT HEADER NAVBAR */}
      <header className="w-full bg-[#0b1739] text-white px-3.5 sm:px-8 py-2.5 sm:py-3 border-b border-blue-900/40 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src={event?.logo || '/logo.jpg'} 
            alt="Company Logo" 
            className="h-8 sm:h-9 w-auto max-w-[100px] object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-xs shrink-0" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight text-white truncate max-w-[140px] sm:max-w-none">{event.name}</h1>
            <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block truncate">
              {event.sponsor || 'Divine Empire'}
            </span>
          </div>
        </div>

        {/* Stream Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${
            serviceType === 'TOTAL_STATION'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
          }`}>
            {serviceType === 'TOTAL_STATION' ? 'Total Station Live Stream' : 'NABL Calibration Live Stream'}
          </span>
        </div>

        {/* Participant Ticket & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden xs:flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 text-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <Ticket size={12} className="text-amber-400" />
            <span>#{ticketNo}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 sm:px-3 py-1 rounded-full border border-slate-700 text-[11px] sm:text-xs font-bold">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px] sm:text-[11px] shrink-0">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-200 truncate max-w-[70px] sm:max-w-[120px]">{customerName}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Exit Live Portal"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 3. MAIN LIVE DISPLAY CONTAINER */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        
        {/* HERO BANNER CARD */}
        <div className="w-full bg-gradient-to-b from-[#0d1b46] via-[#0c183d] to-[#0a1330] rounded-2xl p-4 sm:p-5 border border-blue-800/50 shadow-xl text-white relative overflow-hidden flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isCompleted ? 'bg-emerald-500 text-slate-950' :
                  session?.phase === 'DRAWING' || session?.phase === 'COUNTDOWN' ? 'bg-red-600 text-white animate-pulse' :
                  'bg-blue-600 text-white'
                }`}>
                  <CheckCircle size={12} />
                  {isCompleted ? 'EVENT COMPLETED' :
                   session?.phase === 'DRAWING' ? 'LIVE DRAW IN PROGRESS' :
                   session?.phase === 'COUNTDOWN' ? 'COUNTDOWN RUNNING' : 'LIVE PORTAL CONNECTED'}
                </span>

                <span className="bg-slate-800/80 text-slate-200 border border-slate-700/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <Users size={12} className="text-blue-400" />
                  {joinedParticipants.length} Participants
                </span>
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight break-words leading-tight">{event.name}</h2>
              <p className="text-xs text-slate-300 font-medium truncate">{event.description || 'Select your lucky number and win'}</p>
            </div>

            {/* Reserved Ticket Box */}
            <div className="bg-[#142354]/90 border border-blue-700/40 rounded-xl p-3 px-3.5 flex items-center gap-3 w-full sm:w-auto min-w-0 sm:min-w-[200px] shadow-md shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                <Ticket size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 block truncate">
                  YOUR LUCKY NUMBER
                </span>
                <div className="text-lg sm:text-xl font-black text-white font-mono leading-tight">#{ticketNo}</div>
                <div className="text-xs text-slate-300 font-semibold truncate">{customerName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. PHASE BANNERS */}
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

        {/* 5. REVERSE COUNTDOWN DISPLAY */}
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

        {/* 6. MECHANICAL FLIP CARD CONTAINER */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <FlipDigitCards
            ref={flipCardsRef}
            isSpinningExternal={session?.phase === 'DRAWING'}
            participants={joinedParticipants}
            activeRank={selectedRank}
            prizeName={activePrize?.name || `Prize ${selectedRank}`}
            prizeImage={prizeImg}
            existingWinners={winners}
            winningLuckyNumber={activeWinningNumber}
          />
        </div>

        {/* 7. WINNER ANNOUNCEMENT DISPLAY */}
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
              const isLiveDrawActive = session?.phase === 'BUILDUP' || session?.phase === 'COUNTDOWN' || session?.phase === 'DRAWING';

              return (
                <button
                  key={p.rank}
                  type="button"
                  disabled={isLiveDrawActive}
                  onClick={() => !isLiveDrawActive && setSelectedRank(p.rank)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isLiveDrawActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
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

        {/* 8. PRIZES GRID CARDS */}
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

      </main>
    </div>
  );
};
