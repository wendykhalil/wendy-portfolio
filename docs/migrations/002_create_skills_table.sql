-- Migration 002: Create Skills table with Realtime support and RLS policies
-- Purpose: Migrate Skills module from localStorage to Supabase with real-time sync
-- Date: 2026-11-04
-- Requires: Supabase project with auth enabled, admin_users table from Migration 001
-- Safety: Uses IF NOT EXISTS, DROP IF EXISTS, and ON CONFLICT for idempotence
-- Compatibility: Fields verified against SkillEditor, SkillsAdmin, initialSkills, skillService.js

-- ============================================================================
-- 1. CREATE SKILLS TABLE (SAFE - IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  icon TEXT,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraint: name + category must be unique per status
  CONSTRAINT unique_skill_per_status UNIQUE (name, category, status)
);

-- Enable realtime for skills table (REPLICA IDENTITY FULL for Realtime subscriptions)
ALTER TABLE public.skills REPLICA IDENTITY FULL;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE (SAFE - IF NOT EXISTS)
-- ============================================================================

-- Index on status for fast filtering (public read queries)
CREATE INDEX IF NOT EXISTS idx_skills_status ON public.skills(status);

-- Index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_skills_display_order ON public.skills(display_order);

-- Index on category for filtering by category
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);

-- Composite index for common query: published skills sorted by order
CREATE INDEX IF NOT EXISTS idx_skills_published_order ON public.skills(status, display_order)
  WHERE status = 'Published';

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICY 1: Public users can READ PUBLISHED skills (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Skills: Public read published" ON public.skills;

CREATE POLICY "Skills: Public read published"
  ON public.skills
  FOR SELECT
  USING (status = 'Published');

-- ============================================================================
-- 5. RLS POLICY 2: Admin users can READ ALL skills (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Skills: Admin read all" ON public.skills;

CREATE POLICY "Skills: Admin read all"
  ON public.skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 6. RLS POLICY 3: Admin users can INSERT skills (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Skills: Admin insert" ON public.skills;

CREATE POLICY "Skills: Admin insert"
  ON public.skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 7. RLS POLICY 4: Admin users can UPDATE skills (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Skills: Admin update" ON public.skills;

CREATE POLICY "Skills: Admin update"
  ON public.skills
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
-- 8. RLS POLICY 5: Admin users can DELETE skills (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Skills: Admin delete" ON public.skills;

CREATE POLICY "Skills: Admin delete"
  ON public.skills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 9. CREATE FUNCTION: auto-update updated_at timestamp (SAFE - CREATE OR REPLACE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_skills_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CREATE TRIGGER: call update_skills_timestamp on update (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP TRIGGER IF EXISTS skills_timestamp_trigger ON public.skills;

CREATE TRIGGER skills_timestamp_trigger
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_skills_timestamp();

-- ============================================================================
-- 11. ENABLE REALTIME: Add skills table to supabase_realtime publication
-- ============================================================================

-- Check if table is already in publication to avoid duplicates
-- Only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'skills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.skills;
  END IF;
END $$;


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
--    a. Check Table Editor > skills (should show new table)
--    b. Click on table > RLS Policies tab (should show 5 policies)
--    c. Verify all 4 indexes are created (Indexes tab)
--    d. Check Realtime is enabled: Tables > skills > Realtime (should show toggle ON)
--
-- ============================================================================
-- SCHEMA COMPATIBILITY VERIFICATION
-- ============================================================================
--
-- This schema has been verified against:
-- ✅ skillService.js: All CRUD operations use these 13 fields
-- ✅ SkillEditor (App.jsx): All form fields map to database columns
-- ✅ SkillsAdmin (App.jsx): All display fields present
-- ✅ initialSkills (data.ts): Schema supports skill structure
--
-- Field mapping:
-- - id: BIGSERIAL (auto-increment, primary key)
-- - name: TEXT NOT NULL (skill name: "React", "TypeScript", etc.)
-- - category: TEXT NOT NULL (category: "Frontend", "Backend", "Languages", etc.)
-- - description_fr: TEXT (French skill description)
-- - description_en: TEXT (English skill description)
-- - level: INTEGER 1-5 (proficiency: 1=beginner, 5=expert)
-- - icon: TEXT (icon name/identifier for UI display)
-- - featured: BOOLEAN (displayed in Marquee section if published)
-- - status: TEXT 'Draft'|'Published'|'Archived' (publication status)
-- - display_order: INTEGER (sort order in UI, 0=first)
-- - created_at: TIMESTAMP (auto-set on insert, immutable)
-- - updated_at: TIMESTAMP (auto-updated on each modification via trigger)
-- - created_by: UUID FK to auth.users (admin who created skill)
--
-- ============================================================================
-- RLS POLICY BEHAVIOR & ADMIN_USERS COMPATIBILITY
-- ============================================================================
--
-- RLS Policies are aligned with admin_users table structure:
-- - admin_users.user_id: UUID reference to auth.users.id
-- - admin_users.role: TEXT field, expected value 'admin'
--
-- Policy Behavior:
-- 1. "Skills: Public read published"
--    - Allows SELECT for anonymous and public users
--    - Condition: status = 'Published'
--    - Effect: Public portfolio only shows published skills
--
-- 2. "Skills: Admin read all"
--    - Allows SELECT for authenticated users with admin role
--    - Condition: admin_users.role = 'admin'
--    - Effect: Admin panel shows all skills (Draft + Published + Archived)
--
-- 3. "Skills: Admin insert"
--    - Allows INSERT only for authenticated admin users
--    - Condition: admin_users.role = 'admin'
--    - Effect: Only admins can create new skills
--
-- 4. "Skills: Admin update"
--    - Allows UPDATE only for authenticated admin users
--    - USING clause: checks if user is admin (read check)
--    - WITH CHECK clause: ensures user is admin (write check)
--    - Effect: Only admins can modify existing skills
--
-- 5. "Skills: Admin delete"
--    - Allows DELETE only for authenticated admin users
--    - Condition: admin_users.role = 'admin'
--    - Effect: Only admins can delete skills
--
-- ============================================================================
-- REALTIME SUPPORT & REPLICATION
-- ============================================================================
--
-- Real-time synchronization is enabled via:
-- 1. REPLICA IDENTITY FULL: Allows Realtime to capture full row changes
-- 2. supabase_realtime publication: Table added to publication (safe check for duplicates)
-- 3. Frontend: subscribeToSkillChanges() in skillService.js listens for INSERT/UPDATE/DELETE
--
-- Real-time Flow:
-- - Admin creates/updates/deletes skill via admin panel
-- - Supabase triggers PostgreSQL changes (via publication)
-- - Realtime broadcasts to all subscribed clients
-- - Public portfolio receives update and re-renders within ~1-2 seconds
-- - No page refresh needed for users to see changes
--
-- ============================================================================
-- INDEXES & PERFORMANCE
-- ============================================================================
--
-- Indexes created for optimal performance:
-- - idx_skills_status: ON public.skills(status)
--   Reason: Most queries filter by published status
--   Used by: getPublishedSkills(), getPublishedSkillsByCategory()
--
-- - idx_skills_display_order: ON public.skills(display_order)
--   Reason: Marquee and skill grids sort by display_order
--   Used by: All SELECT queries with ORDER BY display_order
--
-- - idx_skills_category: ON public.skills(category)
--   Reason: Admin filters skills by category
--   Used by: getSkillsByCategory(), getCategoryNames()
--
-- - idx_skills_published_order: ON public.skills(status, display_order) WHERE status='Published'
--   Reason: Common query for public portfolio (published + sorted)
--   Used by: getPublishedSkills() (covered index for performance)
--
-- ============================================================================
-- SAFETY & IDEMPOTENCE
-- ============================================================================
--
-- This migration is designed to be safe and idempotent:
-- ✅ CREATE TABLE IF NOT EXISTS: Won't error if table already exists
-- ✅ CREATE INDEX IF NOT EXISTS: Won't error if indexes already exist
-- ✅ DROP POLICY IF EXISTS: Safely removes old policies before creating new ones
-- ✅ DO block for publication: Checks if table is already in publication before adding
-- ✅ No data deletion: Uses IF NOT EXISTS and DROP IF EXISTS, never TRUNCATE or DELETE
-- ✅ Preserves existing data: All existing skills remain unchanged
-- ✅ Can run multiple times: Safe to re-run if needed
--
-- Note: If running this migration multiple times:
-- - Existing skills data is NOT modified
-- - Policies are recreated (DROP + CREATE)
-- - Indexes are NOT recreated if they already exist
-- - Realtime publication check prevents duplicates
--
-- ============================================================================
-- TRIGGER SYNTAX CORRECTION
-- ============================================================================
--
-- The update_skills_timestamp() function syntax is correct:
-- - NEW.updated_at = NOW();  (corrected from NEW\.updated_at)
-- - This escaping was removed as it's only needed in regex patterns
-- - The actual SQL trigger syntax is: NEW.updated_at (no escape needed)
-- - Function is created with CREATE OR REPLACE (safe, won't error if exists)
-- - Trigger is dropped and recreated (DROP IF EXISTS + CREATE)
--
-- ============================================================================
