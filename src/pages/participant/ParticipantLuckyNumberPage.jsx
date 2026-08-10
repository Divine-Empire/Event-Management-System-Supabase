import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { ParticipantEventShell, ParticipantStatusCard } from '@/components/participant/ParticipantEventShell';
import { useParticipantEvent } from '@/context/ParticipantEventContext';

export const ParticipantLuckyNumberPage = () => {
  const {
    verifiedParticipant,
    digitInputs,
    isJoining,
    handleConfirmLuckyNumber,
    handleDigitChange,
    handleDigitKeyDown,
    handleDigitPaste
  } = useParticipantEvent();

  if (!verifiedParticipant) {
    return null;
  }

  return (
    <ParticipantEventShell>
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col gap-4">
        <ParticipantStatusCard />

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-7 flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3.5">
            <div className="p-2.5 bg-amber-100 border border-amber-200 rounded-2xl text-amber-900 shrink-0">
              <Sparkles size={22} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">Enter Your 3-Digit Lucky Number</h3>
              <p className="text-xs text-slate-500 font-medium">Type each digit (0 to 9) into the fields below to select your lucky number (000 – 999)</p>
            </div>
          </div>

          <form onSubmit={handleConfirmLuckyNumber} className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-3 sm:gap-5 py-2">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {idx === 0 ? '1st Digit' : idx === 1 ? '2nd Digit' : '3rd Digit'}
                  </span>
                  <input
                    id={`lucky-digit-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digitInputs[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={handleDigitPaste}
                    placeholder="0"
                    className="w-16 h-20 sm:w-24 sm:h-28 text-3xl sm:text-5xl font-black font-mono text-center text-purple-950 bg-white border-2 border-purple-200 rounded-2xl shadow-md focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all placeholder-slate-300"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isJoining || digitInputs.some((digit) => digit === '')}
              className="w-full max-w-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Submitting...' : 'Submit'}
            </button>

            <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2 max-w-md text-center sm:text-left">
              <Lock size={14} className="shrink-0 text-amber-600" />
              Note: Once saved, your lucky number will be permanently locked and submitted for admin verification.
            </p>
          </form>
        </div>
      </div>
    </ParticipantEventShell>
  );
};
