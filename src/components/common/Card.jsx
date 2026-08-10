import React from 'react';

export const Card = ({ children, title, subtitle, icon: Icon, className = '', headerAction }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {Icon && <Icon size={20} className="text-blue-600" />}
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs font-semibold text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variantClasses = {
    info: "bg-sky-100 text-sky-700 border-sky-200",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    danger: "bg-rose-100 text-rose-700 border-rose-200"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs border ${variantClasses[variant] || variantClasses.info} ${className}`}>
      {children}
    </span>
  );
};
