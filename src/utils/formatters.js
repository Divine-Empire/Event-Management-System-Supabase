/**
 * Formats a number or string into a 3-digit invoice string (e.g. 7 -> "007", 42 -> "042").
 */
export const formatInvoiceNo = (num) => {
  if (num === null || num === undefined) return "000";
  return String(num).padStart(3, "0");
};

/**
 * Safely parses any date string (ISO, datetime-local, timestamp) into a valid Date object.
 * Handles missing seconds in datetime-local (e.g. "2026-07-28T13:00" -> "2026-07-28T13:00:00").
 */
export const parseEventDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let str = String(dateInput).trim();
  
  // Append :00 seconds if string matches YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    str += ':00';
  }
  // Replace space with T if YYYY-MM-DD HH:mm:ss
  str = str.replace(' ', 'T');

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) return new Date(timestamp);

  return null;
};

/**
 * Computes exact real-time event status: 'UPCOMING' | 'LIVE' | 'ENDED'
 */
export const getEventRealtimeStatus = (event, nowInput) => {
  const now = nowInput instanceof Date ? nowInput : new Date();
  if (!event) return 'UPCOMING';

  const parsedStart = parseEventDate(event.startDate);
  const parsedEnd = parseEventDate(event.endDate);

  if (parsedStart && now < parsedStart) return 'UPCOMING';
  if (parsedEnd && now > parsedEnd) return 'ENDED';
  if (parsedStart && parsedEnd && now >= parsedStart && now <= parsedEnd) return 'LIVE';

  return 'LIVE';
};

/**
 * Formats a Date object or date string into DD-MM-YYYY (e.g. 15-08-2026).
 */
export const formatDateOnly = (dateInput) => {
  if (!dateInput) return "N/A";
  const date = parseEventDate(dateInput);
  if (!date) return "N/A";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Formats a Date object or date string into DD-MM-YYYY HH:mm (e.g. 15-08-2026 05:35).
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return "N/A";
  const date = parseEventDate(dateInput);
  if (!date) return "N/A";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};
