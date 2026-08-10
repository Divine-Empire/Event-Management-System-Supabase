import React from 'react';
import { AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { ParticipantEventShell, ParticipantBlockedNotice } from '@/components/participant/ParticipantEventShell';
import { useParticipantEvent } from '@/context/ParticipantEventContext';

export const ParticipantVerificationPage = () => {
  const {
    isLoading,
    event,
    name,
    setName,
    mobile,
    setMobile,
    invoiceNumber,
    setInvoiceNumber,
    serviceType,
    setServiceType,
    isSubmitting,
    notFound,
    computedStatus,
    handleRegisterOrVerify
  } = useParticipantEvent();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 gap-3">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading Event Details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white border border-slate-200 p-6 rounded-3xl shadow-md">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Event Not Found</h2>
          <p className="text-slate-500 text-xs mb-4">The event link you followed is invalid or has expired.</p>
          <a href="/admin/login" className="text-xs font-bold text-blue-900 hover:underline">Organizer Login</a>
        </div>
      </div>
    );
  }

  if (computedStatus === 'LIVE' || computedStatus === 'ENDED') {
    return (
      <ParticipantEventShell showPrizePreview={false}>
        <ParticipantBlockedNotice />
      </ParticipantEventShell>
    );
  }

  return (
    <ParticipantEventShell showPrizePreview={false}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Participant Registration & Verification</h2>
              <p className="text-[11px] text-slate-500">Register with your Name, Mobile, Invoice Number, and Service Type to enter the lucky draw</p>
            </div>
          </div>

          <form onSubmit={handleRegisterOrVerify} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Full Customer Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 font-medium" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Mobile Number *</label>
                <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. 9876543210"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 font-medium" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Invoice Number *</label>
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. 001 or INV-1001"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 font-medium font-mono" required />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600">Service Type *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceType('NABL_CALIBRATION')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      serviceType === 'NABL_CALIBRATION'
                        ? 'bg-blue-50/90 border-blue-600 text-blue-950 shadow-xs ring-1 ring-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        serviceType === 'NABL_CALIBRATION' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {serviceType === 'NABL_CALIBRATION' && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span>1. NABL Lab Calibration</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md shrink-0">NABL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceType('TOTAL_STATION_CALIBRATION')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      serviceType === 'TOTAL_STATION_CALIBRATION'
                        ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        serviceType === 'TOTAL_STATION_CALIBRATION' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {serviceType === 'TOTAL_STATION_CALIBRATION' && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span>2. Total Station Calibration</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">TS</span>
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm mt-1 disabled:opacity-50">
              <ShieldCheck size={16} />
              {isSubmitting ? 'Registering...' : 'Register / Check Status'}
            </button>
          </form>

          {notFound && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-900 mt-1">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Registration Failed</p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Could not complete registration. Please check your Name, Mobile, and Invoice details and try again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ParticipantEventShell>
  );
};
