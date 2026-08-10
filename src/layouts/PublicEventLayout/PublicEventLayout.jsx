import React from 'react';
import { Outlet } from 'react-router-dom';
import { Footer } from '@/components/common/Footer';

export const PublicEventLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-slate-950 w-full">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer variant="light" />
    </div>
  );
};
