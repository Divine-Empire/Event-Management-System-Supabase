-- ========================================================
-- Divine Empire Event Management System - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up tables.
-- ========================================================

-- 1. EVENT ADMINS TABLE
-- Stores admin login credentials (username & password)
CREATE TABLE IF NOT EXISTS public.event_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) as requested
ALTER TABLE public.event_admins DISABLE ROW LEVEL SECURITY;

-- Seed initial default admin credentials
INSERT INTO public.event_admins (username, password)
VALUES ('admin', 'Password123')
ON CONFLICT (username) DO NOTHING;


-- 2. EVENT EVENTS TABLE
-- Stores event management details, timing, prizes, and settings
CREATE TABLE IF NOT EXISTS public.event_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    description TEXT,
    sponsor TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    live_datetime TIMESTAMPTZ,
    status TEXT CHECK (status IN ('UPCOMING', 'ACTIVE', 'ENDED')) DEFAULT 'UPCOMING',
    prizes JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) as requested
ALTER TABLE public.event_events DISABLE ROW LEVEL SECURITY;


-- 3. EVENT PARTICIPANTS TABLE (Includes Winner Info)
-- Stores participants registered for events as well as winner draw status
CREATE TABLE IF NOT EXISTS public.event_participants (
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
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_mobile ON public.event_participants(mobile);
CREATE INDEX IF NOT EXISTS idx_event_participants_invoice ON public.event_participants(invoice_number);


-- 4. STORAGE BUCKET FOR PRIZE IMAGES
-- Create bucket 'Event_system' for storing prize images
INSERT INTO storage.buckets (id, name, public)
VALUES ('Event_system', 'Event_system', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public Storage policies for Event_system
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Event_system' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Access Event_system" ON storage.objects 
        FOR ALL USING (bucket_id = 'Event_system') WITH CHECK (bucket_id = 'Event_system');
    END IF;
END $$;


-- 5. MIGRATION: CONVERT START_DATE & END_DATE TO TIMESTAMPTZ
-- Run this if your table was created with plain DATE columns
ALTER TABLE public.event_events 
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
  ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ;

