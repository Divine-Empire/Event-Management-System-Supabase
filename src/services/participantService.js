import { supabase } from '@/lib/supabase';

const normInvoice = str => String(str || '').trim().toUpperCase().replace(/^#+\s*/, '');
const normMobile = str => String(str || '').trim().replace(/\D/g, '');
const normName = str => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

const isInvoiceMatch = (inv1, inv2) => {
  const n1 = normInvoice(inv1);
  const n2 = normInvoice(inv2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (/^\d+$/.test(n1) && /^\d+$/.test(n2)) {
    return Number(n1) === Number(n2);
  }
  return false;
};

const normalizeServiceType = (serviceType) => {
  if (!serviceType) return 'NABL';
  const s = String(serviceType).toUpperCase().trim();
  if (s.includes('TOTAL') || s === 'TS' || s === 'TOTAL_STATION_CALIBRATION' || s === 'EVENT_PARTICIPANTS_TS') {
    return 'TOTAL_STATION';
  }
  return 'NABL';
};

const getTableForServiceType = (serviceType) => {
  if (!serviceType) return 'event_participants_nabl';
  const sType = normalizeServiceType(serviceType);
  return sType === 'TOTAL_STATION' ? 'event_participants_ts' : 'event_participants_nabl';
};

const mapParticipantFromDb = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    eventId: p.event_id,
    invoiceNumber: p.invoice_number || 'N/A',
    invoiceNo: p.invoice_number || 'N/A',
    customerName: p.customer_name || 'Anonymous',
    name: p.customer_name || 'Anonymous',
    mobile: String(p.mobile || '').trim(),
    phone: String(p.mobile || '').trim(),
    serviceType: p.service_type || 'NABL',
    participating: Boolean(p.participating),
    joined: Boolean(p.joined),
    joinedAt: p.joined_at || null,
    luckyNumber: p.lucky_number != null ? String(p.lucky_number).padStart(3, '0') : null,
    winner: Boolean(p.winner),
    winnerRank: p.winner_rank || null,
    rank: p.winner_rank || null,
    prizeName: p.prize_name || null,
    published: Boolean(p.published),
    drawnAt: p.drawn_at || null,
    participantId: p.id
  };
};

