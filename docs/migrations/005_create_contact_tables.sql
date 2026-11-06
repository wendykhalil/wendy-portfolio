-- Migration: Create contact_messages and contact_settings tables
-- Date: 2026-11-04
-- Purpose: Enable dynamic contact section with form submissions and admin management
-- Design: contact_settings singleton (like profiles), contact_messages append-only with RLS
-- Status: Ready for manual execution in Supabase SQL Editor

-- ============================================================================
-- CONTACT_SETTINGS TABLE (Singleton - like profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_settings (
  id UUID PRIMARY KEY,
  
  -- Public contact information
  email TEXT NOT NULL DEFAULT 'contact@example.com',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  
  -- Social links
  github TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  
  -- Contact section content (French)
  title_fr TEXT NOT NULL DEFAULT 'Construisons quelque chose ensemble.',
  description_fr TEXT NOT NULL DEFAULT 'Vous avez une idée, un projet ou une opportunité ? Je serais ravi d''échanger avec vous et de donner vie à vos idées.',
  
  -- Contact section content (English)
  title_en TEXT NOT NULL DEFAULT 'Let''s build something together.',
  description_en TEXT NOT NULL DEFAULT 'Have an idea, project, or opportunity? I would be happy to connect and bring your ideas to life.',
  
  -- Feature flags
  contact_form_enabled BOOLEAN DEFAULT true,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one contact_settings record can exist (singleton constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_settings_singleton ON public.contact_settings ((1))
  WHERE id IS NOT NULL;

-- Enable RLS for contact_settings
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (for portfolio display)
DROP POLICY IF EXISTS "contact_settings_public_read" ON public.contact_settings;
CREATE POLICY "contact_settings_public_read"
  ON public.contact_settings FOR SELECT
  TO public
  USING (true);

-- Policy: Admin-only update access
DROP POLICY IF EXISTS "contact_settings_admin_update" ON public.contact_settings;
CREATE POLICY "contact_settings_admin_update"
  ON public.contact_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- Insert singleton contact settings record
-- ID: 00000000-0000-0000-0000-000000000002
INSERT INTO public.contact_settings (
  id,
  email,
  phone,
  location,
  github,
  linkedin,
  title_fr,
  description_fr,
  title_en,
  description_en,
  contact_form_enabled
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'contact@example.com',
  '',
  '',
  '',
  '',
  'Construisons quelque chose ensemble.',
  'Vous avez une idée, un projet ou une opportunité ? Je serais ravi d''échanger avec vous et de donner vie à vos idées.',
  'Let''s build something together.',
  'Have an idea, project, or opportunity? I would be happy to connect and bring your ideas to life.',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONTACT_MESSAGES TABLE (Append-only, with RLS for privacy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  
  -- Visitor information
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  
  -- Message content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status tracking
  is_read BOOLEAN DEFAULT false,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON public.contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_visitor_email ON public.contact_messages(visitor_email);

-- Enable RLS for contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can INSERT messages
-- Visitors can submit messages but cannot read other messages
DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_public_insert"
  ON public.contact_messages FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Admin-only SELECT access
-- Admins can read all messages
DROP POLICY IF EXISTS "contact_messages_admin_read" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_read"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- Policy: Admin-only UPDATE access
-- Admins can mark messages as read/unread
DROP POLICY IF EXISTS "contact_messages_admin_update" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_update"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- Policy: Admin-only DELETE access
-- Admins can delete messages after confirmation
DROP POLICY IF EXISTS "contact_messages_admin_delete" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_delete"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at for contact_settings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_contact_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_settings_timestamp_trigger ON public.contact_settings;
CREATE TRIGGER contact_settings_timestamp_trigger
  BEFORE UPDATE ON public.contact_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_settings_timestamp();

-- ============================================================================
-- TRIGGER: Auto-update updated_at for contact_messages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_contact_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_messages_timestamp_trigger ON public.contact_messages;
CREATE TRIGGER contact_messages_timestamp_trigger
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_messages_timestamp();

-- ============================================================================
-- SCHEMA NOTES & VERIFICATION
-- ============================================================================
--
-- contact_settings:
-- - Singleton pattern (like profiles table)
-- - ID: 00000000-0000-0000-0000-000000000002
-- - Public readable (needed for portfolio display)
-- - Admin-only writable
-- - Stores all editable contact info and section content
-- - contact_form_enabled: feature flag to enable/disable contact form
--
-- contact_messages:
-- - Append-only log of contact form submissions
-- - Public can INSERT (submit messages) but not READ
-- - Admin can READ, UPDATE (mark as read), DELETE
-- - Privacy: Visitors cannot see other visitors' messages
-- - Fields: visitor name/email, subject, message, read status, IP, user agent
-- - Timestamps: created_at (immutable), updated_at (updated on changes)
--
-- RLS Policies ensure:
-- ✅ Public: Can submit contact form (INSERT)
-- ✅ Public: Cannot read other messages (no SELECT)
-- ✅ Admin: Can manage all settings and messages
-- ✅ Privacy: Only admins see submitted messages
-- ✅ No authentication required for form submission
--
-- ============================================================================
-- MIGRATION EXECUTION & VERIFICATION
-- ============================================================================
--
-- Steps to apply this migration:
-- 1. Log into Supabase dashboard
-- 2. Open SQL Editor
-- 3. Create new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" button
-- 6. Verify execution:
--    a. Check Table Editor: contact_settings (should show 1 row)
--    b. Check Table Editor: contact_messages (should be empty initially)
--    c. Check RLS Policies tab on both tables
--    d. Verify all indexes are created
--
-- ============================================================================

