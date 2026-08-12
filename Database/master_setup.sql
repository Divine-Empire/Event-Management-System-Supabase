-- ====================================================================
-- MASTER SUPABASE SETUP SCRIPT FOR DIVINE EMPIRE EVENT MANAGEMENT SYSTEM
-- New Project URL: https://zpkikvgmmbtekbcuqahf.supabase.co
-- Run this complete script in Supabase Dashboard > SQL Editor
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABLES CREATION
-- --------------------------------------------------------------------

-- 1.1 Event Admins Table
CREATE TABLE IF NOT EXISTS public.event_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.event_admins DISABLE ROW LEVEL SECURITY;

-- 1.2 Event Events Table
CREATE TABLE IF NOT EXISTS public.event_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  description TEXT,
  sponsor TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  live_datetime TIMESTAMPTZ,
  status TEXT DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'ENDED')),
  prizes JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  live_datetime_nabl TIMESTAMPTZ,
  live_datetime_ts TIMESTAMPTZ,
  prizes_nabl JSONB DEFAULT '[]'::jsonb,
  prizes_ts JSONB DEFAULT '[]'::jsonb
);
ALTER TABLE public.event_events DISABLE ROW LEVEL SECURITY;

-- 1.3 Master Event Participants Table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.event_events(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  participating BOOLEAN DEFAULT false,
  joined BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  lucky_number TEXT,
  winner BOOLEAN DEFAULT false,
  winner_rank INT,
  prize_name TEXT,
  published BOOLEAN DEFAULT false,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  service_type TEXT DEFAULT 'NABL'
);
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;

-- 1.4 NABL Service Sub-table
CREATE TABLE IF NOT EXISTS public.event_participants_nabl (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.event_events(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES public.event_participants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  participating BOOLEAN DEFAULT false,
  joined BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  lucky_number TEXT,
  winner BOOLEAN DEFAULT false,
  winner_rank INT,
  prize_name TEXT,
  published BOOLEAN DEFAULT false,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_participants_nabl DISABLE ROW LEVEL SECURITY;

-- 1.5 Total Station (TS) Service Sub-table
CREATE TABLE IF NOT EXISTS public.event_participants_ts (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.event_events(id) ON DELETE CASCADE,
  participant_id TEXT REFERENCES public.event_participants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  participating BOOLEAN DEFAULT false,
  joined BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  lucky_number TEXT,
  winner BOOLEAN DEFAULT false,
  winner_rank INT,
  prize_name TEXT,
  published BOOLEAN DEFAULT false,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_participants_ts DISABLE ROW LEVEL SECURITY;

-- 1.6 Event Live Sessions Table
CREATE TABLE IF NOT EXISTS public.event_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('NABL', 'TOTAL_STATION')),
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
  CONSTRAINT unq_event_live_session UNIQUE (event_id, service_type)
);
ALTER TABLE public.event_live_sessions DISABLE ROW LEVEL SECURITY;

-- 1.7 Event Live Rounds Table
CREATE TABLE IF NOT EXISTS public.event_live_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.event_events(id) ON DELETE CASCADE,
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
  CONSTRAINT unq_event_live_round UNIQUE (event_id, service_type, rank)
);
ALTER TABLE public.event_live_rounds DISABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- 2. INDEXES CREATION
-- --------------------------------------------------------------------

