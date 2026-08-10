import React from 'react';
import { useEvent } from '@/context/EventContext';
import { History, Download, Trophy } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export const WinnerHistoryPage = () => {
  const { winners } = useEvent();

  const handleExportCSV = () => {
    const data = winners.map(w => ({
      "Rank": w.rank,
      "Prize": w.prizeName || `Rank ${w.rank}`,
      "Invoice No": w.invoiceNo,
      "Name": w.name,
      "Phone": w.phone,
      "Draw Time": formatDateTime(w.drawTime)
    }));
    exportToCSV(data, 'Winners_History.csv');
  };

  const handleExportExcel = () => {
    const data = winners.map(w => ({
      "Rank": w.rank,
      "Prize": w.prizeName || `Rank ${w.rank}`,
      "Invoice No": w.invoiceNo,
      "Name": w.name,
      "Phone": w.phone,
      "Draw Time": formatDateTime(w.drawTime)
    }));
    exportToExcel(data, 'Winners_History.xlsx', 'Winners');
  };

  const handleExportPDF = () => {
    const columns = ["Rank", "Prize", "Invoice", "Name", "Phone", "Draw Time"];
    const rows = winners.map(w => [
      `Rank ${w.rank}`,
      w.prizeName || `Rank ${w.rank}`,
      `#${w.invoiceNo}`,
      w.name,
      w.phone,
      formatDateTime(w.drawTime)
    ]);
    exportToPDF("Lucky Draw - Published Winners Roster", columns, rows, 'Winners_History.pdf');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-900 flex items-center gap-2">
            <History size={26} className="text-blue-600" /> Published Winner History
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Permanently stored winner history across all 5 ranks with export controls.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Download size={14} /> Export:</span>
          <button className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-900 hover:text-white transition-all cursor-pointer" onClick={handleExportCSV}>CSV</button>
          <button className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-900 hover:text-white transition-all cursor-pointer" onClick={handleExportExcel}>Excel</button>
          <button className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-900 hover:text-white transition-all cursor-pointer" onClick={handleExportPDF}>PDF</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 font-extrabold text-slate-700 uppercase">
              <tr>
                <th className="px-3 sm:px-4 py-3">Rank</th>
                <th className="px-3 sm:px-4 py-3">Prize Name</th>
                <th className="px-3 sm:px-4 py-3">Invoice No.</th>
                <th className="px-3 sm:px-4 py-3">Winner Name</th>
                <th className="px-3 sm:px-4 py-3 hidden sm:table-cell">Phone Number</th>
                <th className="px-3 sm:px-4 py-3 hidden sm:table-cell">Draw Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {winners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">No winners published yet.</td>
                </tr>
              ) : (
                winners.map(w => (
                  <tr key={w.rank} className="bg-emerald-50/60 hover:bg-emerald-50">
                    <td className="px-3 sm:px-4 py-3 font-black text-emerald-800 whitespace-nowrap">Rank {w.rank}</td>
                    <td className="px-3 sm:px-4 py-3 font-bold text-slate-800">{w.prizeName || `Rank ${w.rank} Prize`}</td>
                    <td className="px-3 sm:px-4 py-3 font-black text-blue-900 whitespace-nowrap">#{w.invoiceNo}</td>
                    <td className="px-3 sm:px-4 py-3 font-bold text-slate-800">{w.name}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-600 hidden sm:table-cell">{w.phone}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden sm:table-cell">{formatDateTime(w.drawTime)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
