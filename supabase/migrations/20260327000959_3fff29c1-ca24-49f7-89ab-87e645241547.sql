
ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'rescheduled';

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS rescheduled_from uuid REFERENCES public.sessions(id);
