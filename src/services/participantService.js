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
      const { data } = await supabase
        .from('event_participants')
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      if (data) return mapParticipantFromDb(data);

      const table = getTableForServiceType(serviceType);
      const { data: subData } = await supabase
        .from(table)
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      return mapParticipantFromDb(subData);
    } catch (err) {
      console.error('getParticipantById exception:', err);
      return null;
    }
  },

  getParticipants: async (eventId, serviceType = null) => {
    if (!eventId) return [];

    try {
      let query = supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId);

      if (serviceType && serviceType !== 'ALL') {
        query = query.eq('service_type', normalizeServiceType(serviceType));
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(p => mapParticipantFromDb(p));
      }

      // Fallback: If event_participants has no data, query sub-tables
      if (serviceType && serviceType !== 'ALL') {
        const table = getTableForServiceType(serviceType);
        const { data: subData } = await supabase.from(table).select('*').eq('event_id', eventId);
        return (subData || []).map(p => mapParticipantFromDb({ ...p, service_type: normalizeServiceType(serviceType) }));
      }

      const [nablRes, tsRes] = await Promise.all([
        supabase.from('event_participants_nabl').select('*').eq('event_id', eventId),
        supabase.from('event_participants_ts').select('*').eq('event_id', eventId)
      ]);

      const nablList = (nablRes.data || []).map(p => mapParticipantFromDb({ ...p, service_type: 'NABL' }));
      const tsList = (tsRes.data || []).map(p => mapParticipantFromDb({ ...p, service_type: 'TOTAL_STATION' }));

      const combined = new Map();
      [...nablList, ...tsList].forEach(p => {
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

  loginParticipantByMobileAndInvoice: async (eventId, { mobile, invoiceNumber }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const cleanMobile = normMobile(mobile);
    const cleanInvoice = normInvoice(invoiceNumber);

    const list = await participantService.getParticipants(eventId, 'ALL');
    const matched = list.find(p => 
      normMobile(p.mobile || p.phone) === cleanMobile && 
      isInvoiceMatch(p.invoiceNumber || p.invoiceNo, cleanInvoice)
    );

    return matched || null;
  },

  registerParticipant: async (eventId, { name, mobile, invoiceNumber, serviceType, luckyNumber }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const sType = normalizeServiceType(serviceType);

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

      if (cleanLuckyNumber && (!targetParticipant.luckyNumber || targetParticipant.luckyNumber !== cleanLuckyNumber)) {
        const { data: updated } = await supabase
          .from('event_participants')
          .update({ lucky_number: cleanLuckyNumber })
          .eq('id', targetParticipant.id)
          .select()
          .maybeSingle();

        const subTable = getTableForServiceType(sType);
        await supabase.from(subTable).update({ lucky_number: cleanLuckyNumber }).eq('id', targetParticipant.id).catch(() => {});

        if (updated) return mapParticipantFromDb(updated);
      }

      return targetParticipant;
    }

    if (byMobile) {
      throw new Error('MOBILE_ALREADY_REGISTERED');
    }

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
      .from('event_participants')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error registering participant:', error);
      return null;
    }

    // Secondary sync into sub-table without service_type column
    const subTable = getTableForServiceType(sType);
    const { service_type, ...subPayload } = payload;
    await supabase.from(subTable).insert([{ ...subPayload, participant_id: id }]).catch(() => {});

    return mapParticipantFromDb(data);
  },

  updateParticipant: async (eventId, participantId, { name, mobile, invoiceNumber, serviceType, luckyNumber, participating }) => {
    if (!eventId || !participantId) return null;
    const sType = normalizeServiceType(serviceType);

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
        .from('event_participants')
        .update(updatedPayload)
        .eq('id', participantId)
        .select()
        .maybeSingle();

      const subTable = getTableForServiceType(sType);
      const { service_type, ...subPayload } = updatedPayload;
      await supabase.from(subTable).update(subPayload).eq('id', participantId).catch(() => {});

      if (error) {
        console.error('Error updating participant:', error);
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

    try {
      if (replaceMode) {
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('service_type', sType);

        const subTable = getTableForServiceType(sType);
        await supabase
          .from(subTable)
          .delete()
          .eq('event_id', eventId);
      }

      const existing = await participantService.getParticipants(eventId, sType);
      const existingInvoices = new Set(existing.map(p => `${normInvoice(p.invoiceNumber)}_${normMobile(p.mobile)}`));

      const freshEntries = rawList
        .filter(item => {
          const inv = normInvoice(item.invoiceNumber || item['Invoice Number'] || item.invoiceNo);
          const mob = normMobile(item.mobile || item['Mobile Number'] || item.phone);
          return inv && mob && !existingInvoices.has(`${inv}_${mob}`);
        })
        .map((item, idx) => {
          const cleanInv = String(item.invoiceNumber || item['Invoice Number'] || item.invoiceNo || '').trim();
          const cleanMob = String(item.mobile || item['Mobile Number'] || item.phone || '').trim();
          const cleanName = String(item.customerName || item['Customer Name'] || item.name || '').trim();
          const cleanLucky = item.luckyNumber ? String(item.luckyNumber).trim().padStart(3, '0') : null;

          return {
            id: item.id || `usr_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
            event_id: eventId,
            invoice_number: cleanInv,
            customer_name: cleanName,
            mobile: cleanMob,
            service_type: sType,
            participating: item.participating !== undefined ? Boolean(item.participating) : true,
            joined: Boolean(item.joined),
            joined_at: item.joinedAt || null,
            lucky_number: cleanLucky,
            winner: Boolean(item.winner),
            winner_rank: item.winnerRank || null,
            prize_name: item.prizeName || null,
            published: Boolean(item.published),
            drawn_at: item.drawnAt || null
          };
        });

      if (freshEntries.length > 0) {
        // 1. Insert into main event_participants table (triggers DB trg_sync_participant to sync to sub-tables)
        const { error: mainErr } = await supabase
          .from('event_participants')
          .insert(freshEntries);

        if (mainErr) {
          console.error('Supabase importParticipants main table error:', mainErr);
        }

        // 2. Also insert into sub-table (event_participants_nabl / event_participants_ts) omitting service_type
        const subTable = getTableForServiceType(sType);
        const subEntries = freshEntries.map(e => {
          const { service_type, ...rest } = e;
          return { ...rest, participant_id: e.id };
        });

        await supabase
          .from(subTable)
          .insert(subEntries)
          .catch(() => {});
      }

      return await participantService.getParticipants(eventId, sType);
    } catch (err) {
      console.error('importParticipants exception:', err);
      return [];
    }
  },

  toggleParticipation: async (eventId, participantId, serviceType = null) => {
    if (!eventId || !participantId) return null;

    try {
      const { data: existing } = await supabase
        .from('event_participants')
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      if (existing) {
        if (existing.joined) return null;
        const updatedStatus = !existing.participating;

        const { data, error } = await supabase
          .from('event_participants')
          .update({ participating: updatedStatus })
          .eq('id', participantId)
          .select()
          .maybeSingle();

        const sType = existing.service_type || serviceType;
        const subTable = getTableForServiceType(sType);
        await supabase.from(subTable).update({ participating: updatedStatus }).eq('id', participantId).catch(() => {});

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

    try {
      const { data } = await supabase
        .from('event_participants')
        .update({ lucky_number: formattedNum })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      const subTable = getTableForServiceType(serviceType);
      await supabase.from(subTable).update({ lucky_number: formattedNum }).eq('id', participantId).catch(() => {});

      if (data) return mapParticipantFromDb(data);
    } catch (err) {
      console.error('assignLuckyNumber exception:', err);
    }
    return null;
  },

  markJoined: async (eventId, participantId, serviceType = null) => {
    if (!eventId || !participantId) return null;

    try {
      const { data } = await supabase
        .from('event_participants')
        .update({
          joined: true,
          joined_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      const subTable = getTableForServiceType(serviceType);
      await supabase.from(subTable).update({ joined: true, joined_at: new Date().toISOString() }).eq('id', participantId).catch(() => {});

      if (data) return mapParticipantFromDb(data);
    } catch (err) {
      console.error('markJoined exception:', err);
    }
    return null;
  },

  deleteParticipant: async (eventId, participantId, serviceType = null) => {
    if (!participantId) return [];

    try {
      await supabase.from('event_participants').delete().eq('id', participantId);
      const subTable = getTableForServiceType(serviceType);
      await supabase.from(subTable).delete().eq('id', participantId).catch(() => {});
    } catch (err) {
      console.error('delete participant exception:', err);
    }

    return await participantService.getParticipants(eventId, serviceType);
  },

  bulkUpdateParticipation: async (eventId, participantIds = [], targetStatus, serviceType = null) => {
    if (!eventId || !Array.isArray(participantIds) || participantIds.length === 0) return [];

    try {
      await supabase
        .from('event_participants')
        .update({ participating: Boolean(targetStatus) })
        .in('id', participantIds)
        .is('joined_at', null);

      const subTable = getTableForServiceType(serviceType);
      await supabase
        .from(subTable)
        .update({ participating: Boolean(targetStatus) })
        .in('id', participantIds)
        .is('joined_at', null)
        .catch(() => {});
    } catch (err) {
      console.error('bulkUpdateParticipation exception:', err);
    }
    return await participantService.getParticipants(eventId, serviceType);
  },

  bulkDeleteParticipants: async (eventId, participantIds = [], serviceType = null) => {
    if (!eventId || !Array.isArray(participantIds) || participantIds.length === 0) return [];

    try {
      await supabase
        .from('event_participants')
        .delete()
        .in('id', participantIds);

      const subTable = getTableForServiceType(serviceType);
      await supabase
        .from(subTable)
        .delete()
        .in('id', participantIds)
        .catch(() => {});
    } catch (err) {
      console.error('bulkDeleteParticipants exception:', err);
    }
    return await participantService.getParticipants(eventId, serviceType);
  },

  // --- Winners Functionality ---
  getWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    try {
      const sType = normalizeServiceType(serviceType);
      let query = supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('service_type', sType)
        .eq('winner', true)
        .order('winner_rank', { ascending: true });

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(p => mapParticipantFromDb(p));
      }

      const table = getTableForServiceType(sType);
      const { data: subData } = await supabase
        .from(table)
        .select('*')
        .eq('event_id', eventId)
        .eq('winner', true)
        .order('winner_rank', { ascending: true });

      return (subData || []).map(p => mapParticipantFromDb({ ...p, service_type: sType }));
    } catch (err) {
      console.error('getWinners exception:', err);
      return [];
    }
  },

  saveWinners: async (eventId, winnersList, serviceType = 'NABL') => {
    if (!eventId || !Array.isArray(winnersList)) return [];
    const sType = normalizeServiceType(serviceType);
    const table = getTableForServiceType(sType);

    try {
      for (const w of winnersList) {
        const targetParticipants = Array.isArray(w.winners) && w.winners.length > 0
          ? w.winners
          : [w];

        for (const tp of targetParticipants) {
          const pId = tp.id || tp.participantId || w.participantId || w.id;
          if (pId) {
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

            await supabase
              .from(table)
              .update({
                winner: true,
                winner_rank: Number(w.rank || w.winnerRank || tp.winnerRank),
                prize_name: w.prizeName || w.name || tp.prizeName,
                published: true,
                drawn_at: w.drawnAt || new Date().toISOString()
              })
              .eq('id', pId)
              .catch(() => {});
          }
        }
      }
      return await participantService.getWinners(eventId, sType);
    } catch (err) {
      console.error(`saveWinners exception on ${table}:`, err);
      return [];
    }
  },

  publishWinners: async (eventId, unPublishedWinners, serviceType = null) => {
    if (!eventId) return [];
    const sType = normalizeServiceType(serviceType);
    try {
      await supabase
        .from('event_participants')
        .update({ published: true })
        .eq('event_id', eventId)
        .eq('service_type', sType)
        .eq('winner', true);

      const table = getTableForServiceType(sType);
      await supabase
        .from(table)
        .update({ published: true })
        .eq('event_id', eventId)
        .eq('winner', true)
        .catch(() => {});

      return await participantService.getWinners(eventId, sType);
    } catch (err) {
      console.error(`publishWinners exception:`, err);
      return [];
    }
  },

  resetWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    const sType = normalizeServiceType(serviceType);
    try {
      await supabase
        .from('event_participants')
        .update({
          winner: false,
          winner_rank: null,
          prize_name: null,
          published: false,
          drawn_at: null
        })
        .eq('event_id', eventId)
        .eq('service_type', sType);

      const table = getTableForServiceType(sType);
      await supabase
        .from(table)
        .update({
          winner: false,
          winner_rank: null,
          prize_name: null,
          published: false,
          drawn_at: null
        })
        .eq('event_id', eventId)
        .catch(() => {});

      return [];
    } catch (err) {
      console.error(`resetWinners exception:`, err);
      return [];
    }
  }
};
