import React from 'react';

export const CompanyLogo = ({ size = 'md', showText = true, lightText = false, className = '' }) => {
  const sizeMap = {
    sm: { img: 'h-8', title: 'text-xs', sub: 'text-[8px]' },
    md: { img: 'h-10', title: 'text-sm', sub: 'text-[9px]' },
    lg: { img: 'h-12', title: 'text-base', sub: 'text-[10px]' },
    xl: { img: 'h-16', title: 'text-xl', sub: 'text-[11px]' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      {/* Official Company Logo Image from /logo.jpg */}
      <img 
        src="/logo.jpg" 
        alt="Divine Empire Logo" 
        className={`${currentSize.img} w-auto object-contain flex-shrink-0 rounded-xl border border-slate-100 shadow-2xs p-0.5 bg-white`} 
      />

      {showText && (
        <div className="flex flex-col leading-tight min-w-0 flex-1 whitespace-nowrap overflow-hidden">
          <span className={`font-black tracking-tight ${currentSize.title} whitespace-nowrap truncate`}>
            <span style={{ color: lightText ? '#ffffff' : '#1565C0' }}>DIVINE</span> <span style={{ color: '#84CC16' }}>EMPIRE</span>
          </span>
          <span className={`font-extrabold tracking-widest uppercase ${currentSize.sub} whitespace-nowrap truncate`} style={{ color: lightText ? '#94A3B8' : '#64748B' }}>
            GLOBAL
          </span>
        </div>
      )}
    </div>
  );
};
