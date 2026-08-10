import { supabase } from '@/lib/supabase';

const normalizeServiceType = (serviceType) => {
  if (!serviceType) return 'NABL';
  const s = String(serviceType).toUpperCase().trim();
  if (s.includes('TOTAL') || s === 'TS' || s === 'TOTAL_STATION_CALIBRATION' || s === 'EVENT_PARTICIPANTS_TS') {
    return 'TOTAL_STATION';
  }
  return 'NABL';
};

const getTableForServiceType = (serviceType) => {
  if (!serviceType) return 'event_participants';
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
  getParticipantById: async (participantId) => {
    if (!participantId) return null;
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      if (error || !data) {
        console.error('Supabase getParticipantById error:', error);
        return null;
      }
      return mapParticipantFromDb(data);
    } catch (err) {
      console.error('getParticipantById exception:', err);
      return null;
    }
  },

  getParticipants: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    try {
      const table = serviceType ? getTableForServiceType(serviceType) : 'event_participants';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Supabase getParticipants error on ${table}:`, error);
        return [];
      }
      return (data || []).map(p => mapParticipantFromDb(p));
    } catch (err) {
      console.error('getParticipants exception:', err);
      return [];
    }
  },

  verifyRegistrationDetails: async (eventId, { name, mobile, invoiceNumber, serviceType }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const sType = normalizeServiceType(serviceType);

    const cleanName = String(name || '').trim();
    const cleanMobile = String(mobile || '').trim();
    const cleanInvoice = String(invoiceNumber || '').trim();

    // 1. Look up by invoice number
    const { data: byInvoice } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('invoice_number', cleanInvoice)
      .maybeSingle();

    if (byInvoice) {
      const dbMobile = String(byInvoice.mobile || '').trim();
      const dbName = String(byInvoice.customer_name || '').trim().toLowerCase();
      const inputName = cleanName.toLowerCase();
      const dbServiceType = normalizeServiceType(byInvoice.service_type);

      if (dbMobile !== cleanMobile) {
        throw new Error('INVOICE_MOBILE_MISMATCH');
      }
      if (dbName !== inputName) {
        throw new Error('NAME_MISMATCH');
      }
      if (dbServiceType !== sType) {
        throw new Error('SERVICE_TYPE_MISMATCH');
      }

      return mapParticipantFromDb(byInvoice);
    }

    // 2. Look up by mobile number
    const { data: byMobile } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('mobile', cleanMobile)
      .maybeSingle();

    if (byMobile) {
      throw new Error('MOBILE_ALREADY_REGISTERED');
    }

    // 3. Not in DB yet -> Return transient object WITHOUT writing to Supabase
    return {
      isNew: true,
      id: null,
      eventId,
      customerName: cleanName,
      name: cleanName,
      mobile: cleanMobile,
      invoiceNumber: cleanInvoice,
      invoiceNo: cleanInvoice,
      serviceType: sType,
      luckyNumber: null,
      participating: false,
      joined: false
    };
  },

  registerParticipant: async (eventId, { name, mobile, invoiceNumber, serviceType, luckyNumber }) => {
    if (!eventId || !mobile || !invoiceNumber) return null;
    const sType = normalizeServiceType(serviceType);

    const cleanName = String(name || '').trim();
    const cleanMobile = String(mobile || '').trim();
    const cleanInvoice = String(invoiceNumber || '').trim();
    const cleanLuckyNumber = luckyNumber != null && String(luckyNumber).trim() !== ''
      ? String(luckyNumber).trim().padStart(3, '0')
      : null;

    // 1. Look up by invoice number
    const { data: byInvoice } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('invoice_number', cleanInvoice)
      .maybeSingle();

    if (byInvoice) {
      const dbMobile = String(byInvoice.mobile || '').trim();
      const dbName = String(byInvoice.customer_name || '').trim().toLowerCase();
      const inputName = cleanName.toLowerCase();
      const dbServiceType = normalizeServiceType(byInvoice.service_type);

      if (dbMobile !== cleanMobile) {
        throw new Error('INVOICE_MOBILE_MISMATCH');
      }
      if (dbName !== inputName) {
        throw new Error('NAME_MISMATCH');
      }
      if (dbServiceType !== sType) {
        throw new Error('SERVICE_TYPE_MISMATCH');
      }

      // Update lucky_number if not set
      if (cleanLuckyNumber && (!byInvoice.lucky_number || byInvoice.lucky_number !== cleanLuckyNumber)) {
        const { data: updated, error: uErr } = await supabase
          .from('event_participants')
          .update({ lucky_number: cleanLuckyNumber })
          .eq('id', byInvoice.id)
          .select()
          .single();
        if (!uErr && updated) return mapParticipantFromDb(updated);
      }

      return mapParticipantFromDb(byInvoice);
    }

    // 2. Look up by mobile number
    const { data: byMobile } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('mobile', cleanMobile)
      .maybeSingle();

    if (byMobile) {
      throw new Error('MOBILE_ALREADY_REGISTERED');
    }

    // 3. Insert new participant WITH luckyNumber in a single atomic insert!
    const id = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      id,
      event_id: eventId,
      invoice_number: cleanInvoice,
      customer_name: cleanName,
      mobile: cleanMobile,
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
      console.error('Error registering participant in event_participants:', error);
      return null;
    }
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
      const { data: existingRecord } = await supabase
        .from('event_participants')
        .select('*')
        .eq('id', participantId)
        .maybeSingle();

      if (!existingRecord) return null;

      const updatedPayload = {
        customer_name: cleanName,
        mobile: cleanMobile,
        invoice_number: cleanInvoice,
        service_type: sType,
        lucky_number: cleanLuckyNumber,
        participating: participating !== undefined ? Boolean(participating) : existingRecord.participating,
        joined: cleanLuckyNumber ? true : existingRecord.joined
      };

      const { data, error } = await supabase
        .from('event_participants')
        .update(updatedPayload)
        .eq('id', participantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating participant in event_participants:', error);
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
          .from('event_participants')
          .insert(freshEntries);

        if (error) {
          console.error('Supabase importParticipants error in event_participants:', error);
        }
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
          .single();

        if (error) {
          console.error('Supabase toggleParticipation error:', error);
          return null;
        }
        return mapParticipantFromDb(data);
      }
    } catch (err) {
      console.error('toggleParticipation exception:', err);
    }
    return null;
  },

  verifyParticipant: async (eventId, { name, mobile, invoiceNumber, serviceType }) => {
    const normName = str => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normMobile = str => String(str || '').trim().replace(/\D/g, '');
    const normInvoice = str => String(str || '').trim().toLowerCase().replace(/^#\s*/, '');

    const cleanName = normName(name);
    const cleanMobile = normMobile(mobile);
    const cleanInvoice = normInvoice(invoiceNumber);

    if (!cleanMobile || !cleanInvoice) return null;

    const list = await participantService.getParticipants(eventId, serviceType);

    const found = list.find(p => {
      const pName = normName(p.customerName || p.name);
      const pMob = normMobile(p.mobile || p.phone);
      const pInv = normInvoice(p.invoiceNumber || p.invoiceNo);

      const nameMatch = !cleanName || pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
      const mobileMatch = pMob === cleanMobile || (cleanMobile.length >= 7 && pMob.endsWith(cleanMobile)) || (pMob.length >= 7 && cleanMobile.endsWith(pMob));
      const invoiceMatch = pInv === cleanInvoice || pInv.padStart(3, '0') === cleanInvoice.padStart(3, '0') || cleanInvoice.padStart(3, '0') === pInv;

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
      const { data, error } = await supabase
        .from('event_participants')
        .update({
          lucky_number: formattedNum
        })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      if (data) {
        return mapParticipantFromDb(data);
      }
    } catch (err) {
      console.error('assignLuckyNumber exception:', err);
    }
    return null;
  },

  markJoined: async (eventId, participantId, serviceType = null) => {
    if (!eventId || !participantId) return null;

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .update({
          joined: true,
          joined_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .maybeSingle();

      if (data) {
        return mapParticipantFromDb(data);
      }
    } catch (err) {
      console.error('markJoined exception:', err);
    }
    return null;
  },

  deleteParticipant: async (eventId, participantId, serviceType = null) => {
    if (!participantId) return [];

    try {
      await supabase.from('event_participants').delete().eq('id', participantId);
    } catch (err) {
      console.error('delete participant exception:', err);
    }

    return await participantService.getParticipants(eventId, serviceType);
  },

  // --- Winners Functionality ---
  getWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    try {
      const table = serviceType ? getTableForServiceType(serviceType) : 'event_participants';
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
                winner_rank: w.rank || w.winnerRank || tp.winnerRank,
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
      console.error('saveWinners exception:', err);
      return [];
    }
  },

  publishWinners: async (eventId, unPublishedWinners, serviceType = null) => {
    if (!eventId) return [];
    try {
      let query = supabase
        .from('event_participants')
        .update({ published: true })
        .eq('event_id', eventId)
        .eq('winner', true);

      if (serviceType) {
        const sType = normalizeServiceType(serviceType);
        query = query.eq('service_type', sType);
      }

      await query;
      return await participantService.getWinners(eventId, serviceType);
    } catch (err) {
      console.error('publishWinners exception:', err);
      return [];
    }
  },

  resetWinners: async (eventId, serviceType = null) => {
    if (!eventId) return [];
    try {
      let query = supabase
        .from('event_participants')
        .update({
          winner: false,
          winner_rank: null,
          prize_name: null,
          published: false,
          drawn_at: null
        })
        .eq('event_id', eventId);

      if (serviceType) {
        const sType = normalizeServiceType(serviceType);
        query = query.eq('service_type', sType);
      }

      await query;
      return [];
    } catch (err) {
      console.error('resetWinners exception:', err);
      return [];
    }
  }
};
