import React from 'react';

export const Footer = ({ variant = 'light' }) => {
  const isDark = variant === 'dark';
  return (
    <footer className={`py-1.5 px-4 text-center text-xs border-t transition-colors shrink-0 ${
      isDark 
        ? 'bg-slate-950 border-slate-800/80' 
        : 'bg-white border-slate-200'
    }`}>
      <p className="flex items-center justify-center gap-1.5 font-semibold">
        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Powered By</span>
        <span className={`font-black tracking-wide ${isDark ? 'text-amber-400' : 'text-blue-900'}`}>
          Botivate
        </span>
      </p>
    </footer>
  );
};
