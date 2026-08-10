import React from 'react';
import { ArrowRight, Calendar, LogOut, Lock, Sparkles, Ticket, Trophy, UserCheck } from 'lucide-react';
import { useParticipantEvent } from '@/context/ParticipantEventContext';
import { EVENT_STATUS } from '@/utils/eventStatus';
import { formatDateTime } from '@/utils/formatters';

export const ParticipantEventShell = ({ children, showPrizePreview = true }) => {
  const {
    event,
    verifiedParticipant,
    computedStatus,
    handleGoToLive,
    handleLogout,
    prizesNabl,
    prizesTs
  } = useParticipantEvent();

  if (!event) return children;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col w-full">
      <header className="w-full bg-[#0b1739] text-white px-3 sm:px-8 py-2.5 sm:py-3 border-b border-blue-900/40 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img 
            src={event?.logo || '/logo.jpg'} 
            alt="Company Logo" 
            className="h-8 sm:h-9 w-auto max-w-[100px] object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-xs shrink-0" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight leading-tight text-white truncate max-w-[130px] sm:max-w-none">{event.name}</h1>
            <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block truncate">
              {event?.sponsor || 'Divine Empire'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {verifiedParticipant ? (
            <>
              {verifiedParticipant.luckyNumber ? (
                <div className="bg-amber-500/10 border border-amber-400/30 text-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs">
                  <Ticket size={13} className="text-amber-400 shrink-0" />
                  <span>#{verifiedParticipant.luckyNumber}</span>
                </div>
              ) : (
                <div className="bg-purple-500/10 border border-purple-400/30 text-purple-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs">
                  <Sparkles size={13} className="text-amber-400 shrink-0" />
                  <span>Selecting Number</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 text-[11px] font-bold shadow-xs">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                  {(verifiedParticipant.customerName || verifiedParticipant.name || 'P').charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-200 hidden sm:inline max-w-[100px] truncate">{verifiedParticipant.customerName || verifiedParticipant.name}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Logout / Change Account"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <span className="bg-blue-500/10 border border-blue-400/30 text-blue-300 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0 whitespace-nowrap">
              Participant Verification
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {(computedStatus === EVENT_STATUS.LIVE || computedStatus === EVENT_STATUS.ENDED) && (
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 text-amber-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Trophy size={18} className="text-amber-600" />
                {computedStatus === EVENT_STATUS.ENDED ? 'Event Lucky Draw Completed' : 'Live Lucky Draw In Progress!'}
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                {computedStatus === EVENT_STATUS.ENDED
                  ? 'All prize winners have been officially announced. View live results.'
                  : 'The live prize reveal is underway right now! Check the live portal for winning numbers.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoToLive}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
            >
              <span>Go to Live Portal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-5 shadow-lg border border-blue-800/60 relative overflow-hidden flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full inline-block">
                {event.sponsor || 'Divine Empire Event'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">{event.name}</h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
                {event.description || `Welcome to ${event.name}! Register your details and choose your 3-digit lucky number to participate in our exclusive live prize draw.`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl text-xs text-slate-200 font-semibold shrink-0 self-start">
              <Calendar size={14} className="text-amber-400 shrink-0" />
              <span>
                Live Draw: <strong>
                  {verifiedParticipant?.serviceType === 'TOTAL_STATION'
                    ? formatDateTime(event.liveDateTimeTs || event.liveDateTime || `${event.liveDate}T${event.liveTime}`)
                    : formatDateTime(event.liveDateTimeNabl || event.liveDateTime || `${event.liveDate}T${event.liveTime}`)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {children}

        {showPrizePreview && verifiedParticipant && (
          <ParticipantPrizePreview
            serviceType={verifiedParticipant.serviceType}
            prizesNabl={prizesNabl}
            prizesTs={prizesTs}
          />
        )}
      </main>
    </div>
  );
};

export const ParticipantPrizePreview = ({ serviceType, prizesNabl = [], prizesTs = [] }) => (
  <>
    {serviceType !== 'TOTAL_STATION' && prizesNabl.length > 0 && (
      <div className="bg-white border border-blue-200 rounded-3xl p-5 shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          <h2 className="text-sm font-bold text-blue-950">NABL Lab Calibration Prizes (5 Winners)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {prizesNabl.map((prize) => (
            <div key={prize.rank} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-extrabold shrink-0 text-xs">
                R{prize.rank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Rank {prize.rank}</p>
                <p className="text-xs font-bold text-slate-900 truncate">{prize.name || prize.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {serviceType === 'TOTAL_STATION' && prizesTs.length > 0 && (
      <div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-emerald-600" />
          <h2 className="text-sm font-bold text-emerald-950">Total Station Calibration Prizes (5 Winners)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {prizesTs.map((prize) => (
            <div key={prize.rank} className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-extrabold shrink-0 text-xs">
                R{prize.rank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Rank {prize.rank}</p>
                <p className="text-xs font-bold text-slate-900 truncate">{prize.name || prize.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);

export const ParticipantStatusCard = () => {
  const { verifiedParticipant } = useParticipantEvent();
  if (!verifiedParticipant) return null;

  return (
    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-emerald-500 text-white rounded-xl">
          <UserCheck size={20} />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">{verifiedParticipant.customerName}</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Mobile: <span className="font-mono text-slate-700">{verifiedParticipant.mobile}</span> | Invoice:
            <span className="font-mono font-bold text-blue-900">#{verifiedParticipant.invoiceNumber}</span>
          </p>
        </div>
      </div>

      <span className={`text-[11px] px-3 py-1 rounded-full font-extrabold border shrink-0 ${
        verifiedParticipant.serviceType === 'TOTAL_STATION'
          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
          : 'bg-blue-100 border-blue-300 text-blue-950'
      }`}>
        {verifiedParticipant.serviceType === 'TOTAL_STATION' ? 'Total Station Service' : 'NABL Service'}
      </span>
    </div>
  );
};

export const ParticipantBlockedNotice = () => {
  const { computedStatus, handleGoToLive } = useParticipantEvent();
  if (computedStatus !== EVENT_STATUS.LIVE && computedStatus !== EVENT_STATUS.ENDED) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
      <div className="py-6 px-4 text-center flex flex-col items-center gap-3">
        <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
          <Lock size={28} />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">
          {computedStatus === EVENT_STATUS.ENDED ? 'Joining Closed — Event Ended' : 'Joining Closed — Live Draw in Progress'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md">
          Participant registration and lucky number selection for this event are now closed. You can view the live draw results and winner announcements on the live page.
        </p>
        <button
          type="button"
          onClick={handleGoToLive}
          className="mt-2 bg-blue-900 hover:bg-blue-800 text-white font-black px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>View Live Draw Portal</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
