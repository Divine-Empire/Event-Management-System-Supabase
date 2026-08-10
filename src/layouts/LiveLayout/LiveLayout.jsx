import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { Footer } from '@/components/common/Footer';

export const LiveLayout = () => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-slate-950 w-full">
      {/* Top Utility Control Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <button 
          type="button" 
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer" 
          onClick={() => navigate(ROUTES.ADMIN)}
          title="Exit Live View back to Admin Dashboard"
        >
          <ArrowLeft size={16} /> Exit Broadcast
        </button>

        <button 
          type="button" 
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs" 
          onClick={toggleFullscreen}
          title="Toggle Fullscreen for TV Display"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      <Footer variant="light" />
    </div>
  );
};
