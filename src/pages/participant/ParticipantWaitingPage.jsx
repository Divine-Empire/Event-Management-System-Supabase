import React from 'react';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { ParticipantEventShell, ParticipantStatusCard } from '@/components/participant/ParticipantEventShell';
import { useParticipantEvent } from '@/context/ParticipantEventContext';
import { EVENT_STATUS } from '@/utils/eventStatus';

export const ParticipantWaitingPage = () => {
  const { verifiedParticipant, isRefreshing, handleRefreshStatus, computedStatus } = useParticipantEvent();

  return (
    <ParticipantEventShell>
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col gap-4">
        <ParticipantStatusCard />

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
          <div className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md">
            <Clock size={28} />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">Waiting for Admin Approval</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mt-1">
              Your lucky number has been saved successfully. Please wait for the event organizer to approve your participation.
            </p>
          </div>

          <div className="w-full max-w-md bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
            <ShieldCheck size={16} className="text-amber-600" />
            Your entry is submitted and locked.
          </div>

          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={!verifiedParticipant || isRefreshing}
            className="bg-blue-900 hover:bg-blue-800 text-white font-black px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Checking Approval...' : 'Check Approval Status'}
          </button>

          {computedStatus === EVENT_STATUS.ENDED && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Event has ended. Approved participants can still view the live results.
            </div>
          )}
        </div>
      </div>
    </ParticipantEventShell>
  );
};
