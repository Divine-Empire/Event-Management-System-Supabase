import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '@/context/EventContext';
import { CreateEventModal } from '@/components/event/CreateEventModal';
import { computeEventStatus } from '@/utils/eventStatus';
import { Calendar, Plus, Link2, Copy, Trash2, Check, Zap, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmModal } from '@/components/common/ConfirmModal';

export const EventListPage = () => {
  const navigate = useNavigate();
  const { eventsList, activeEventId, setActiveEvent, deleteEvent } = useEvent();
  const [copiedId, setCopiedId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, eventId: null, eventName: '' });

  const handleCopyLink = (event, e) => {
    e.stopPropagation();
    const token = event.token || event.slug || event.id;
    const url = `${window.location.origin}/event/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(event.id);
    toast.success('Public Event link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActivate = (event, e) => {
    e.stopPropagation();
    setActiveEvent(event.id);
    toast.success(`"${event.name}" is now set as the Selected Event!`);
  };

  const handleEdit = (event, e) => {
    e.stopPropagation();
    setEditingEvent(event);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (event, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, eventId: event.id, eventName: event.name });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.eventId) {
      deleteEvent(deleteConfirm.eventId);
      toast.success(`Event "${deleteConfirm.eventName || ''}" deleted successfully`);
    }
  };

  // Dynamic Status calculation
  const getEventStatusDisplay = (evt) => {
    const status = computeEventStatus(evt, [], evt.prizes || []);
    if (status === 'LIVE') {
      return { label: 'LIVE', style: 'bg-red-50 text-red-700 border-red-200 animate-pulse' };
    }
    if (status === 'ENDED') {
      return { label: 'ENDED', style: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (status === 'ACTIVE') {
      return { label: 'ACTIVE', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: 'UPCOMING', style: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3.5 sm:gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Events Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer reward events, import participants, and host live draws</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEvent(null);
            setIsCreateModalOpen(true);
          }}
          className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-xs text-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Create New Event
        </button>
      </div>

      {/* Events Table / Grid */}
      {eventsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col items-center">
          <Calendar size={40} className="text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Events Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">Create your first customer reward event to import participants and share event links.</p>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Create Event
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1 min-h-0 w-full">
            <table className="w-full min-w-[650px] text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="p-4">Event Name</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventsList.map((evt) => {
                  const isActive = evt.id === activeEventId;
                  const token = evt.token || evt.slug || evt.id;
                  const statusInfo = getEventStatusDisplay(evt);

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => {
                        setActiveEvent(evt.id);
                        navigate(`/admin/events/${evt.id}`);
                      }}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${isActive ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {evt.logo ? (
                            <img src={evt.logo} alt="Logo" className="w-9 h-9 object-cover rounded-xl border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                              {evt.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{evt.name}</span>
                              {isActive && (
                                <span className="bg-blue-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Selected
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[11px] block">{evt.sponsor || 'Divine Empire'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-slate-700">
                          <div><strong>Start:</strong> {evt.startDate || 'N/A'}</div>
                          <div><strong>Live Draw:</strong> {evt.liveDate} at {evt.liveTime}</div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase border ${statusInfo.style}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Select / Selected Button */}
                          {isActive ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-emerald-200">
                              <Check size={14} /> Selected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleActivate(evt, e)}
                              title="Set as Selected Event"
                              className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Check size={14} /> Select
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={(e) => handleEdit(evt, e)}
                            title="Edit Event Details"
                            className="p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(evt, e)}
                            title="Copy Public Link"
                            className="p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedId === evt.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(evt, e)}
                            title="Delete Event"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popup Modal Form */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        editingEvent={editingEvent}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        onEventCreated={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteConfirm.eventName || 'this event'}"? All associated participants and winner logs will be permanently deleted.`}
        confirmText="Delete Event"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, eventId: null, eventName: '' })}
      />
    </div>
  );
};
