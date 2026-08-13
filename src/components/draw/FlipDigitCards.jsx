import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCw, Gift } from 'lucide-react';

export const FlipDigitCards = forwardRef(({
  participants = [],
  activeRank = 1,
  prizeName = 'Grand Prize',
  prizeImage = '',
  existingWinners = [],
  isSpinningExternal = false,
  winningLuckyNumber = null
}, ref) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentDigits, setCurrentDigits] = useState(['0', '0', '0']);
  const [lockedDigits, setLockedDigits] = useState([false, false, false]);

  const lastAnimatedNumberRef = useRef(null);

  useEffect(() => {
    if (winningLuckyNumber) {
      const numStr = String(winningLuckyNumber).padStart(3, '0');
      if (lastAnimatedNumberRef.current !== numStr) {
        lastAnimatedNumberRef.current = numStr;
        spinToWinner({ luckyNumber: numStr });
      }
    } else {
      lastAnimatedNumberRef.current = null;
      setLockedDigits([false, false, false]);
    }
  }, [winningLuckyNumber]);

  // Comprehensive Sets to filter out participants who have already won
  const winningNumbers = new Set();
  const winningIds = new Set();
  const winningInvoices = new Set();

  (existingWinners || []).forEach(w => {
    if (w.luckyNumber) winningNumbers.add(String(w.luckyNumber).trim());
    if (w.winningNumber) winningNumbers.add(String(w.winningNumber).trim());
    if (w.id) winningIds.add(String(w.id));
    if (w.participantId) winningIds.add(String(w.participantId));
    if (w.invoiceNumber) winningInvoices.add(String(w.invoiceNumber).trim());
    if (w.invoiceNo) winningInvoices.add(String(w.invoiceNo).trim());

    if (Array.isArray(w.winners)) {
      w.winners.forEach(subW => {
        if (subW.id) winningIds.add(String(subW.id));
        if (subW.invoiceNumber) winningInvoices.add(String(subW.invoiceNumber).trim());
        if (subW.luckyNumber) winningNumbers.add(String(subW.luckyNumber).trim());
      });
    }
  });

  const eligibleParticipants = (participants || []).filter(p => {
    if (!p) return false;
    if (p.winner) return false;
    const isJoined = p.participating && Boolean(p.joined);
    if (!isJoined) return false;

    const pNum = p.luckyNumber ? String(p.luckyNumber).trim() : '';
    const pId = p.id ? String(p.id) : '';
    const pInv = (p.invoiceNumber || p.invoiceNo) ? String(p.invoiceNumber || p.invoiceNo).trim() : '';

    if (pNum && winningNumbers.has(pNum)) return false;
    if (pId && winningIds.has(pId)) return false;
    if (pInv && winningInvoices.has(pInv)) return false;

    return true;
  });

  // Format number into 3 digits (e.g., '7' -> '007', '57' -> '057')
  const formatInvoiceDigits = (num) => {
    const raw = String(num || '000').padStart(3, '0');
    return raw.slice(-3).split('');
  };

  const lockedDigitsRef = useRef([false, false, false]);

  const spinToWinner = (targetWinner) => {
    if (isFlipping) return;
    setIsFlipping(true);
    lockedDigitsRef.current = [false, false, false];
    setLockedDigits([false, false, false]);

    const winnerNum = targetWinner?.luckyNumber || targetWinner?.winningNumber || targetWinner?.invoiceNumber || targetWinner?.invoiceNo || '000';
    const targetDigits = formatInvoiceDigits(winnerNum);

    // Rapid random digit roller interval reading from ref
    const rollInterval = setInterval(() => {
      setCurrentDigits([
        lockedDigitsRef.current[0] ? targetDigits[0] : String(Math.floor(Math.random() * 10)),
        lockedDigitsRef.current[1] ? targetDigits[1] : String(Math.floor(Math.random() * 10)),
        lockedDigitsRef.current[2] ? targetDigits[2] : String(Math.floor(Math.random() * 10))
      ]);
    }, 60);

    // Step 1: Lock Digit 1 at 0.6s
    setTimeout(() => {
      lockedDigitsRef.current = [true, false, false];
      setLockedDigits([true, false, false]);
    }, 600);

    // Step 2: Lock Digit 2 at 1.2s
    setTimeout(() => {
      lockedDigitsRef.current = [true, true, false];
      setLockedDigits([true, true, false]);
    }, 1200);

    // Step 3: Lock Digit 3 at 1.8s & Finish
    setTimeout(() => {
      clearInterval(rollInterval);
      lockedDigitsRef.current = [true, true, true];
      setLockedDigits([true, true, true]);
      setCurrentDigits(targetDigits);
      setIsFlipping(false);
    }, 1800);
  };

  useImperativeHandle(ref, () => ({
    spinToWinner
  }));

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-3xl mx-auto">
      {/* Mechanical Flip Container Card */}
      <div className="w-full bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 rounded-2xl p-4 sm:p-5 border border-blue-900/60 shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[250px]">
        
        {/* Background glow & accents */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Badge */}
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full flex items-center gap-1.5 mb-2 shadow-xs">
          <Trophy size={13} className="text-amber-400" />
          OFFICIAL WINNING LUCKY NUMBER
        </div>

        {/* Prize Info Card (with Image & Name) */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 mb-2 max-w-sm w-full shadow-md">
          {prizeImage ? (
            <img src={prizeImage} alt={prizeName} className="w-10 h-10 object-cover rounded-lg border border-amber-400/50 bg-slate-950 p-0.5 shadow-xs shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs border border-amber-500/30 shrink-0">
              <Gift size={18} />
            </div>
          )}
          <div className="text-left overflow-hidden">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 block truncate">
              RANK {activeRank} PRIZE REWARD
            </span>
            <h4 className="text-xs sm:text-sm font-black text-white truncate">{prizeName}</h4>
          </div>
        </div>

        {/* Winning Number Label Pill */}
        <div className="bg-blue-900/90 text-white font-extrabold text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-blue-700/60 mb-1.5 shadow-xs">
          WINNING NUMBER
        </div>

        {/* Digit Flip Cards Container */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 my-1">
          {currentDigits.map((digit, idx) => {
            const isLocked = lockedDigits[idx];
            return (
              <div
                key={idx}
                className="relative w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-700/80 rounded-xl flex items-center justify-center shadow-xl overflow-hidden select-none"
              >
                {/* Horizontal Flip Divider Line */}
                <div className="absolute inset-x-0 top-1/2 h-[2px] bg-slate-950 z-20 border-t border-slate-700/60 shadow-xs"></div>

                {/* Hinge Pin Side Bulges */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-slate-700 rounded-r-md z-30"></div>
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-slate-700 rounded-l-md z-30"></div>

                {/* Digit Display */}
                <motion.div
                  key={digit}
                  initial={{ rotateX: 90, opacity: 0.5 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ duration: 0.08 }}
                  className={`text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md z-10 font-mono ${
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
        <div className="mt-2 text-center">
          {isFlipping || isSpinningExternal ? (
            <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-2 animate-pulse">
              <RotateCw size={14} className="animate-spin text-amber-400" />
              Selecting Random Winner from Pool...
            </p>
          ) : (
            <p className="text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
              Eligible Participants Pool: <span className="font-extrabold text-amber-400">{eligibleParticipants.length} {eligibleParticipants.length === 1 ? 'Client Invoice' : 'Client Invoices'}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

FlipDigitCards.displayName = 'FlipDigitCards';