export const participantService = {
  getParticipantById: async (participantId, serviceType = null) => {
    if (!participantId) return null;
    try {
      const table = getTableForServiceType(serviceType);
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      if (data) return mapParticipantFromDb(data);

      // Fallback check legacy table
      const { data: legacyData } = await supabase
        .from('event_participants')
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      return mapParticipantFromDb(legacyData);
    } catch (err) {
      console.error('getParticipantById exception:', err);
      return null;
    }
  },

  getParticipants: async (eventId, serviceType = null) => {
    if (!eventId) return [];

    try {
      if (serviceType && serviceType !== 'ALL') {
        const table = getTableForServiceType(serviceType);
        const sType = normalizeServiceType(serviceType);
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('event_id', eventId);

        if (error) {
          console.error(`Supabase getParticipants error on ${table}:`, error);
          return [];
        }
        return (data || []).map(p => mapParticipantFromDb({ ...p, service_type: sType }));
      }

      // Query both NABL and TS tables (and legacy table) when serviceType is null or ALL
      const [nablRes, tsRes, legacyRes] = await Promise.all([
        supabase.from('event_participants_nabl').select('*').eq('event_id', eventId),
        supabase.from('event_participants_ts').select('*').eq('event_id', eventId),
        supabase.from('event_participants').select('*').eq('event_id', eventId)
      ]);

      const nablList = (nablRes.data || []).map(p => mapParticipantFromDb({ ...p, service_type: 'NABL' }));
      const tsList = (tsRes.data || []).map(p => mapParticipantFromDb({ ...p, service_type: 'TOTAL_STATION' }));
      const legacyList = (legacyRes.data || []).map(p => mapParticipantFromDb(p));

      const combined = new Map();
      [...nablList, ...tsList, ...legacyList].forEach(p => {
        if (p && p.id && !combined.has(p.id)) {
          combined.set(p.id, p);
        }
      });

      return Array.from(combined.values());
    } catch (err) {
      console.error('getParticipants exception:', err);
      return [];
    }
  },

  verifyRegistrationDetails: async (eventId, { name, mobile, invoiceNumber, serviceType }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const sType = normalizeServiceType(serviceType);

    const cleanName = normName(name);
    const cleanMobile = normMobile(mobile);
    const cleanInvoice = normInvoice(invoiceNumber);

    // Fetch participants strictly for the requested serviceType
    const list = await participantService.getParticipants(eventId, sType);

    const byInvoice = list.find(p => isInvoiceMatch(p.invoiceNumber || p.invoiceNo, cleanInvoice));
    const byMobile = list.find(p => normMobile(p.mobile || p.phone) === cleanMobile);

    if (byInvoice) {
      const dbMobile = normMobile(byInvoice.mobile || byInvoice.phone);
      const dbName = normName(byInvoice.customerName || byInvoice.name);

      if (dbMobile !== cleanMobile) {
        throw new Error('INVOICE_MOBILE_MISMATCH');
      }
      if (dbName && cleanName && dbName !== cleanName && !dbName.includes(cleanName) && !cleanName.includes(dbName)) {
        throw new Error('NAME_MISMATCH');
      }

      return byInvoice;
    }

    if (byMobile) {
      if (isInvoiceMatch(byMobile.invoiceNumber || byMobile.invoiceNo, cleanInvoice)) {
        return byMobile;
      }
      throw new Error('MOBILE_ALREADY_REGISTERED');
    }

    // Not in DB yet -> Return transient object WITHOUT writing to Supabase
    return {
      isNew: true,
      id: null,
      eventId,
      customerName: String(name || '').trim(),
      name: String(name || '').trim(),
      mobile: String(mobile || '').trim(),
      invoiceNumber: String(invoiceNumber || '').trim(),
      invoiceNo: String(invoiceNumber || '').trim(),
      serviceType: sType,
      luckyNumber: null,
      participating: false,
      joined: false
    };
  },

  registerParticipant: async (eventId, { name, mobile, invoiceNumber, serviceType, luckyNumber }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const sType = normalizeServiceType(serviceType);
    const table = getTableForServiceType(sType);

    const cleanName = normName(name);
    const cleanMobile = normMobile(mobile);
    const cleanInvoice = normInvoice(invoiceNumber);
    const cleanLuckyNumber = luckyNumber != null && String(luckyNumber).trim() !== ''
      ? String(luckyNumber).trim().padStart(3, '0')
      : null;

    const list = await participantService.getParticipants(eventId, sType);

    const byInvoice = list.find(p => isInvoiceMatch(p.invoiceNumber || p.invoiceNo, cleanInvoice));
    const byMobile = list.find(p => normMobile(p.mobile || p.phone) === cleanMobile);

    const targetParticipant = byInvoice || (byMobile && isInvoiceMatch(byMobile.invoiceNumber || byMobile.invoiceNo, cleanInvoice) ? byMobile : null);

    if (targetParticipant) {
      const dbMobile = normMobile(targetParticipant.mobile || targetParticipant.phone);
      const dbName = normName(targetParticipant.customerName || targetParticipant.name);

      if (dbMobile !== cleanMobile) {
        throw new Error('INVOICE_MOBILE_MISMATCH');
      }
      if (dbName && cleanName && dbName !== cleanName && !dbName.includes(cleanName) && !cleanName.includes(dbName)) {
        throw new Error('NAME_MISMATCH');
      }

      // Update lucky_number if not set
      if (cleanLuckyNumber && (!targetParticipant.luckyNumber || targetParticipant.luckyNumber !== cleanLuckyNumber)) {
        const { data: updated, error: uErr } = await supabase
          .from(table)
          .update({ lucky_number: cleanLuckyNumber })
          .eq('id', targetParticipant.id)
          .select()
          .maybeSingle();

        await supabase
          .from('event_participants')
          .update({ lucky_number: cleanLuckyNumber })
          .eq('id', targetParticipant.id);

        if (!uErr && updated) return mapParticipantFromDb(updated);
      }

      return targetParticipant;
    }

    if (byMobile) {
      throw new Error('MOBILE_ALREADY_REGISTERED');
    }

    // Insert new participant into specific table + legacy fallback
    const id = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      id,
      event_id: eventId,
      invoice_number: String(invoiceNumber || '').trim(),
      customer_name: String(name || '').trim(),
      mobile: String(mobile || '').trim(),
      service_type: sType,
      lucky_number: cleanLuckyNumber,
      participating: false,
      joined: false,
      winner: false
    };

    const { data, error } = await supabase
      .from(table)
      .insert([payload])
      .select()
      .single();

    await supabase.from('event_participants').insert([payload]).catch(() => {});

    if (error) {
      console.error(`Error registering participant in ${table}:`, error);
      return null;
    }
    return mapParticipantFromDb(data);
  },

  updateParticipant: async (eventId, participantId, { name, mobile, invoiceNumber, serviceType, luckyNumber, participating }) => {
    if (!eventId || !participantId) return null;
    const sType = normalizeServiceType(serviceType);
    const table = getTableForServiceType(sType);

    const cleanName = String(name || '').trim();
    const cleanMobile = String(mobile || '').trim();
    const cleanInvoice = String(invoiceNumber || '').trim();
    const cleanLuckyNumber = luckyNumber != null && String(luckyNumber).trim() !== '' 
      ? String(luckyNumber).trim().padStart(3, '0') 
      : null;

    try {
      const updatedPayload = {
        customer_name: cleanName,
        mobile: cleanMobile,
        invoice_number: cleanInvoice,
        service_type: sType,
        lucky_number: cleanLuckyNumber,
        participating: participating !== undefined ? Boolean(participating) : false,
        joined: cleanLuckyNumber ? true : false
      };

      const { data, error } = await supabase
        .from(table)
        .update(updatedPayload)
        .eq('id', participantId)
        .select()
        .maybeSingle();

      await supabase
        .from('event_participants')
        .update(updatedPayload)
        .eq('id', participantId);

      if (error) {
        console.error(`Error updating participant in ${table}:`, error);
        return null;
      }
      return mapParticipantFromDb(data);
    } catch (err) {
      console.error('updateParticipant exception:', err);
      return null;
    }
  },

  importParticipants: async (eventId, rawList, replaceMode = false, serviceType = 'NABL') => {
    if (!eventId) return [];
    const sType = normalizeServiceType(serviceType);
    const table = getTableForServiceType(sType);

    try {
      if (replaceMode) {
        await supabase
          .from(table)
          .delete()
          .eq('event_id', eventId);

        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('service_type', sType);
      }

      const existing = await participantService.getParticipants(eventId, sType);
      const existingInvoices = new Set(existing.map(p => `${p.invoiceNumber}_${p.mobile}`));

      const freshEntries = rawList
        .filter(item => {
          const inv = String(item.invoiceNumber || item['Invoice Number'] || item.invoiceNo || '').trim();
          const mob = String(item.mobile || item['Mobile Number'] || item.phone || '').trim();
          return inv && mob && !existingInvoices.has(`${inv}_${mob}`);
        })
        .map((item, idx) => ({
          id: item.id || `usr_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
          event_id: eventId,
          invoice_number: String(item.invoiceNumber || item['Invoice Number'] || item.invoiceNo || '').trim(),
          customer_name: String(item.customerName || item['Customer Name'] || item.name || '').trim(),
          mobile: String(item.mobile || item['Mobile Number'] || item.phone || '').trim(),
          service_type: sType,
          participating: item.participating !== undefined ? Boolean(item.participating) : false,
          joined: Boolean(item.joined),
          joined_at: item.joinedAt || null,
          lucky_number: item.luckyNumber ? String(item.luckyNumber).padStart(3, '0') : null,
          winner: Boolean(item.winner),
          winner_rank: item.winnerRank || null,
          prize_name: item.prizeName || null,
          published: Boolean(item.published),
          drawn_at: item.drawnAt || null
        }));

      if (freshEntries.length > 0) {
        const { error } = await supabase
          .from(table)
          .insert(freshEntries);

        if (error) {
          console.error(`Supabase importParticipants error in ${table}:`, error);
        }

        await supabase.from('event_participants').insert(freshEntries).catch(() => {});
      }

      return await participantService.getParticipants(eventId, sType);
    } catch (err) {
      console.error('importParticipants exception:', err);
      return [];
    }
  },

  toggleParticipation: async (eventId, participantId, serviceType = null) => {
    if (!eventId || !participantId) return null;
    const table = getTableForServiceType(serviceType);

    try {
      let existing = null;

      const { data: d1 } = await supabase.from(table).select('*').eq('id', participantId).maybeSingle();
      existing = d1;

      if (!existing) {
        const { data: d2 } = await supabase.from('event_participants').select('*').eq('id', participantId).maybeSingle();
        existing = d2;
      }

      if (existing) {
        if (existing.joined) return null;
        const updatedStatus = !existing.participating;

        const { data, error } = await supabase
          .from(table)
          .update({ participating: updatedStatus })
          .eq('id', participantId)
          .select()
          .maybeSingle();

        await supabase
          .from('event_participants')
          .update({ participating: updatedStatus })
          .eq('id', participantId);

        if (error) {
          console.error('Supabase toggleParticipation error:', error);
          return null;
        }
        return mapParticipantFromDb(data || existing);
      }
    } catch (err) {
      console.error('toggleParticipation exception:', err);
    }
    return null;
  },

  verifyParticipant: async (eventId, { name, mobile, invoiceNumber, serviceType }) => {
    const normNameStr = str => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normMobileStr = str => String(str || '').trim().replace(/\D/g, '');

    const cleanName = normNameStr(name);
    const cleanMobile = normMobileStr(mobile);
    const cleanInvoice = normInvoice(invoiceNumber);

    if (!cleanMobile || !cleanInvoice) return null;

    const list = await participantService.getParticipants(eventId, serviceType);

    const found = list.find(p => {
      const pName = normNameStr(p.customerName || p.name);
      const pMob = normMobileStr(p.mobile || p.phone);
      const pInv = p.invoiceNumber || p.invoiceNo;

      const nameMatch = !cleanName || pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
      const mobileMatch = pMob === cleanMobile || (cleanMobile.length >= 7 && pMob.endsWith(cleanMobile)) || (pMob.length >= 7 && cleanMobile.endsWith(pMob));
      const invoiceMatch = isInvoiceMatch(pInv, cleanInvoice);

      return nameMatch && mobileMatch && invoiceMatch;
    });

    return found || null;
  },

  verifyByMobile: async (eventId, mobile, serviceType = null) => {
    const cleanMobile = String(mobile || '').trim();
    if (!cleanMobile) return null;
    const list = await participantService.getParticipants(eventId, serviceType);
    return list.find(p => p.mobile === cleanMobile || p.mobile.replace(/\D/g, '') === cleanMobile.replace(/\D/g, '')) || null;
  },

  assignLuckyNumber: async (eventId, participantId, luckyNumber, serviceType = null) => {
    if (!eventId || !participantId) return null;
    const formattedNum = String(luckyNumber).padStart(3, '0');
    const table = getTableForServiceType(serviceType);

    try {
      const { data } = await supabase
        .from(table)
        .update({ lucky_number: formattedNum })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      await supabase
        .from('event_participants')
        .update({ lucky_number: formattedNum })
        .eq('id', participantId);

      if (data) return mapParticipantFromDb(data);
    } catch (err) {
      console.error('assignLuckyNumber exception:', err);
    }
    return null;
  },

  markJoined: async (eventId, participantId, serviceType = null) => {
    if (!eventId || !participantId) return null;
    const table = getTableForServiceType(serviceType);

    try {
      const { data } = await supabase
        .from(table)
        .update({
          joined: true,
          joined_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      await supabase
        .from('event_participants')
        .update({
          joined: true,
          joined_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (data) return mapParticipantFromDb(data);
    } catch (err) {
      console.error('markJoined exception:', err);
    }
    return null;
  },

  deleteParticipant: async (eventId, participantId, serviceType = null) => {
    if (!participantId) return [];
    const table = getTableForServiceType(serviceType);

    try {
      await supabase.from(table).delete().eq('id', participantId);
      await supabase.from('event_participants').delete().eq('id', participantId);
    } catch (err) {
      console.error('delete participant exception:', err);
    }

    return await participantService.getParticipants(eventId, serviceType);
  },

  bulkUpdateParticipation: async (eventId, participantIds = [], targetStatus, serviceType = null) => {
    if (!eventId || !Array.isArray(participantIds) || participantIds.length === 0) return [];
    const table = getTableForServiceType(serviceType);

    try {
      await supabase
        .from(table)
        .update({ participating: Boolean(targetStatus) })
        .in('id', participantIds)
        .is('joined_at', null);

      await supabase
        .from('event_participants')
        .update({ participating: Boolean(targetStatus) })
        .in('id', participantIds)
        .is('joined_at', null);
    } catch (err) {
      console.error('bulkUpdateParticipation exception:', err);
    }
    return await participantService.getParticipants(eventId, serviceType);
  },

  bulkDeleteParticipants: async (eventId, participantIds = [], serviceType = null) => {
    if (!eventId || !Array.isArray(participantIds) || participantIds.length === 0) return [];
    const table = getTableForServiceType(serviceType);

    try {
      await supabase
        .from(table)
        .delete()
        .in('id', participantIds);

      await supabase
        .from('event_participants')
        .delete()
        .in('id', participantIds);
    } catch (err) {
      console.error('bulkDeleteParticipants exception:', err);
    }
    return await participantService.getParticipants(eventId, serviceType);
  },

  // --- Winners Functionality ---
  getWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    try {
      const table = serviceType ? getTableForServiceType(serviceType) : 'event_participants_nabl';
      let query = supabase
        .from(table)
        .select('*')
        .eq('event_id', eventId)
        .eq('winner', true)
        .order('winner_rank', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error(`Supabase getWinners error on ${table}:`, error);
        return [];
      }
      return (data || []).map(p => mapParticipantFromDb(p));
    } catch (err) {
      console.error('getWinners exception:', err);
      return [];
    }
  },

  saveWinners: async (eventId, winnersList, serviceType = 'NABL') => {
    if (!eventId || !Array.isArray(winnersList)) return [];
    const table = getTableForServiceType(serviceType);

    try {
      for (const w of winnersList) {
        const targetParticipants = Array.isArray(w.winners) && w.winners.length > 0
          ? w.winners
          : [w];

        for (const tp of targetParticipants) {
          const pId = tp.id || tp.participantId || w.participantId || w.id;
          if (pId) {
            await supabase
              .from(table)
              .update({
                winner: true,
                winner_rank: Number(w.rank || w.winnerRank || tp.winnerRank),
                prize_name: w.prizeName || w.name || tp.prizeName,
                published: true,
                drawn_at: w.drawnAt || new Date().toISOString()
              })
              .eq('id', pId);

            await supabase
              .from('event_participants')
              .update({
                winner: true,
                winner_rank: Number(w.rank || w.winnerRank || tp.winnerRank),
                prize_name: w.prizeName || w.name || tp.prizeName,
                published: true,
                drawn_at: w.drawnAt || new Date().toISOString()
              })
              .eq('id', pId);
          }
        }
      }
      return await participantService.getWinners(eventId, serviceType);
    } catch (err) {
      console.error(`saveWinners exception on ${table}:`, err);
      return [];
    }
  },

  publishWinners: async (eventId, unPublishedWinners, serviceType = null) => {
    if (!eventId) return [];
    const table = serviceType ? getTableForServiceType(serviceType) : 'event_participants_nabl';
    try {
      await supabase
        .from(table)
        .update({ published: true })
        .eq('event_id', eventId)
        .eq('winner', true);

      await supabase
        .from('event_participants')
        .update({ published: true })
        .eq('event_id', eventId)
        .eq('winner', true);

      return await participantService.getWinners(eventId, serviceType);
    } catch (err) {
      console.error(`publishWinners exception on ${table}:`, err);
      return [];
    }
  },

  resetWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    const table = serviceType ? getTableForServiceType(serviceType) : 'event_participants_nabl';
    try {
      await supabase
        .from(table)
        .update({
          winner: false,
          winner_rank: null,
          prize_name: null,
          published: false,
          drawn_at: null
        })
        .eq('event_id', eventId);

      await supabase
        .from('event_participants')
        .update({
          winner: false,
          winner_rank: null,
          prize_name: null,
          published: false,
          drawn_at: null
        })
        .eq('event_id', eventId);

      return [];
    } catch (err) {
      console.error(`resetWinners exception on ${table}:`, err);
      return [];
    }
  }
};
