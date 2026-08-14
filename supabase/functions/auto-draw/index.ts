// @ts-nocheck
// Supabase Edge Function: Headless Server-Side Winner Draw Engine
// Serves as an autonomous backend worker executing live draws at scheduled event times.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Query all ACTIVE events
    const { data: events, error: evtErr } = await supabase
      .from('event_events')
      .select('*')
      .neq('status', 'ENDED');

    if (evtErr) throw evtErr;

    const summary: Array<{ eventId: string; serviceType: string; status: string }> = [];

    for (const event of (events || [])) {
      for (const serviceType of ['NABL', 'TOTAL_STATION']) {
        const isTs = serviceType === 'TOTAL_STATION';
        const liveDateTime = isTs 
          ? (event.live_datetime_ts || event.live_datetime)
          : (event.live_datetime_nabl || event.live_datetime);

        if (!liveDateTime) continue;

        const liveMs = new Date(liveDateTime).getTime();
        if (isNaN(liveMs) || Date.now() < liveMs) continue; // Not scheduled time yet

        const prizes = isTs 
          ? (event.prizes_ts || []) 
          : (event.prizes_nabl || event.prizes || []);

        if (!Array.isArray(prizes) || prizes.length === 0) continue;

        const table = isTs ? 'event_participants_ts' : 'event_participants_nabl';

        // Check if session is already completed
        const { data: currentSession } = await supabase
          .from('event_live_sessions')
          .select('*')
          .eq('event_id', event.id)
          .eq('service_type', serviceType)
          .maybeSingle();

        if (currentSession?.phase === 'COMPLETED') {
          summary.push({ eventId: event.id, serviceType, status: 'Already completed' });
          continue;
        }

        // Check if an existing draw execution loop is currently active (phase_ends_at in future)
        const inProgressPhases = ['COUNTDOWN', 'NEXT_DRAW', 'DRAWING'];
        if (currentSession && inProgressPhases.includes(currentSession.phase)) {
          if (currentSession.phase_ends_at) {
            const endsMs = new Date(currentSession.phase_ends_at).getTime();
            if (!isNaN(endsMs) && Date.now() < endsMs) {
              summary.push({ eventId: event.id, serviceType, status: `Phase ${currentSession.phase} currently active` });
              continue;
            }
          }
        }

        // CONTINUOUS DRAW LOOP FOR ALL RANKS (No 1-minute cron gaps)
        while (true) {
          // Fetch current winners to check unrevealed ranks
          const { data: existingWinners } = await supabase
            .from(table)
            .select('*')
            .eq('event_id', event.id)
            .eq('winner', true);

          const drawnRanks = new Set((existingWinners || []).map(w => Number(w.winner_rank || w.rank)));
          const sortedPrizes = [...prizes].sort((a, b) => Number(a.rank) - Number(b.rank));
          const nextPrize = sortedPrizes.find(p => !drawnRanks.has(Number(p.rank)));

          if (!nextPrize) {
            // All ranks for this service are drawn!
            await supabase
              .from('event_live_sessions')
              .upsert({
                event_id: event.id,
                service_type: serviceType,
                phase: 'COMPLETED',
                updated_at: new Date().toISOString()
              }, { onConflict: 'event_id,service_type' });

            // Check if BOTH streams are complete
            const { data: nablWinners } = await supabase.from('event_participants_nabl').select('id').eq('event_id', event.id).eq('winner', true);
            const { data: tsWinners } = await supabase.from('event_participants_ts').select('id').eq('event_id', event.id).eq('winner', true);

            const nablPrizes = event.prizes_nabl || event.prizes || [];
            const tsPrizes = event.prizes_ts || [];
            const nablDone = nablPrizes.length === 0 || (nablWinners || []).length >= nablPrizes.length;
            const tsDone = tsPrizes.length === 0 || (tsWinners || []).length >= tsPrizes.length;

            if (nablDone && tsDone) {
              await supabase.from('event_events').update({ status: 'ENDED' }).eq('id', event.id);
            }

            summary.push({ eventId: event.id, serviceType, status: 'All ranks completed' });
            break;
          }

          const targetRank = Number(nextPrize.rank);
          const isFirstRank = targetRank === 1;

          // 2. Inter-Rank / Initial Countdown (5 seconds)
          // Explicitly set current_winner_lucky_number to null so flip cards reset to 000 during countdown
          const phaseEndsAt = new Date(Date.now() + 5000).toISOString();
          await supabase
            .from('event_live_sessions')
            .upsert({
              event_id: event.id,
              service_type: serviceType,
              phase: isFirstRank ? 'COUNTDOWN' : 'NEXT_DRAW',
              current_rank: targetRank,
              total_ranks: prizes.length,
              current_winner_lucky_number: null,
              current_winner_names: null,
              phase_started_at: new Date().toISOString(),
              phase_ends_at: phaseEndsAt,
              updated_at: new Date().toISOString()
            }, { onConflict: 'event_id,service_type' });

          // Synchronized 5-second countdown sleep
          await sleep(5000);

          // 3. DRAWING Phase
          await supabase
            .from('event_live_sessions')
            .upsert({
              event_id: event.id,
              service_type: serviceType,
              phase: 'DRAWING',
              current_rank: targetRank,
              total_ranks: prizes.length,
              current_winner_lucky_number: null,
              phase_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'event_id,service_type' });

          // 4. Query eligible joined participants
          const { data: participants } = await supabase
            .from(table)
            .select('*')
            .eq('event_id', event.id)
            .eq('participating', true)
            .eq('joined', true)
            .not('lucky_number', 'is', null);

          const alreadyWonLuckyNumbers = new Set((existingWinners || []).map(w => String(w.lucky_number).trim()));
          const eligibleParts = (participants || []).filter(p => {
            const num = String(p.lucky_number || '').trim();
            return num && !alreadyWonLuckyNumbers.has(num);
          });

          if (eligibleParts.length === 0) {
            summary.push({ eventId: event.id, serviceType, status: `No eligible participants for rank ${targetRank}` });
            break;
          }

          // Pick winning lucky number
          const distinctLuckyNums = Array.from(new Set(eligibleParts.map(p => String(p.lucky_number).trim())));
          const winningLuckyNumber = distinctLuckyNums[Math.floor(Math.random() * distinctLuckyNums.length)];
          const winningParticipants = eligibleParts.filter(p => String(p.lucky_number).trim() === winningLuckyNumber);

          const winnerNames = winningParticipants.map(p => p.customer_name || 'Anonymous').join(', ');
          const prizeName = nextPrize.name || `Rank ${targetRank} Prize`;

          // Save winners to DB
          for (const w of winningParticipants) {
            await supabase.from(table).update({
              winner: true,
              winner_rank: targetRank,
              prize_name: prizeName,
              published: true,
              drawn_at: new Date().toISOString()
            }).eq('id', w.id);

            await supabase.from('event_participants').update({
              winner: true,
              winner_rank: targetRank,
              prize_name: prizeName,
              published: true,
              drawn_at: new Date().toISOString()
            }).eq('id', w.id);
          }

          // 5. REVEALED Phase (3 seconds display hold for celebration)
          await supabase
            .from('event_live_sessions')
            .upsert({
              event_id: event.id,
              service_type: serviceType,
              phase: 'REVEALED',
              current_rank: targetRank,
              total_ranks: prizes.length,
              current_winner_lucky_number: winningLuckyNumber,
              current_winner_names: winnerNames,
              last_completed_rank: targetRank,
              phase_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'event_id,service_type' });

          summary.push({ eventId: event.id, serviceType, status: `Rank ${targetRank} drawn: ${winningLuckyNumber} (${winnerNames})` });

          // Sleep 3 seconds on revealed winner card
          await sleep(3000);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Edge Function auto-draw error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
