import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEvent } from '@/context/EventContext';
import { eventStorage } from '@/services/eventStorage';
import { participantStorage } from '@/services/participantStorage';
import { supabase } from '@/lib/supabase';
import { winnerStorage } from '@/services/winnerStorage';
import { computeEventStatus } from '@/utils/eventStatus';
import { ExcelImportPanel } from '@/components/participants/ExcelImportPanel';
import { 
  ArrowLeft, Calendar, Copy, Check, Users, Trophy, PlayCircle, 
  Upload, Search, Trash2, Download, ExternalLink, ShieldCheck, UserCheck, UserX, Gift, Edit, X, Save,
  CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { formatDateOnly, formatDateTime } from '@/utils/formatters';

import { ConfirmModal } from '@/components/common/ConfirmModal';

export const EventDetailPage = ({ initialTab = 'overview' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveEvent, importBulkParticipants, deleteParticipant, toggleParticipation, updateParticipant, prizes: contextPrizes } = useEvent();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [winners, setWinners] = useState([]);
  const [prizesNabl, setPrizesNabl] = useState([]);
  const [prizesTs, setPrizesTs] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/participants')) return 'participants';
    if (location.pathname.includes('/winners')) return 'winners';
    return initialTab;
  }); // overview, participants, winners
  const [deleteParticipantConfirm, setDeleteParticipantConfirm] = useState({ isOpen: false, pId: null, serviceType: null, customerName: '' });

  useEffect(() => {
    if (location.pathname.includes('/participants')) {
      setActiveTab('participants');
    } else if (location.pathname.includes('/winners')) {
      setActiveTab('winners');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);
  const [selectedService, setSelectedService] = useState('ALL'); // ALL, NABL, TOTAL_STATION
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PARTICIPATING, NOT_PARTICIPATING, JOINED, WINNER
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Clear selection on filter, search or service tab change
  useEffect(() => {
    setSelectedIds([]);
  }, [filter, selectedService, search]);

  const loadData = async () => {
    if (!id) return;
    try {
      const evt = await eventStorage.getEvent(id);
      if (evt) {
        setEvent(evt);
        const parts = await participantStorage.getParticipants(evt.id);
        setParticipants(Array.isArray(parts) ? parts : []);
        const wins = await winnerStorage.getWinners(evt.id);
        setWinners(Array.isArray(wins) ? wins : []);
        
        setPrizesNabl(evt.prizesNabl || evt.prizes || []);
        setPrizesTs(evt.prizesTs || evt.prizes || []);
      }
    } catch (err) {
      console.error('Error loading event detail data:', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData();

    // 1. Supabase Real-time Subscription for instant updates on join/register
    const channel = supabase
      .channel(`rt_participants_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${id}`
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    // 2. Fallback polling interval every 3 seconds for continuous sync
    const pollInterval = setInterval(() => {
      loadData();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [id]);

  useEffect(() => {
    loadData();
  }, [id, contextPrizes]);

  const handleToggleParticipation = async (participantId, serviceType) => {
    if (computedStatus === 'ENDED') {
      toast.error('Cannot change participation status after event has ended.');
      return;
    }
    const updated = await toggleParticipation(participantId, event?.id || id, serviceType);
    if (updated) {
      toast.success(`Participant status updated to ${updated.participating ? 'Participating' : 'Not Participating'}`);
      await loadData();
    } else {
      toast.error('Cannot change participation status after participant has joined.');
    }
  };

  const publicUrl = event ? `${window.location.origin}/event/${event.token || event.slug || event.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Public Event link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportComplete = async (rawList, replaceMode) => {
    if (!event) return;
    const targetService = selectedService === 'TOTAL_STATION' ? 'TOTAL_STATION' : 'NABL';
    await importBulkParticipants(rawList, replaceMode, event.id, targetService);
    await loadData();
    setShowImportPanel(false);
    setActiveTab('participants');
  };

  const promptDeleteParticipant = (p) => {
    setDeleteParticipantConfirm({
      isOpen: true,
      pId: p.id,
      serviceType: p.serviceType,
      customerName: p.customerName || p.name || 'this participant'
    });
  };

  const handleConfirmDeleteParticipant = async () => {
    if (deleteParticipantConfirm.pId) {
      await deleteParticipant(deleteParticipantConfirm.pId, event.id, deleteParticipantConfirm.serviceType);
      await loadData();
      toast.success('Participant deleted successfully');
    }
  };

  const handleSelectAll = (selectableList) => {
    const selectableIds = selectableList.map(p => p.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every(pId => selectedIds.includes(pId));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handleToggleSelectRow = (pId) => {
    setSelectedIds(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (computedStatus === 'ENDED') {
      toast.error('Cannot change participation status after event has ended.');
      return;
    }
    await participantStorage.bulkUpdateParticipation(event.id, selectedIds, true);
    toast.success(`Approved ${selectedIds.length} participant(s)`);
    setSelectedIds([]);
    await loadData();
  };

  const handleBulkUnapprove = async () => {
    if (selectedIds.length === 0) return;
    if (computedStatus === 'ENDED') {
      toast.error('Cannot change participation status after event has ended.');
      return;
    }
    await participantStorage.bulkUpdateParticipation(event.id, selectedIds, false);
    toast.success(`Marked ${selectedIds.length} participant(s) as Not Participating`);
    setSelectedIds([]);
    await loadData();
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await participantStorage.bulkDeleteParticipants(event.id, selectedIds);
    toast.success(`Deleted ${selectedIds.length} participant(s)`);
    setSelectedIds([]);
    setBulkDeleteConfirmOpen(false);
    await loadData();
  };

  const handleSaveParticipantEdit = async (pId, updateData) => {
    const updated = await updateParticipant(pId, updateData, event.id);
    if (updated) {
      toast.success('Participant details updated successfully!');
      await loadData();
    } else {
      toast.error('Failed to update participant');
    }
  };

  const handleExportParticipants = () => {
    const safeList = Array.isArray(participants) ? participants : [];
    const data = safeList.map((p, idx) => ({
      '#': idx + 1,
      'Service Type': p.serviceType === 'TOTAL_STATION' ? 'Total Station' : 'NABL Calibration',
      'Invoice Number': p.invoiceNumber,
      'Customer Name': p.customerName,
      'Mobile Number': p.mobile,
      'Status': p.winner ? 'Winner' : (p.joinedAt || p.joined_at) ? 'Joined' : p.participating ? 'Approved' : 'Waiting',
      'Lucky Number': p.luckyNumber || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
    XLSX.writeFile(workbook, `${event.name}_Participants.xlsx`);
  };

  const handleExportWinners = () => {
    const safeWinners = Array.isArray(winners) ? winners : [];
    const data = safeWinners.map(w => ({
      'Service': w.serviceType === 'TOTAL_STATION' ? 'Total Station' : 'NABL Calibration',
      'Rank': w.rank,
      'Prize Name': w.prizeName,
      'Winning Invoice': w.invoiceNumber || w.invoiceNo,
      'Winner Name(s)': w.customerNames || w.name,
      'Mobile(s)': w.mobiles || w.phone,
      'Draw Time': w.drawTime || w.drawnAt || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Winners');
    XLSX.writeFile(workbook, `${event.name}_Winners.xlsx`);
  };

  const safeParticipants = Array.isArray(participants) ? participants : [];
  const filteredParticipants = safeParticipants.filter(p => {
    const matchSearch = 
      (p.customerName || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber || p.invoiceNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.mobile || p.phone || '').includes(search) ||
      (p.luckyNumber || '').includes(search);

    if (!matchSearch) return false;

    // Service tab filter
    if (selectedService === 'NABL' && p.serviceType !== 'NABL') return false;
    if (selectedService === 'TOTAL_STATION' && p.serviceType !== 'TOTAL_STATION') return false;

    const hasJoined = Boolean(p.joinedAt || p.joined_at);

    if (filter === 'PARTICIPATING') return p.participating;
    if (filter === 'NOT_PARTICIPATING') return !p.participating;
    if (filter === 'JOINED') return hasJoined;
    if (filter === 'WINNER') return p.winner;
    return true;
  });

  if (!event) {
    return <div className="p-12 text-center text-slate-500 font-semibold">Loading Event Details...</div>;
  }

  const nablParts = safeParticipants.filter(p => p.serviceType === 'NABL');
  const tsParts = safeParticipants.filter(p => p.serviceType === 'TOTAL_STATION');
  const computedStatus = computeEventStatus(event, winners, [...prizesNabl, ...prizesTs]);

  const nablWinners = winners.filter(w => w.serviceType === 'NABL' || (prizesNabl.some(p => p.name === w.prizeName)));
  const tsWinners = winners.filter(w => w.serviceType === 'TOTAL_STATION' || (prizesTs.some(p => p.name === w.prizeName)));

  return (
    <div className="flex flex-col gap-5">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/admin/events')}
        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer w-fit transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Events List
      </button>

      {/* Hero Header Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-900/40 relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 sm:gap-4 z-10 min-w-0 flex-1">
          {event.logo ? (
            <img src={event.logo} alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border-2 border-white/20 bg-slate-900 p-1 shadow-md shrink-0" />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-base sm:text-lg shadow-md border border-white/20 shrink-0">
              {event.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight break-words leading-snug">{event.name}</h1>
              <span className={`px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shadow-xs ${
                computedStatus === 'LIVE' ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse' :
                computedStatus === 'ENDED' ? 'bg-slate-800 text-slate-300 border-slate-700' :
                computedStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                ● {computedStatus}
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-1 font-medium flex items-center gap-2 flex-wrap">
              <span>Sponsor: <strong className="text-white">{event.sponsor}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar size={13} className="text-amber-400" /> {formatDateOnly(event.startDate)} – {formatDateOnly(event.endDate)}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 z-10 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all backdrop-blur-sm active:scale-95 whitespace-nowrap"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-amber-300" />}
            <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/live/${event.id}`)}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold px-4.5 py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/50 transition-all active:scale-95 whitespace-nowrap"
          >
            <PlayCircle size={17} />
            <span>Start Live Draw</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Prizes', icon: Calendar },
            { 
              id: 'participants', 
              label: 'Registered Participants', 
              badge: selectedService === 'TOTAL_STATION' ? tsParts.length : selectedService === 'NABL' ? nablParts.length : safeParticipants.length, 
              icon: Users 
            }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'participants') {
                    navigate(`/admin/events/${id}/participants`);
                  } else {
                    navigate(`/admin/events/${id}`);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Service Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Services' },
            { id: 'NABL', label: 'NABL' },
            { id: 'TOTAL_STATION', label: 'Total Station' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedService(s.id)}
              className={`flex-1 md:flex-initial text-center px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedService === s.id
                  ? 'bg-blue-900 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT 1: Overview */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Executive Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-blue-200/70 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider">NABL Participants</span>
                <p className="text-3xl font-black text-blue-950 mt-1">{nablParts.length}</p>
                <span className="text-[10px] font-semibold text-slate-400">Registered</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white border border-emerald-200/70 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Total Station</span>
                <p className="text-3xl font-black text-emerald-950 mt-1">{tsParts.length}</p>
                <span className="text-[10px] font-semibold text-slate-400">Registered</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white border border-indigo-200/70 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider">Total Winner Slots</span>
                <p className="text-3xl font-black text-indigo-950 mt-1">10</p>
                <span className="text-[10px] font-semibold text-slate-400">5 NABL + 5 Total Station</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Gift size={22} />
              </div>
            </div>

            <div className="bg-white border border-amber-200/70 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">Winners Drawn</span>
                <p className="text-3xl font-black text-amber-950 mt-1">{winners.length}</p>
                <span className="text-[10px] font-semibold text-slate-400">{winners.length === 10 ? 'All Slots Filled' : `${10 - winners.length} Pending`}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Trophy size={22} />
              </div>
            </div>
          </div>

          {/* Configured Prizes Information Roster - NABL */}
          {(selectedService === 'ALL' || selectedService === 'NABL') && (
            <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                    <Gift size={18} className="text-blue-800" /> NABL Lab Calibration Prizes (5 Winners)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-600" />
                    Live Draw Date: <strong className="text-slate-800">{formatDateTime(event.liveDateTimeNabl || event.liveDateTime)}</strong>
                  </p>
                </div>
                <span className="bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-xs px-3 py-1 rounded-full">
                  NABL Service Stream
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                {prizesNabl.map((p) => {
                  const img = p.image || p.img || p.picture;
                  return (
                    <div key={p.rank} className="bg-white border border-blue-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative">
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="bg-blue-900 text-white font-black text-[11px] px-2.5 py-1 rounded-lg shadow-sm">
                          Rank {p.rank}
                        </span>
                      </div>
                      <div className="w-full h-40 bg-gradient-to-b from-slate-50 to-blue-50/30 p-3 flex items-center justify-center overflow-hidden relative">
                        {img ? (
                          <img src={img} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-blue-100/60 text-blue-400 flex items-center justify-center">
                            <Gift size={32} />
                          </div>
                        )}
                      </div>
                      <div className="bg-blue-900 py-2.5 px-3 text-center text-white font-black text-xs uppercase tracking-wider truncate border-t border-blue-800">
                        {p.name || `Rank ${p.rank} Prize`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Configured Prizes Information Roster - Total Station */}
          {(selectedService === 'ALL' || selectedService === 'TOTAL_STATION') && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                    <Gift size={18} className="text-emerald-800" /> Total Station Calibration Prizes (5 Winners)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-emerald-600" />
                    Live Draw Date: <strong className="text-slate-800">{formatDateTime(event.liveDateTimeTs || event.liveDateTime)}</strong>
                  </p>
                </div>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs px-3 py-1 rounded-full">
                  Total Station Stream
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                {prizesTs.map((p) => {
                  const img = p.image || p.img || p.picture;
                  return (
                    <div key={p.rank} className="bg-white border border-emerald-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative">
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="bg-emerald-700 text-white font-black text-[11px] px-2.5 py-1 rounded-lg shadow-sm">
                          Rank {p.rank}
                        </span>
                      </div>
                      <div className="w-full h-40 bg-gradient-to-b from-slate-50 to-emerald-50/30 p-3 flex items-center justify-center overflow-hidden relative">
                        {img ? (
                          <img src={img} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xs" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-100/60 text-emerald-500 flex items-center justify-center">
                            <Gift size={32} />
                          </div>
                        )}
                      </div>
                      <div className="bg-emerald-800 py-2.5 px-3 text-center text-white font-black text-xs uppercase tracking-wider truncate border-t border-emerald-700">
                        {p.name || `Rank ${p.rank} Prize`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: Participants */}
      {activeTab === 'participants' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col gap-4">
          
          {/* Action Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
            {/* Top Row: Search Input + Import/Export Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, invoice, mobile..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-900 font-medium"
                />
              </div>

              {/* Action Buttons: Import & Export */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedService !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setShowImportPanel(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                  >
                    <Upload size={14} /> <span>Import Excel ({selectedService === 'TOTAL_STATION' ? 'Total Station' : 'NABL'})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportParticipants}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download size={14} /> <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto w-full max-w-full">
              {['ALL', 'PARTICIPATING', 'NOT_PARTICIPATING', 'JOINED', 'WINNER'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    filter === f ? 'bg-white text-blue-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Excel Import Modal Popup */}
          {showImportPanel && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="w-full max-w-2xl">
                <ExcelImportPanel
                  eventId={event.id}
                  onImportComplete={handleImportComplete}
                  onClose={() => setShowImportPanel(false)}
                />
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {!filter.includes('JOINED') && filter !== 'WINNER' && selectedIds.length > 0 && (
            <div className="w-full bg-slate-900 text-white p-3 rounded-2xl border border-blue-800 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded-xl shadow-xs">
                  {selectedIds.length} Selected
                </span>
                <span className="text-xs text-slate-300 font-medium">Bulk Participant Actions:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={computedStatus === 'ENDED'}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserCheck size={14} /> Approve Selected
                </button>

                <button
                  type="button"
                  onClick={handleBulkUnapprove}
                  disabled={computedStatus === 'ENDED'}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserX size={14} /> Not Approve Selected
                </button>

                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  title="Deselect All"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Participants Table */}
          {(() => {
            const isCleanView = filter === 'JOINED' || filter === 'WINNER';
            const showCheckboxes = !isCleanView;
            const showWinnerRank = filter === 'WINNER';
            
            const selectableParticipants = filteredParticipants.filter(p => !Boolean(p.joinedAt || p.joined_at));
            const isAllSelected = selectableParticipants.length > 0 && selectableParticipants.every(p => selectedIds.includes(p.id));
            const totalCols = (showCheckboxes ? 1 : 0) + 4 + 1 + (!isCleanView ? 2 : 0) + (showWinnerRank ? 1 : 0);

            return (
              <div className="border border-slate-200 rounded-2xl overflow-x-auto overflow-y-auto max-h-[480px] text-xs shadow-xs w-full max-w-full">
                <table className="w-full min-w-[750px] text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                    <tr>
                      {showCheckboxes && (
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            disabled={selectableParticipants.length === 0}
                            onChange={() => handleSelectAll(selectableParticipants)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:opacity-40"
                            title={isAllSelected ? 'Deselect All' : 'Select All'}
                          />
                        </th>
                      )}
                      <th className="p-3.5">Service Type</th>
                      <th className="p-3.5">Invoice No</th>
                      <th className="p-3.5">Customer Name</th>
                      <th className="p-3.5">Mobile</th>
                      <th className="p-3.5">Lucky Number</th>
                      {!isCleanView && <th className="p-3.5">Participation Toggle</th>}
                      {showWinnerRank && <th className="p-3.5">Winner Rank</th>}
                      {!isCleanView && <th className="p-3.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols} className="p-12 text-center text-slate-400">
                          <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                            <Users size={32} className="text-slate-300" />
                            <p className="font-bold text-slate-700">No Participants Found</p>
                            <p className="text-xs text-slate-400">Customers can register via public link or you can import Excel records directly.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map(p => {
                        const isRowSelected = selectedIds.includes(p.id);
                        const isJoined = Boolean(p.joinedAt || p.joined_at);

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${
                            isRowSelected ? 'bg-blue-50/60' : ''
                          } ${
                            p.serviceType === 'TOTAL_STATION' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-600'
                          }`}>
                            {showCheckboxes && (
                              <td className="p-3.5 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isRowSelected}
                                  disabled={isJoined || computedStatus === 'ENDED'}
                                  onChange={() => handleToggleSelectRow(p.id)}
                                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                              </td>
                            )}
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border ${
                                p.serviceType === 'TOTAL_STATION'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-900 border-blue-200'
                              }`}>
                                {p.serviceType === 'TOTAL_STATION' ? 'Total Station' : 'NABL Calibration'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-slate-800">#{p.invoiceNumber || p.invoiceNo}</td>
                            <td className="p-3.5 font-bold text-slate-900">{p.customerName || p.name}</td>
                            <td className="p-3.5 text-slate-600 font-medium">{p.mobile || p.phone}</td>
                            
                            {/* Lucky Number */}
                            <td className="p-3.5">
                              {p.luckyNumber ? (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-mono font-black border border-purple-200 text-xs shadow-2xs">
                                  #{p.luckyNumber}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11px]">—</span>
                              )}
                            </td>

                            {/* Participate Toggle Button */}
                            {!isCleanView && (
                              <td className="p-3.5">
                                <button
                                  type="button"
                                  disabled={isJoined || computedStatus === 'ENDED'}
                                  onClick={() => handleToggleParticipation(p.id, p.serviceType)}
                                  title={computedStatus === 'ENDED' ? 'Participation status cannot be changed for ended events' : isJoined ? 'Participation locked (participant has joined)' : p.participating ? 'Click to mark as Not Participating' : 'Click to mark as Participating'}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    (isJoined || computedStatus === 'ENDED')
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300 opacity-60'
                                      : p.participating
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold'
                                  }`}
                                >
                                  <UserCheck size={14} />
                                  {p.participating ? 'Participating' : 'Approve'}
                                </button>
                              </td>
                            )}

                            {/* Winner Rank */}
                            {showWinnerRank && (
                              <td className="p-3.5">
                                {p.winnerRank || p.rank ? (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-1 rounded-xl text-xs inline-flex items-center gap-1 shadow-xs">
                                    🏆 Rank {p.winnerRank || p.rank}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium text-[11px]">—</span>
                                )}
                              </td>
                            )}

                            {!isCleanView && (
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingParticipant(p)}
                                    className="p-1.5 text-slate-500 hover:text-blue-900 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                                    title="Edit Participant Details"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteParticipant(p)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                    title="Delete Participant"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteParticipantConfirm.isOpen}
        title="Delete Participant"
        message={`Are you sure you want to delete "${deleteParticipantConfirm.customerName}"? This operation cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteParticipant}
        onClose={() => setDeleteParticipantConfirm({ isOpen: false, pId: null, serviceType: null, customerName: '' })}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        title="Bulk Delete Participants"
        message={`Are you sure you want to delete ${selectedIds.length} selected participant(s)? This operation cannot be undone.`}
        confirmText="Delete Selected"
        confirmVariant="danger"
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      />

      {/* Edit Participant Popup Modal */}
      {editingParticipant && (
        <EditParticipantModal
          participant={editingParticipant}
          isOpen={Boolean(editingParticipant)}
          onClose={() => setEditingParticipant(null)}
          onSave={handleSaveParticipantEdit}
        />
      )}
    </div>
  );
};

const EditParticipantModal = ({ participant, isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [serviceType, setServiceType] = useState('NABL_CALIBRATION');
  const [participating, setParticipating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (participant) {
      setName(participant.customerName || participant.name || '');
      setMobile(participant.mobile || participant.phone || '');
      setInvoiceNumber(participant.invoiceNumber || participant.invoiceNo || '');
      setServiceType(participant.serviceType === 'TOTAL_STATION' ? 'TOTAL_STATION_CALIBRATION' : 'NABL_CALIBRATION');
      setParticipating(Boolean(participant.participating));
    }
  }, [participant]);

  if (!isOpen || !participant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !invoiceNumber.trim()) {
      toast.error('Name, Mobile, and Invoice Number are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(participant.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        invoiceNumber: invoiceNumber.trim(),
        serviceType,
        luckyNumber: participant.luckyNumber || null,
        participating
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update participant details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Edit size={18} className="text-blue-900" /> Edit Participant Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Update customer info, invoice, service type & status</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Service Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServiceType('NABL_CALIBRATION')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  serviceType === 'NABL_CALIBRATION'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                NABL Calibration
              </button>
              <button
                type="button"
                onClick={() => setServiceType('TOTAL_STATION_CALIBRATION')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  serviceType === 'TOTAL_STATION_CALIBRATION'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Total Station
              </button>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={participating}
                onChange={(e) => setParticipating(e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
              />
              <span>Approve Participation for Lucky Draw</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              {isSubmitting ? 'Updating...' : 'Save Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
