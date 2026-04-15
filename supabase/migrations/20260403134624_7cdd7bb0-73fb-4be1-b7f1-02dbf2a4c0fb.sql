
-- Create storage bucket for session attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-attachments', 'session-attachments', true);

-- Storage policies
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'session-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'session-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'session-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create attachments tracking table
CREATE TABLE public.session_note_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_note_id UUID NOT NULL REFERENCES public.session_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
ON public.session_note_attachments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own attachments"
ON public.session_note_attachments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own attachments"
ON public.session_note_attachments FOR DELETE
USING (user_id = auth.uid());
