import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '@/context/EventContext';
import { CreateEventModal } from '@/components/event/CreateEventModal';
import { ROUTES } from '@/constants/routes';
import { Calendar, Users, Trophy, PlayCircle, Plus, Upload, CheckCircle2, ArrowRight } from 'lucide-react';

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { eventsList, activeEventId, eventData, participants, winners } = useEvent();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const activeEvent = eventData || eventsList.find(e => e.id === activeEventId) || eventsList[0];

  const totalEvents = eventsList.length;
  const totalImported = participants.length;
  const totalJoined = participants.filter(p => p.joined).length;
  const totalWinners = winners.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Active Event Banner */}
      {activeEvent && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-6 shadow-xl border border-blue-800/60 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {activeEvent.logo ? (
              <img src={activeEvent.logo} alt="Logo" className="w-14 h-14 object-cover rounded-2xl border border-white/10 bg-slate-950/60 p-1" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg">
                {activeEvent.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-0.5 rounded-full">
                SELECTED EVENT
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{activeEvent.name}</h2>
              <p className="text-xs text-slate-300">Live Draw: {activeEvent.liveDate} at {activeEvent.liveTime} • Sponsor: {activeEvent.sponsor || 'Divine Empire'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/events/${activeEvent.id}`)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer flex items-center gap-2"
            >
              Manage Event
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/live/${activeEvent.id}`)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <PlayCircle size={16} />
              Open Live Draw
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Total Events</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalEvents}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Imported Customers</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalImported}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-900 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Joined Participants</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">{totalJoined}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Winners Selected</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{totalWinners}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="p-5 border border-slate-200 rounded-2xl hover:border-blue-900 hover:bg-blue-50/50 transition-all text-left flex flex-col gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <span className="font-bold text-slate-900 text-sm mt-1">Create New Event</span>
            <span className="text-xs text-slate-500">Configure event details, branding, schedule, and prizes</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.ADMIN_EVENTS)}
            className="p-5 border border-slate-200 rounded-2xl hover:border-blue-900 hover:bg-blue-50/50 transition-all text-left flex flex-col gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <span className="font-bold text-slate-900 text-sm mt-1">Import Participants</span>
            <span className="text-xs text-slate-500">Upload Excel spreadsheet with invoice & mobile numbers</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(activeEvent ? `/admin/live/${activeEvent.id}` : ROUTES.ADMIN_EVENTS)}
            className="p-5 border border-slate-200 rounded-2xl hover:border-red-600 hover:bg-red-50/50 transition-all text-left flex flex-col gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlayCircle size={20} />
            </div>
            <span className="font-bold text-slate-900 text-sm mt-1">Host Live Draw</span>
            <span className="text-xs text-slate-500">Spin the wheel and select random winners live</span>
          </button>
        </div>
      </div>

      {/* Create Event Popup Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={(evt) => {
          setIsCreateModalOpen(false);
          navigate(`/admin/events/${evt.id}`);
        }}
      />
    </div>
  );
};
