-- Add audio URL to chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS audio_url text;

-- Create public storage bucket for chapter audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('chapter-audio', 'chapter-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read audio files (they are public learning content)
CREATE POLICY "chapter_audio_select"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'chapter-audio');
