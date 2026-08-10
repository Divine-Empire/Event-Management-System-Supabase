-- ========================================================
-- Divine Empire Event Management System - Dual Service Migration
-- Run this SQL in your Supabase SQL Editor
-- ========================================================

-- 1. Update event_events table for dual live dates and dual prize pools
ALTER TABLE public.event_events 
  ADD COLUMN IF NOT EXISTS live_datetime_nabl TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS live_datetime_ts   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prizes_nabl        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prizes_ts          JSONB DEFAULT '[]'::jsonb;

-- 2. NABL Lab Calibration Participants Table
CREATE TABLE IF NOT EXISTS public.event_participants_nabl (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES public.event_events(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    participating BOOLEAN DEFAULT FALSE,
    joined BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ,
    lucky_number TEXT,
    winner BOOLEAN DEFAULT FALSE,
    winner_rank INT,
    prize_name TEXT,
    published BOOLEAN DEFAULT FALSE,
    drawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) as requested
ALTER TABLE public.event_participants_nabl DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_event_id ON public.event_participants_nabl(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_mobile ON public.event_participants_nabl(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_nabl_invoice ON public.event_participants_nabl(invoice_number);

-- 3. Total Station Calibration Participants Table
CREATE TABLE IF NOT EXISTS public.event_participants_ts (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES public.event_events(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    participating BOOLEAN DEFAULT FALSE,
    joined BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ,
    lucky_number TEXT,
    winner BOOLEAN DEFAULT FALSE,
    winner_rank INT,
    prize_name TEXT,
    published BOOLEAN DEFAULT FALSE,
    drawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) as requested
ALTER TABLE public.event_participants_ts DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_participants_ts_event_id ON public.event_participants_ts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_mobile ON public.event_participants_ts(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_ts_invoice ON public.event_participants_ts(invoice_number);
