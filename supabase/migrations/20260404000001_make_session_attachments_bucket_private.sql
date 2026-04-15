-- Fix #13: Make the session-attachments bucket private.
-- Clinical files must not be publicly accessible without authentication.
-- The application already uses createSignedUrl (1 hour TTL) for all file access.

UPDATE storage.buckets
SET public = false
WHERE id = 'session-attachments';

-- Ensure the existing RLS policies on storage.objects cover authenticated reads.
-- These policies were created by the previous migration; no changes needed there.
-- Signed URLs bypass public access checks so all existing functionality is preserved.

