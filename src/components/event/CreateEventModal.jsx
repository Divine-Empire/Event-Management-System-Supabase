import React, { useState, useEffect } from 'react';
import { useEvent } from '@/context/EventContext';
import { eventStorage } from '@/services/eventStorage';
import { uploadPrizeImage } from '@/lib/supabase';
import { X, Save, Plus, Trash2, Copy, Check, Upload, Gift } from 'lucide-react';
import { toast } from 'sonner';

const formatToDateTimeLocal = (dateVal, defaultTime = '18:00') => {
  if (!dateVal) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T${defaultTime}`;
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  if (typeof dateVal === 'string' && dateVal.includes('T')) {
    return dateVal.slice(0, 16);
  }
  return `${dateVal}T${defaultTime}`;
};

export const CreateEventModal = ({ isOpen, editingEvent = null, onClose, onEventCreated }) => {
  const { createEvent, updateEvent } = useEvent();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sponsor, setSponsor] = useState('Divine Empire');
  const [startDateTime, setStartDateTime] = useState(() => formatToDateTimeLocal(new Date().toISOString().slice(0, 10), '09:00'));
  const [endDateTime, setEndDateTime] = useState(() => formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));
  const [liveDateTimeNabl, setLiveDateTimeNabl] = useState(() => formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));
  const [liveDateTimeTs, setLiveDateTimeTs] = useState(() => formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));

  const defaultPrizes5 = [
    { rank: 1, name: '', image: '' },
    { rank: 2, name: '', image: '' },
    { rank: 3, name: '', image: '' },
    { rank: 4, name: '', image: '' },
    { rank: 5, name: '', image: '' }
  ];

  const [prizesNabl, setPrizesNabl] = useState(defaultPrizes5);
  const [prizesTs, setPrizesTs] = useState(defaultPrizes5);

  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setName(editingEvent.name || '');
      setDescription(editingEvent.description || '');
      setSponsor(editingEvent.sponsor || 'Divine Empire');

      setStartDateTime(formatToDateTimeLocal(editingEvent.startDateTime || editingEvent.startDate, '09:00'));
      setEndDateTime(formatToDateTimeLocal(editingEvent.endDateTime || editingEvent.endDate, '18:00'));
      setLiveDateTimeNabl(formatToDateTimeLocal(editingEvent.liveDateTimeNabl || editingEvent.liveDateTime, '18:00'));
      setLiveDateTimeTs(formatToDateTimeLocal(editingEvent.liveDateTimeTs || editingEvent.liveDateTime, '18:00'));

      if (editingEvent.prizesNabl && editingEvent.prizesNabl.length > 0) {
        setPrizesNabl(editingEvent.prizesNabl);
      } else if (editingEvent.prizes && editingEvent.prizes.length > 0) {
        setPrizesNabl(editingEvent.prizes);
      } else {
        setPrizesNabl(defaultPrizes5);
      }

      if (editingEvent.prizesTs && editingEvent.prizesTs.length > 0) {
        setPrizesTs(editingEvent.prizesTs);
      } else {
        setPrizesTs(defaultPrizes5);
      }
    } else {
      setName('');
      setDescription('');
      setSponsor('Divine Empire');
      setStartDateTime(formatToDateTimeLocal(new Date().toISOString().slice(0, 10), '09:00'));
      setEndDateTime(formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));
      setLiveDateTimeNabl(formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));
      setLiveDateTimeTs(formatToDateTimeLocal(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), '18:00'));
      setPrizesNabl(defaultPrizes5);
      setPrizesTs(defaultPrizes5);
    }
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  const handlePrizeChange = (setter, index, field, value) => {
    setter(prevPrizes => {
      const updated = [...prevPrizes];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handlePrizeImageUpload = (setter, e, index, servicePrefix) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      setter(prevPrizes => {
        const updated = [...prevPrizes];
        updated[index] = {
          ...updated[index],
          image: dataUrl,
          imageFile: file,
          servicePrefix
        };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e, activate = false) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter an Event Name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload pending image files for NABL
      const processedPrizesNabl = await Promise.all(
        prizesNabl.map(async (p, idx) => {
          if (p.imageFile) {
            const uploadedUrl = await uploadPrizeImage(p.imageFile, `nabl_rank_${p.rank || idx + 1}`);
            const finalImage = uploadedUrl || p.image || '';
            const { imageFile, servicePrefix, ...rest } = p;
            return { ...rest, image: finalImage };
          }
          const { imageFile, servicePrefix, ...rest } = p;
          return rest;
        })
      );

      // Upload pending image files for Total Station
      const processedPrizesTs = await Promise.all(
        prizesTs.map(async (p, idx) => {
          if (p.imageFile) {
            const uploadedUrl = await uploadPrizeImage(p.imageFile, `ts_rank_${p.rank || idx + 1}`);
            const finalImage = uploadedUrl || p.image || '';
            const { imageFile, servicePrefix, ...rest } = p;
            return { ...rest, image: finalImage };
          }
          const { imageFile, servicePrefix, ...rest } = p;
          return rest;
        })
      );

      const startIso = startDateTime ? new Date(startDateTime).toISOString() : new Date().toISOString();
      const endIso = endDateTime ? new Date(endDateTime).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString();
      const liveNablIso = liveDateTimeNabl ? new Date(liveDateTimeNabl).toISOString() : new Date().toISOString();
      const liveTsIso = liveDateTimeTs ? new Date(liveDateTimeTs).toISOString() : new Date().toISOString();

      const eventPayload = {
        name,
        description,
        sponsor,
        startDate: startIso,
        endDate: endIso,
        startDateTime: startIso,
        endDateTime: endIso,
        liveDateTime: liveNablIso,
        liveDateTimeNabl: liveNablIso,
        liveDateTimeTs: liveTsIso,
        prizes: processedPrizesNabl,
        prizesNabl: processedPrizesNabl,
        prizesTs: processedPrizesTs
      };

      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, eventPayload);
        toast.success(`Event "${name}" updated successfully!`);
        if (onEventCreated) onEventCreated(updated || { ...editingEvent, ...eventPayload });
        handleClose();
        return;
      }

      const newEvt = await createEvent({
        ...eventPayload,
        status: activate ? 'ACTIVE' : 'UPCOMING'
      });

      setCreatedEvent(newEvt);
      toast.success(editingEvent ? `Event "${newEvt.name}" updated successfully!` : `Event "${newEvt.name}" created successfully!`);
      if (onEventCreated) onEventCreated(newEvt);
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error('Failed to save event. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const publicUrl = createdEvent ? `${window.location.origin}/event/${createdEvent.token}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Public Event link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCreatedEvent(null);
    setName('');
    setDescription('');
    setSponsor('Divine Empire');
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {editingEvent ? 'Modify event registration dates, live draw timing & prizes for both services' : 'Configure NABL Lab Calibration & Total Station Calibration live draw details and prizes (5 Winners Each)'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {createdEvent ? (
            /* Success View */
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Event Created Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1">Share this public link with eligible customers to register and join the live draw.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-blue-900 truncate">{publicUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form id="create-event-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
              {/* 1. Basic Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Event Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Divine Empire Annual Reward Draw"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sponsor Name</label>
                    <input
                      type="text"
                      value={sponsor}
                      onChange={(e) => setSponsor(e.target.value)}
                      placeholder="e.g. Divine Empire Global"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description for public participants..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                  />
                </div>
              </div>

              {/* 2. Schedule */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Event Schedule & Live Dates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registration Start Date *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registration End Date *</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3.5">
                    <label className="block text-xs font-extrabold text-blue-950 mb-1 flex items-center gap-1.5">
                      <Gift size={14} className="text-blue-800" />
                      Live Date (NABL Lab Calibration) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={liveDateTimeNabl}
                      onChange={(e) => setLiveDateTimeNabl(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium mt-1"
                    />
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5">
                    <label className="block text-xs font-extrabold text-emerald-950 mb-1 flex items-center gap-1.5">
                      <Gift size={14} className="text-emerald-800" />
                      Live Date (Total Station Calibration) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={liveDateTimeTs}
                      onChange={(e) => setLiveDateTimeTs(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-900 font-medium mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Prize Section 3A: NABL Lab Calibration */}
              <div className="space-y-3 bg-blue-50/40 border border-blue-100 rounded-2xl p-4">
                <div>
                  <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Gift size={16} /> 3A. NABL Lab Calibration Prizes (5 Winners)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Configure 5 rank prizes specifically for NABL Lab Calibration customers.</p>
                </div>

                <div className="space-y-2.5">
                  {prizesNabl.map((p, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-16 h-8 bg-blue-900 text-white font-extrabold text-xs rounded-xl flex items-center justify-center shrink-0">
                        Rank {p.rank}
                      </div>

                      <input
                        type="text"
                        placeholder={`Prize Name for Rank ${p.rank} (e.g. Smart Watch, Laptop)...`}
                        value={p.name}
                        onChange={(e) => handlePrizeChange(setPrizesNabl, index, 'name', e.target.value)}
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 font-medium"
                      />

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <input
                          id={`nabl-prize-img-${index}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePrizeImageUpload(setPrizesNabl, e, index, 'nabl')}
                        />
                        <label
                          htmlFor={`nabl-prize-img-${index}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        >
                          <Upload size={12} className="text-blue-900" />
                          <span>{p.image ? 'Change' : 'Picture'}</span>
                        </label>

                        {p.image && (
                          <div className="w-8 h-8 rounded-lg border border-blue-500 overflow-hidden bg-white p-0.5 shrink-0">
                            <img src={p.image} alt={`Rank ${p.rank}`} className="w-full h-full object-contain rounded-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Prize Section 3B: Total Station Calibration */}
              <div className="space-y-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4">
                <div>
                  <h3 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Gift size={16} /> 3B. Total Station Calibration Prizes (5 Winners)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Configure 5 rank prizes specifically for Total Station Calibration customers.</p>
                </div>

                <div className="space-y-2.5">
                  {prizesTs.map((p, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-16 h-8 bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center shrink-0">
                        Rank {p.rank}
                      </div>

                      <input
                        type="text"
                        placeholder={`Prize Name for Rank ${p.rank} (e.g. Smartphone, LED TV)...`}
                        value={p.name}
                        onChange={(e) => handlePrizeChange(setPrizesTs, index, 'name', e.target.value)}
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-900 font-medium"
                      />

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <input
                          id={`ts-prize-img-${index}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePrizeImageUpload(setPrizesTs, e, index, 'ts')}
                        />
                        <label
                          htmlFor={`ts-prize-img-${index}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        >
                          <Upload size={12} className="text-emerald-900" />
                          <span>{p.image ? 'Change' : 'Picture'}</span>
                        </label>

                        {p.image && (
                          <div className="w-8 h-8 rounded-lg border border-emerald-500 overflow-hidden bg-white p-0.5 shrink-0">
                            <img src={p.image} alt={`Rank ${p.rank}`} className="w-full h-full object-contain rounded-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer (Fixed, Non-scrollable) */}
        {!createdEvent && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer shadow-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="create-event-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {isSubmitting ? 'Uploading Images & Saving...' : editingEvent ? 'Save Changes' : 'Save & Select'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
