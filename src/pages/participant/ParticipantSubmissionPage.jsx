import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { ParticipantEventShell, ParticipantStatusCard } from '@/components/participant/ParticipantEventShell';
import { useParticipantEvent } from '@/context/ParticipantEventContext';

export const ParticipantSubmissionPage = () => {
  const { verifiedParticipant, handleDownloadPass } = useParticipantEvent();

  if (!verifiedParticipant?.luckyNumber) {
    return null;
  }

  return (
    <ParticipantEventShell>
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col gap-4">
        <ParticipantStatusCard />

        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-5 text-center text-emerald-950">
          <div className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-md">
            <Sparkles size={28} />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-emerald-950">Registration & Lucky Number Submitted! 🎉</h3>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium max-w-md mt-1">
              Your lucky number has been permanently saved and submitted for verification. Please download your official entry pass ticket below as proof of entry.
            </p>
          </div>

          <div className="bg-purple-950 text-white p-5 rounded-2xl border border-purple-800 flex flex-col items-center gap-1.5 shadow-lg w-full max-w-sm">
            <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-widest">Your Permanent Lucky Number</span>
            <span className="text-4xl font-mono font-black text-amber-300 tracking-wider">#{verifiedParticipant.luckyNumber}</span>
          </div>

          <div className="flex items-center justify-center w-full max-w-sm pt-2">
            <button
              type="button"
              onClick={() => handleDownloadPass('pdf')}
              className="w-full bg-purple-950 hover:bg-purple-900 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer shadow-md transition-all active:scale-[0.99]"
            >
              <Download size={18} className="text-amber-400" />
              <span>Download Pass (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </ParticipantEventShell>
  );
};
