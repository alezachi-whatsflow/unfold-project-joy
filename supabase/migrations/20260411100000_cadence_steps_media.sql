-- Cadence steps: support multi-media types (text, image, audio, video, document)
ALTER TABLE cadence_steps
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'audio', 'video', 'document')),
  ADD COLUMN IF NOT EXISTS caption text;

COMMENT ON COLUMN cadence_steps.media_type IS 'Type of content: text | image | audio | video | document';
COMMENT ON COLUMN cadence_steps.caption IS 'Optional caption for image/video/document attachments';
