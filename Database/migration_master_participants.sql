-- ================================================================
-- SQL MIGRATION: SINGLE SOURCE PARTICIPANTS & AUTOMATED TRIGGER SYNC
-- Run this script in your Supabase SQL Editor
-- ================================================================

-- 1. Ensure master table event_participants has all operational & draw columns
ALTER TABLE public.event_participants 
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'NABL',
  ADD COLUMN IF NOT EXISTS participating BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS joined BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lucky_number TEXT,
  ADD COLUMN IF NOT EXISTS winner BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS winner_rank INT,
  ADD COLUMN IF NOT EXISTS prize_name TEXT,
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMPTZ;

-- Disable RLS on event_participants
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;

-- Index for high performance queries
CREATE INDEX IF NOT EXISTS idx_event_participants_master 
ON public.event_participants(event_id, service_type, invoice_number, mobile);

-- 2. PostgreSQL Trigger Function: Auto Sync event_participants -> Child Tables
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

    -- Delete from TS table if service type changed to NABL
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

    -- Delete from NABL table if service type changed to TOTAL_STATION
    DELETE FROM public.event_participants_nabl WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger to event_participants
DROP TRIGGER IF EXISTS trg_sync_participant ON public.event_participants;
CREATE TRIGGER trg_sync_participant
  AFTER INSERT OR UPDATE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION sync_participant_to_service_table();
