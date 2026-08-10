import React from 'react';
import { Download, CheckCircle2, ShieldCheck, Ticket, FileText } from 'lucide-react';
import { ParticipantEventShell, ParticipantStatusCard } from '@/components/participant/ParticipantEventShell';
import { useParticipantEvent } from '@/context/ParticipantEventContext';

export const ParticipantSubmissionPage = () => {
  const { verifiedParticipant, handleDownloadPass } = useParticipantEvent();

  if (!verifiedParticipant?.luckyNumber) {
    return null;
  }

  return (
    <ParticipantEventShell>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-4">
        <ParticipantStatusCard />

        <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 sm:p-8 flex flex-col items-center gap-5 text-center">
          {/* Status Badge */}
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-2xs">
            <CheckCircle2 size={26} strokeWidth={2.5} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Registration & Lucky Number Verified
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
              Your lucky number has been permanently saved in our system. Please download your official entry pass ticket below as proof of registration.
            </p>
          </div>

          {/* Official Pass Ticket Box */}
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border border-blue-900/60 flex flex-col items-center gap-3 shadow-md w-full max-w-md relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-0.5 rounded-full">
              <ShieldCheck size={12} className="shrink-0" />
              <span>Official Entry Pass Ticket</span>
            </div>

            <div className="py-1">
              <span className="text-4xl sm:text-5xl font-mono font-black text-amber-300 tracking-widest drop-shadow-xs">
                #{verifiedParticipant.luckyNumber}
              </span>
            </div>

            <div className="w-full border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
              <span className="truncate">{verifiedParticipant.customerName || verifiedParticipant.name}</span>
              <span className="font-mono font-bold text-slate-300">Invoice #{verifiedParticipant.invoiceNumber}</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="w-full max-w-md pt-1">
            <button
              type="button"
              onClick={() => handleDownloadPass('pdf')}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
            >
              <FileText size={16} className="text-amber-400" />
              <span>Download Entry Pass (PDF)</span>
              <Download size={15} className="ml-auto opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </ParticipantEventShell>
  );
};
