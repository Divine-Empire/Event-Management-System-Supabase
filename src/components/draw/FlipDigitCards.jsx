import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCw, Gift } from 'lucide-react';

export const FlipDigitCards = forwardRef(({
  participants = [],
  activeRank = 1,
  prizeName = 'Grand Prize',
  prizeImage = '',
  existingWinners = [],
  isSpinningExternal = false
}, ref) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentDigits, setCurrentDigits] = useState(['0', '0', '0']);
  const [lockedDigits, setLockedDigits] = useState([false, false, false]);

  // Filter out participants who have already won
  const winningNumbers = new Set(existingWinners.map(w => String(w.luckyNumber || w.winningNumber || w.invoiceNo || w.invoiceNumber)));
  const eligibleParticipants = participants.filter(p => !winningNumbers.has(String(p.luckyNumber || p.invoiceNumber || p.invoiceNo)));

  // Format number into 3 digits (e.g., '7' -> '007', '57' -> '057')
  const formatInvoiceDigits = (num) => {
    const raw = String(num || '000').padStart(3, '0');
    return raw.slice(-3).split('');
  };

  const spinToWinner = (targetWinner) => {
    if (isFlipping) return;
    setIsFlipping(true);
    setLockedDigits([false, false, false]);

    const winnerNum = targetWinner?.luckyNumber || targetWinner?.winningNumber || targetWinner?.invoiceNumber || targetWinner?.invoiceNo || '000';
    const targetDigits = formatInvoiceDigits(winnerNum);

    // Rapid random digit roller interval
    const rollInterval = setInterval(() => {
      setCurrentDigits(prev => [
        lockedDigits[0] ? targetDigits[0] : String(Math.floor(Math.random() * 10)),
        lockedDigits[1] ? targetDigits[1] : String(Math.floor(Math.random() * 10)),
        lockedDigits[2] ? targetDigits[2] : String(Math.floor(Math.random() * 10))
      ]);
    }, 60);

    // Step 1: Lock Digit 1 at 1.0s
    setTimeout(() => {
      setLockedDigits([true, false, false]);
      setCurrentDigits(prev => [targetDigits[0], prev[1], prev[2]]);
    }, 1000);

    // Step 2: Lock Digit 2 at 1.8s
    setTimeout(() => {
      setLockedDigits([true, true, false]);
      setCurrentDigits(prev => [targetDigits[0], targetDigits[1], prev[2]]);
    }, 1800);

    // Step 3: Lock Digit 3 at 2.6s & Finish
    setTimeout(() => {
      clearInterval(rollInterval);
      setLockedDigits([true, true, true]);
      setCurrentDigits(targetDigits);
      setIsFlipping(false);
    }, 2600);
  };

  useImperativeHandle(ref, () => ({
    spinToWinner
  }));

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-4xl mx-auto">
      {/* Mechanical Flip Container Card */}
      <div className="w-full bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 rounded-3xl p-6 sm:p-8 border border-blue-900/60 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
        
        {/* Background glow & accents */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Badge */}
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[11px] uppercase tracking-widest px-4 py-1 rounded-full flex items-center gap-2 mb-3 shadow-sm">
          <Trophy size={14} className="text-amber-400" />
          OFFICIAL WINNING LUCKY NUMBER
        </div>

        {/* Prize Info Card (with Image & Name) */}
        <div className="flex items-center gap-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-5 py-2.5 mb-3 max-w-md w-full shadow-lg">
          {prizeImage ? (
            <img src={prizeImage} alt={prizeName} className="w-12 h-12 object-cover rounded-xl border border-amber-400/50 bg-slate-950 p-0.5 shadow-md shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/30 shrink-0">
              <Gift size={20} />
            </div>
          )}
          <div className="text-left overflow-hidden">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block truncate">
              RANK {activeRank} PRIZE REWARD
            </span>
            <h4 className="text-sm sm:text-base font-black text-white truncate">{prizeName}</h4>
          </div>
        </div>

        {/* Invoice Label Pill */}
        <div className="bg-blue-900 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-0.5 rounded-full border border-blue-700/60 mb-2 shadow-xs">
          INVOICE NO.
        </div>

        {/* Digit Flip Cards Container */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 my-2">
          {currentDigits.map((digit, idx) => {
            const isLocked = lockedDigits[idx];
            return (
              <div
                key={idx}
                className="relative w-20 h-28 sm:w-28 sm:h-40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-700/80 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden select-none"
              >
                {/* Horizontal Flip Divider Line */}
                <div className="absolute inset-x-0 top-1/2 h-[2px] bg-slate-950 z-20 border-t border-slate-700/60 shadow-xs"></div>

                {/* Hinge Pin Side Bulges */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-3 bg-slate-700 rounded-r-md z-30"></div>
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-3 bg-slate-700 rounded-l-md z-30"></div>

                {/* Digit Display */}
                <motion.div
                  key={digit}
                  initial={{ rotateX: 90, opacity: 0.5 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ duration: 0.08 }}
                  className={`text-5xl sm:text-7xl font-black tracking-tight drop-shadow-md z-10 font-mono ${
                    isLocked ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {digit}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Status / Eligibility Pool Counter */}
        <div className="mt-3 text-center">
          {isFlipping ? (
            <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-2 animate-pulse">
              <RotateCw size={14} className="animate-spin text-amber-400" />
              Auto Draw Running — Selecting Random Winner...
            </p>
          ) : (
            <p className="text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
              Eligible Participants Pool: <span className="font-extrabold text-amber-400">{eligibleParticipants.length} Client Invoices</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

FlipDigitCards.displayName = 'FlipDigitCards';
