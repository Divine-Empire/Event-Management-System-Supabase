import React, { useState } from 'react';
import { parseExcelFile, generateSampleExcel } from '@/utils/excelImport';
import { eventStorage } from '@/services/eventStorage';
import { Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, RefreshCw, Lock, Clock, X, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export const ExcelImportPanel = ({ eventId, onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);

  const currentEvent = eventStorage.getEvent(eventId);

  const checkImportWindow = () => {
    if (!currentEvent) return { isAllowed: true };

    const now = new Date().getTime();

    let startMs = null;
    if (currentEvent.startDateTime) {
      startMs = new Date(currentEvent.startDateTime).getTime();
    } else if (currentEvent.startDate) {
      startMs = new Date(`${currentEvent.startDate}T00:00:00`).getTime();
    }

    let endMs = null;
    if (currentEvent.endDateTime) {
      endMs = new Date(currentEvent.endDateTime).getTime();
    } else if (currentEvent.endDate) {
      endMs = new Date(`${currentEvent.endDate}T23:59:59`).getTime();
    }

    if (startMs && now < startMs) {
      const formattedStart = currentEvent.startDateTime ? currentEvent.startDateTime.replace('T', ' at ') : currentEvent.startDate;
      return {
        isAllowed: false,
        reason: `Participant import will open on ${formattedStart}. Uploading before Start Date & Time is disabled.`
      };
    }

    if (endMs && now > endMs) {
      const formattedEnd = currentEvent.endDateTime ? currentEvent.endDateTime.replace('T', ' at ') : currentEvent.endDate;
      return {
        isAllowed: false,
        reason: `Participant import window closed on ${formattedEnd}. Uploading after End Date & Time is disabled.`
      };
    }

    return { isAllowed: true };
  };

  const importWindow = checkImportWindow();

  const handleFileChange = async (e) => {
    if (!importWindow.isAllowed) {
      toast.error(importWindow.reason);
      return;
    }

    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const result = await parseExcelFile(selectedFile);
      setParsedData(result);
      if (result.valid.length > 0) {
        toast.success(`Parsed ${result.valid.length} valid participant records`);
      } else {
        toast.error('No valid records found in file');
      }
    } catch (err) {
      toast.error('Failed to parse Excel file. Please ensure correct format.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importWindow.isAllowed) {
      toast.error(importWindow.reason);
      return;
    }

    if (!parsedData || parsedData.valid.length === 0) {
      toast.error('No valid records to import. Please select an Excel file first.');
      return;
    }

    if (onImportComplete) {
      onImportComplete(parsedData.valid, replaceMode);
      toast.success(`Successfully imported ${parsedData.valid.length} participants!`);
      setFile(null);
      setParsedData(null);
      if (onClose) onClose();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header Bar - Fixed */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-blue-950">Import Participant Excel File</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload Excel (.xlsx, .xls, .csv) with Name, Mobile, and Invoice.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={generateSampleExcel}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition-all cursor-pointer"
          >
            <Download size={14} />
            Sample Excel
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Middle Scrollable Body */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1">
        
        {/* Date Window Banner */}
        {!importWindow.isAllowed ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h4 className="font-extrabold uppercase text-amber-950">Participant Import Restricted</h4>
              <p className="text-amber-800 font-medium mt-0.5">{importWindow.reason}</p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs font-bold text-emerald-900">
            <span className="flex items-center gap-2">
              <Clock size={15} className="text-emerald-600" />
              Import Window Active for this event.
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Ends: {currentEvent?.endDateTime ? currentEvent.endDateTime.replace('T', ' at ') : currentEvent?.endDate || 'N/A'}
            </span>
          </div>
        )}

        {/* File Dropzone */}
        <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          !importWindow.isAllowed 
            ? 'bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed' 
            : parsedData
            ? 'border-emerald-300 bg-emerald-50/30'
            : 'border-slate-300 bg-slate-50/50 hover:border-blue-500 cursor-pointer'
        }`}>
          <input
            type="file"
            id="excel-upload-panel"
            accept=".xlsx,.xls,.csv"
            disabled={!importWindow.isAllowed}
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="excel-upload-panel" className={`flex flex-col items-center gap-2 ${!importWindow.isAllowed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${parsedData ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-900'}`}>
              {parsedData ? <FileCheck size={20} /> : <FileSpreadsheet size={20} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {!importWindow.isAllowed ? 'Excel Upload Disabled' : (file ? file.name : 'Click to select Excel file')}
              </p>
              <p className="text-[11px] text-slate-500">Supports XLSX, XLS, CSV files</p>
            </div>
          </label>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-500">
            <RefreshCw size={16} className="animate-spin text-blue-900" />
            Parsing Excel rows...
          </div>
        )}

        {/* Parse Preview */}
        {parsedData && importWindow.isAllowed && (
          <div className="space-y-3">
            {/* Summary Badges */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200 font-bold">
                <CheckCircle size={14} />
                {parsedData.valid.length} Valid Records
              </span>
              {parsedData.errors.length > 0 && (
                <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl border border-amber-200 font-bold">
                  <AlertTriangle size={14} />
                  {parsedData.errors.length} Errors Skipped
                </span>
              )}
            </div>

            {/* Valid Records Preview Table */}
            {parsedData.valid.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto text-xs shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0">
                    <tr>
                      <th className="p-2 border-b border-slate-200">#</th>
                      <th className="p-2 border-b border-slate-200">Customer Name</th>
                      <th className="p-2 border-b border-slate-200">Phone Number</th>
                      <th className="p-2 border-b border-slate-200">Invoice Number</th>
                      <th className="p-2 border-b border-slate-200">Lucky Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedData.valid.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-500">{row.serialNumber || idx + 1}</td>
                        <td className="p-2 text-slate-900 font-bold">{row.customerName}</td>
                        <td className="p-2 text-slate-600">{row.mobile}</td>
                        <td className="p-2 font-mono text-blue-900 font-extrabold">#{row.invoiceNumber}</td>
                        <td className="p-2 font-mono text-emerald-700 font-bold">{row.luckyNumber ? `#${row.luckyNumber}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.valid.length > 10 && (
                  <div className="p-1.5 text-center text-slate-400 bg-slate-50 border-t border-slate-100 text-[11px] font-semibold">
                    + {parsedData.valid.length - 10} more records ready to import
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Footer Bar */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={replaceMode}
            onChange={(e) => setReplaceMode(e.target.checked)}
            className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
          />
          <span>Replace existing participants</span>
        </label>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!parsedData || parsedData.valid.length === 0}
            onClick={handleConfirmImport}
            className="bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:opacity-60 text-white font-extrabold px-5 py-2 rounded-xl transition-all shadow-sm text-xs cursor-pointer flex items-center gap-2 disabled:cursor-not-allowed"
          >
            <Upload size={14} />
            Confirm Import ({parsedData?.valid?.length || 0})
          </button>
        </div>
      </div>
    </div>
  );
};
