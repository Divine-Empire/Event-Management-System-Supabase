-- ====================================================================
-- SUPABASE LIVE DRAW SYSTEM MIGRATION SCRIPT
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ====================================================================

-- 1. CREATE LIVE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS event_live_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event_events(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('NABL', 'TOTAL_STATION')),

  -- Live phase lifecycle: WAITING | BUILDUP | COUNTDOWN | DRAWING | REVEALED | COMPLETED
  phase TEXT NOT NULL DEFAULT 'WAITING',
  current_rank INTEGER DEFAULT 1,
  total_ranks INTEGER DEFAULT 0,

  phase_started_at TIMESTAMPTZ,
  phase_ends_at TIMESTAMPTZ,

  current_winner_lucky_number TEXT,
  current_winner_names TEXT,

  last_completed_rank INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unq_event_live_session UNIQUE(event_id, service_type)
);

-- 2. CREATE LIVE ROUNDS TABLE (PREVENTS DUPLICATE WINNER SELECTIONS AT DB LEVEL)
CREATE TABLE IF NOT EXISTS event_live_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event_events(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  rank INTEGER NOT NULL,
  prize_name TEXT,

  status TEXT NOT NULL DEFAULT 'PENDING',

  started_at TIMESTAMPTZ,
  countdown_started_at TIMESTAMPTZ,
  draw_executed_at TIMESTAMPTZ,
  revealed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  winning_lucky_number TEXT,
  winner_names TEXT,
  winner_invoice_numbers TEXT,
  winner_participant_ids TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unq_event_live_round UNIQUE(event_id, service_type, rank)
);

-- 3. ENABLE REALTIME REPLICATION ON TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE event_live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE event_live_rounds;

-- 4. SERVER-SIDE WINNER SELECTION RPC FUNCTION: start_live_round
CREATE OR REPLACE FUNCTION start_live_round(
  p_event_id TEXT,
  p_service_type TEXT,
  p_rank INTEGER,
  p_prize_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session event_live_sessions;
  v_round event_live_rounds;
  v_winner_lucky_number TEXT;
  v_winner_names TEXT;
  v_winner_invoices TEXT;
  v_winner_ids TEXT[];
  v_countdown_seconds INT := 5;
  v_phase_ends_at TIMESTAMPTZ;
  v_table_name TEXT;
BEGIN
  -- Determine target participant table based on service_type
  IF UPPER(p_service_type) LIKE '%TOTAL%' OR p_service_type = 'TOTAL_STATION' THEN
    v_table_name := 'event_participants_ts';
  ELSE
    v_table_name := 'event_participants_nabl';
  END IF;

  -- Acquire row-level lock on live session
  SELECT * INTO v_session
  FROM event_live_sessions
  WHERE event_id = p_event_id AND service_type = p_service_type
  FOR UPDATE;

  -- Lock guard: rank already revealed
  IF EXISTS (
    SELECT 1 FROM event_live_rounds
    WHERE event_id = p_event_id
      AND service_type = p_service_type
      AND rank = p_rank
      AND status = 'REVEALED'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This rank already has a winner');
  END IF;

  -- Compute winner: Select random lucky number from joined, participating participants who haven't won yet
  EXECUTE FORMAT(
    'SELECT lucky_number FROM %I WHERE event_id = %L AND participating = true AND (joined = true OR (lucky_number IS NOT NULL AND lucky_number != '''')) AND lucky_number NOT IN (SELECT COALESCE(winning_lucky_number, '''') FROM event_live_rounds WHERE event_id = %L AND service_type = %L AND status = ''REVEALED'') ORDER BY random() LIMIT 1',
    v_table_name, p_event_id, p_event_id, p_service_type
  ) INTO v_winner_lucky_number;

  IF v_winner_lucky_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible joined participants available');
  END IF;

  -- Aggregate winner details (if multiple participants share the lucky number)
  EXECUTE FORMAT(
    'SELECT STRING_AGG(customer_name, '', ''), STRING_AGG(invoice_number, '', ''), ARRAY_AGG(id::TEXT) FROM %I WHERE event_id = %L AND lucky_number = %L',
    v_table_name, p_event_id, v_winner_lucky_number
  ) INTO v_winner_names, v_winner_invoices, v_winner_ids;

  v_phase_ends_at := NOW() + (v_countdown_seconds || ' seconds')::INTERVAL;

  INSERT INTO event_live_rounds (
    event_id, service_type, rank, prize_name, status,
    started_at, countdown_started_at,
    winning_lucky_number, winner_names, winner_invoice_numbers, winner_participant_ids
  ) VALUES (
    p_event_id, p_service_type, p_rank, p_prize_name, 'COUNTDOWN',
    NOW(), NOW(),
    v_winner_lucky_number, v_winner_names, v_winner_invoices, v_winner_ids
  )
  RETURNING * INTO v_round;

  UPDATE event_live_sessions SET
    phase = 'COUNTDOWN',
    current_rank = p_rank,
    phase_started_at = NOW(),
    phase_ends_at = v_phase_ends_at,
    updated_at = NOW()
  WHERE event_id = p_event_id AND service_type = p_service_type;

  RETURN jsonb_build_object(
    'success', true,
    'round_id', v_round.id,
    'rank', p_rank,
    'countdown_ends_at', v_phase_ends_at,
    'winner_lucky_number', v_winner_lucky_number
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round already started for this rank');
END;
$$;

-- 5. SERVER-SIDE WINNER REVEAL RPC FUNCTION: reveal_live_winner
CREATE OR REPLACE FUNCTION reveal_live_winner(
  p_event_id TEXT,
  p_service_type TEXT,
  p_rank INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round event_live_rounds;
  v_table_name TEXT;
BEGIN
  IF UPPER(p_service_type) LIKE '%TOTAL%' OR p_service_type = 'TOTAL_STATION' THEN
    v_table_name := 'event_participants_ts';
  ELSE
    v_table_name := 'event_participants_nabl';
  END IF;

  SELECT * INTO v_round
  FROM event_live_rounds
  WHERE event_id = p_event_id
    AND service_type = p_service_type
    AND rank = p_rank
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;

  UPDATE event_live_rounds SET
    status = 'REVEALED',
    revealed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_round.id;

  UPDATE event_live_sessions SET
    phase = 'REVEALED',
    phase_started_at = NOW(),
    phase_ends_at = NULL,
    current_winner_lucky_number = v_round.winning_lucky_number,
    current_winner_names = v_round.winner_names,
    last_completed_rank = p_rank,
    updated_at = NOW()
  WHERE event_id = p_event_id AND service_type = p_service_type;

  -- Update winner flag in the service-specific table
  EXECUTE FORMAT(
    'UPDATE %I SET winner = true, winner_rank = %L, prize_name = %L, published = true, drawn_at = NOW() WHERE event_id = %L AND lucky_number = %L',
    v_table_name, p_rank, v_round.prize_name, p_event_id, v_round.winning_lucky_number
  );

  RETURN jsonb_build_object('success', true, 'rank', p_rank);
END;
$$;
