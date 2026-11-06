-- Migration 003: Create Skill Categories table (Independent from skills)
-- Purpose: Make skill categories persistent and independent from skill records
-- Date: 2026-11-04
-- Requires: Supabase project with skills table
-- Safety: Uses IF NOT EXISTS and ON CONFLICT for idempotence
-- Rationale: Categories should remain available even when they contain zero skills

-- ============================================================================
-- 1. CREATE SKILL_CATEGORIES TABLE (SAFE - IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skill_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for skill_categories table
ALTER TABLE public.skill_categories REPLICA IDENTITY FULL;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE (SAFE - IF NOT EXISTS)
-- ============================================================================

-- Index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_skill_categories_order ON public.skill_categories(display_order);

-- Unique index on name (already enforced by UNIQUE constraint, but explicit for clarity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_categories_name ON public.skill_categories(name);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICY 1: Public users can READ skill categories
-- ============================================================================

DROP POLICY IF EXISTS "Skill Categories: Public read" ON public.skill_categories;

CREATE POLICY "Skill Categories: Public read"
  ON public.skill_categories
  FOR SELECT
  USING (true);

-- ============================================================================
-- 5. RLS POLICY 2: Admin users can READ skill categories
-- ============================================================================

DROP POLICY IF EXISTS "Skill Categories: Admin read" ON public.skill_categories;

CREATE POLICY "Skill Categories: Admin read"
  ON public.skill_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 6. RLS POLICY 3: Admin users can INSERT skill categories
-- ============================================================================

DROP POLICY IF EXISTS "Skill Categories: Admin insert" ON public.skill_categories;

CREATE POLICY "Skill Categories: Admin insert"
  ON public.skill_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 7. RLS POLICY 4: Admin users can UPDATE skill categories
-- ============================================================================

DROP POLICY IF EXISTS "Skill Categories: Admin update" ON public.skill_categories;

CREATE POLICY "Skill Categories: Admin update"
  ON public.skill_categories
  FOR UPDATE
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

-- ============================================================================
-- 8. RLS POLICY 5: Admin users can DELETE skill categories (with safety check)
-- ============================================================================

DROP POLICY IF EXISTS "Skill Categories: Admin delete" ON public.skill_categories;

CREATE POLICY "Skill Categories: Admin delete"
  ON public.skill_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
    -- Safety: Only allow deletion if no skills use this category
    AND NOT EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.category = skill_categories.name
    )
  );

-- ============================================================================
-- 9. CREATE FUNCTION: auto-update updated_at timestamp (SAFE - CREATE OR REPLACE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_skill_categories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CREATE TRIGGER: call update function on update (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP TRIGGER IF EXISTS skill_categories_timestamp_trigger ON public.skill_categories;

CREATE TRIGGER skill_categories_timestamp_trigger
  BEFORE UPDATE ON public.skill_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_skill_categories_timestamp();

-- ============================================================================
-- 11. REGISTER TABLE IN REALTIME PUBLICATION (IDEMPOTENT)
-- ============================================================================

-- Add skill_categories table to realtime publication if not already registered
DO $$
BEGIN
  -- Check if table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'skill_categories'
  ) THEN
    -- Add table to publication if it doesn't exist
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_categories';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore if publication doesn't exist (safe in development)
  NULL;
END $$;

-- ============================================================================
-- 12. SEED INITIAL CATEGORIES (SAFE - ON CONFLICT DO NOTHING)
-- ============================================================================

INSERT INTO public.skill_categories (name, display_order)
VALUES
  ('Frontend', 0),
  ('Backend', 1),
  ('Bases de données', 2),
  ('DevOps & Outils', 3),
  ('UI/UX Design', 4),
  ('Intelligence artificielle', 5),
  ('Langages', 6),
  ('CMS', 7),
  ('Systèmes', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 13. VERIFY SEEDING
-- ============================================================================

-- Count categories (should be 9)
-- SELECT COUNT(*) as category_count FROM public.skill_categories;

-- List all categories with order
-- SELECT id, name, display_order FROM public.skill_categories ORDER BY display_order;

-- ============================================================================
-- MIGRATION EXECUTION & VERIFICATION
-- ============================================================================
--
-- How to apply this migration:
-- 1. Log into Supabase dashboard
-- 2. Open SQL Editor
-- 3. Create new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" button
-- 6. Verify steps:
--    a. Check Table Editor > skill_categories (should show new table)
--    b. Click on table > RLS Policies tab (should show 5 policies)
--    c. Verify all 9 categories are present (use queries above)
--    d. Check existing skills still have their category values
--    e. Check Realtime is enabled in table settings (for live updates)
--
-- ============================================================================
-- SAFETY NOTES
-- ============================================================================
--
-- - All operations use IF NOT EXISTS for idempotence
-- - Realtime registration uses DO $$ ... $$ block for error handling
-- - Existing skills table is NOT modified
-- - Categories can only be deleted if no skills reference them
-- - All 41 existing skills retain their category values
-- - Migration is fully reversible by dropping the skill_categories table
-- - Public users can read categories
-- - Admin users can read/insert/update categories
-- - Admin users can delete categories only if they are unused
--
-- ============================================================================
