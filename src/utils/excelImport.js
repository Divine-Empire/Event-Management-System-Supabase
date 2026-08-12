import * as XLSX from 'xlsx';

// Helper to extract field value by trying multiple candidate header names case-insensitively without spaces
const getFieldValue = (row, candidateNames) => {
  const keys = Object.keys(row);
  for (const name of candidateNames) {
    const targetClean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = keys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = String(row[foundKey]).trim();
      if (val !== '') return val;
    }
  }
  return '';
};

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const validRows = [];
        const errors = [];

        json.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1

          const serialNumber = getFieldValue(row, ['Serial Number', 'SerialNumber', 'S.No', 'SNo', 'S No', 'Sr No', 'Sr.No', 'Sl No']);
          const customerName = getFieldValue(row, ['Customer Name', 'CustomerName', 'Name', 'Customer', 'Client Name']);
          const mobile = getFieldValue(row, ['Phone Number', 'PhoneNumber', 'Mobile Number', 'MobileNumber', 'Phone', 'Mobile', 'Contact', 'Phone No', 'Mobile No']);
          const invoiceNumber = getFieldValue(row, ['Invoice Number', 'InvoiceNumber', 'Invoice', 'InvoiceNo', 'Invoice No', 'Bill Number', 'Bill No']);
          const luckyNumber = getFieldValue(row, ['Lucky Number', 'LuckyNumber', 'Lucky No', 'LuckyNo', 'Lucky', 'Token Number', 'Token']);

          if (!serialNumber && !customerName && !mobile && !invoiceNumber && !luckyNumber) {
            return; // skip completely empty rows
          }

          const rowErrors = [];
          if (!invoiceNumber) rowErrors.push('Missing Invoice Number');
          if (!customerName) rowErrors.push('Missing Customer Name');
          if (!mobile) rowErrors.push('Missing Phone / Mobile Number');

          if (rowErrors.length > 0) {
            errors.push({ rowNum, row, reasons: rowErrors });
          } else {
            validRows.push({
              serialNumber: serialNumber || String(index + 1),
              customerName,
              mobile,
              invoiceNumber,
              luckyNumber: luckyNumber ? String(luckyNumber).padStart(3, '0') : null,
              joined: false,
              joinedAt: null,
              participating: true
            });
          }
        });

        resolve({ valid: validRows, errors });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const generateSampleExcel = () => {
  const sampleData = [
    { 'Serial Number': '1', 'Customer Name': 'Rahul Sharma', 'Phone Number': '9876543210', 'Invoice Number': '001', 'Lucky Number': '101' },
    { 'Serial Number': '2', 'Customer Name': 'Priya Patel', 'Phone Number': '9812345678', 'Invoice Number': '002', 'Lucky Number': '102' },
    { 'Serial Number': '3', 'Customer Name': 'Amit Kumar', 'Phone Number': '9988776655', 'Invoice Number': '003', 'Lucky Number': '103' },
    { 'Serial Number': '4', 'Customer Name': 'Sneha Gupta', 'Phone Number': '9765432109', 'Invoice Number': '004', 'Lucky Number': '104' },
    { 'Serial Number': '5', 'Customer Name': 'Vikram Singh', 'Phone Number': '9654321098', 'Invoice Number': '005', 'Lucky Number': '105' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
  
  XLSX.writeFile(workbook, 'Sample_Participants_Import.xlsx');
};