-- Master participants indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_mobile ON public.event_participants(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_invoice ON public.event_participants(invoice_number);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_inv ON public.event_participants(event_id, invoice_number, mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_master ON public.event_participants(event_id, service_type, invoice_number, mobile);

-- NABL sub-table indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_event_id ON public.event_participants_nabl(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_mobile ON public.event_participants_nabl(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_invoice ON public.event_participants_nabl(invoice_number);
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_pid ON public.event_participants_nabl(participant_id);

-- TS sub-table indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_event_id ON public.event_participants_ts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_mobile ON public.event_participants_ts(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_invoice ON public.event_participants_ts(invoice_number);
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_pid ON public.event_participants_ts(participant_id);


-- --------------------------------------------------------------------
-- 3. STORAGE BUCKET & PUBLIC ACCESS POLICY
-- --------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('Event_system', 'Event_system', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Event_system' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Access Event_system" ON storage.objects 
        FOR ALL USING (bucket_id = 'Event_system') WITH CHECK (bucket_id = 'Event_system');
    END IF;
END $$;


-- --------------------------------------------------------------------
-- 4. AUTOMATED TRIGGER FUNCTION (Master -> Service Sub-tables Sync)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_participant_to_service_table()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_type = 'NABL' THEN
    INSERT INTO public.event_participants_nabl (
      id, participant_id, event_id, invoice_number, customer_name, mobile,
      participating, joined, joined_at, lucky_number, winner, winner_rank,
      prize_name, published, drawn_at, created_at
    ) VALUES (
      NEW.id, NEW.id, NEW.event_id, NEW.invoice_number, NEW.customer_name, NEW.mobile,
      NEW.participating, NEW.joined, NEW.joined_at, NEW.lucky_number, NEW.winner,
      NEW.winner_rank, NEW.prize_name, NEW.published, NEW.drawn_at, NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      participating = EXCLUDED.participating,
      joined = EXCLUDED.joined,
      joined_at = EXCLUDED.joined_at,
      lucky_number = EXCLUDED.lucky_number,
      winner = EXCLUDED.winner,
      winner_rank = EXCLUDED.winner_rank,
      prize_name = EXCLUDED.prize_name,
      published = EXCLUDED.published,
      drawn_at = EXCLUDED.drawn_at,
      customer_name = EXCLUDED.customer_name,
      mobile = EXCLUDED.mobile,
      invoice_number = EXCLUDED.invoice_number;

    DELETE FROM public.event_participants_ts WHERE id = NEW.id;

  ELSIF NEW.service_type = 'TOTAL_STATION' THEN
    INSERT INTO public.event_participants_ts (
      id, participant_id, event_id, invoice_number, customer_name, mobile,
      participating, joined, joined_at, lucky_number, winner, winner_rank,
      prize_name, published, drawn_at, created_at
    ) VALUES (
      NEW.id, NEW.id, NEW.event_id, NEW.invoice_number, NEW.customer_name, NEW.mobile,
      NEW.participating, NEW.joined, NEW.joined_at, NEW.lucky_number, NEW.winner,
      NEW.winner_rank, NEW.prize_name, NEW.published, NEW.drawn_at, NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      participating = EXCLUDED.participating,
      joined = EXCLUDED.joined,
      joined_at = EXCLUDED.joined_at,
      lucky_number = EXCLUDED.lucky_number,
      winner = EXCLUDED.winner,
      winner_rank = EXCLUDED.winner_rank,
      prize_name = EXCLUDED.prize_name,
      published = EXCLUDED.published,
      drawn_at = EXCLUDED.drawn_at,
      customer_name = EXCLUDED.customer_name,
      mobile = EXCLUDED.mobile,
      invoice_number = EXCLUDED.invoice_number;

    DELETE FROM public.event_participants_nabl WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also create event_ prefixed alias function
CREATE OR REPLACE FUNCTION event_sync_participant_to_service_table()
RETURNS TRIGGER AS $$
BEGIN
  RETURN sync_participant_to_service_table();
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to event_participants table
DROP TRIGGER IF EXISTS trg_sync_participant ON public.event_participants;
CREATE TRIGGER trg_sync_participant
  AFTER INSERT OR UPDATE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION sync_participant_to_service_table();


-- --------------------------------------------------------------------
-- 5. RPC FUNCTION: start_live_round (Server-Side Winner Selection)
-- --------------------------------------------------------------------

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
  IF UPPER(p_service_type) LIKE '%TOTAL%' OR p_service_type = 'TOTAL_STATION' THEN
    v_table_name := 'event_participants_ts';
  ELSE
    v_table_name := 'event_participants_nabl';
  END IF;

  SELECT * INTO v_session
  FROM event_live_sessions
  WHERE event_id = p_event_id AND service_type = p_service_type
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM event_live_rounds
    WHERE event_id = p_event_id
      AND service_type = p_service_type
      AND rank = p_rank
      AND status = 'REVEALED'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This rank already has a winner');
  END IF;

  EXECUTE FORMAT(
    'SELECT lucky_number FROM %I WHERE event_id = %L AND participating = true AND (joined = true OR (lucky_number IS NOT NULL AND lucky_number != '''')) AND lucky_number NOT IN (SELECT COALESCE(winning_lucky_number, '''') FROM event_live_rounds WHERE event_id = %L AND service_type = %L AND status = ''REVEALED'') ORDER BY random() LIMIT 1',
    v_table_name, p_event_id, p_event_id, p_service_type
  ) INTO v_winner_lucky_number;

  IF v_winner_lucky_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible joined participants available');
  END IF;

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

-- Create event_ prefixed version as well
CREATE OR REPLACE FUNCTION event_start_live_round(
  p_event_id TEXT,
  p_service_type TEXT,
  p_rank INTEGER,
  p_prize_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN start_live_round(p_event_id, p_service_type, p_rank, p_prize_name);
END;
$$;


-- --------------------------------------------------------------------
-- 6. RPC FUNCTION: reveal_live_winner (Server-Side Winner Reveal)
-- --------------------------------------------------------------------

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

  EXECUTE FORMAT(
    'UPDATE %I SET winner = true, winner_rank = %L, prize_name = %L, published = true, drawn_at = NOW() WHERE event_id = %L AND lucky_number = %L',
    v_table_name, p_rank, v_round.prize_name, p_event_id, v_round.winning_lucky_number
  );

  RETURN jsonb_build_object('success', true, 'rank', p_rank);
END;
$$;

-- Create event_ prefixed version as well
CREATE OR REPLACE FUNCTION event_reveal_live_winner(
  p_event_id TEXT,
  p_service_type TEXT,
  p_rank INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN reveal_live_winner(p_event_id, p_service_type, p_rank);
END;
$$;


-- --------------------------------------------------------------------
-- 7. SUPABASE REALTIME REPLICATION SETUP
-- --------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'event_live_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_live_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'event_live_rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_live_rounds;
  END IF;
END $$;


-- --------------------------------------------------------------------
-- 8. DEFAULT SEED DATA
-- --------------------------------------------------------------------

INSERT INTO public.event_admins (username, password, role, is_active)
VALUES ('admin', 'Password123', 'admin', true)
ON CONFLICT (username) DO NOTHING;
