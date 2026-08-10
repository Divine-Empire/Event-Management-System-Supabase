import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export array of data to CSV file
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

/**
 * Export array of data to Excel (.xlsx) file
 */
export const exportToExcel = (data, filename = 'export.xlsx', sheetName = 'Data') => {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, filename);
};

/**
 * Export tabular data to PDF document
 */
export const exportToPDF = (title, columns, rows, filename = 'export.pdf') => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  doc.autoTable({
    startY: 34,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [11, 37, 103], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9 }
  });

  doc.save(filename);
};
