
CREATE TYPE public.session_modality AS ENUM ('presencial', 'online');

ALTER TABLE public.sessions 
  ADD COLUMN modality public.session_modality NOT NULL DEFAULT 'presencial',
  ADD COLUMN meeting_url TEXT;
