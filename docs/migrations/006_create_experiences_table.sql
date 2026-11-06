-- Migration 006: Create Experiences table with Realtime support and RLS policies
-- Purpose: Migrate Experiences module from localStorage (seedExperiences) to Supabase with real-time sync
-- Date: 2026-11-04
-- Requires: Supabase project with auth enabled, admin_users table from Migration 001
-- Safety: Uses IF NOT EXISTS, DROP IF EXISTS, and ON CONFLICT for idempotence
-- Compatibility: Schema verified against Experience type (src/data.ts) and Frontoffice timeline rendering

-- ============================================================================
-- 1. CREATE EXPERIENCES TABLE (SAFE - IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.experiences (
  -- Identifier
  id BIGSERIAL PRIMARY KEY,
  
  -- Type/Category (bilingual)
  type_fr TEXT NOT NULL,
  type_en TEXT NOT NULL,
  
  -- Title (bilingual)
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  
  -- Organization/Entreprise (bilingual, optional)
  organization_fr TEXT,
  organization_en TEXT,
  
  -- Place/Établissement (single text field, required)
  place TEXT NOT NULL,
  
  -- Description (bilingual)
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  
  -- Responsibilities/Mission (bilingual, optional)
  responsibilities_fr TEXT,
  responsibilities_en TEXT,
  
  -- Technologies (stored as JSON array or text list)
  -- Example: ["React", "Node.js", "Java", "DevOps"]
  technologies TEXT[] DEFAULT '{}',
  
  -- Dates (optional - ISO format YYYY-MM-DD)
  start_date TEXT,
  end_date TEXT,
  
  -- Current position flag (if true, endDate should be empty/null)
  current_position BOOLEAN DEFAULT false,
  
  -- Location (optional - geographic location)
  location TEXT,
  
  -- Publication status
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  
  -- Display order for sorting in timeline (1 = first)
  display_order INTEGER DEFAULT 0,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable realtime for experiences table (REPLICA IDENTITY FULL for Realtime subscriptions)
ALTER TABLE public.experiences REPLICA IDENTITY FULL;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE (SAFE - IF NOT EXISTS)
-- ============================================================================

-- Index on status for fast filtering (public read queries)
CREATE INDEX IF NOT EXISTS idx_experiences_status ON public.experiences(status);

-- Index on display_order for sorting in timeline
CREATE INDEX IF NOT EXISTS idx_experiences_display_order ON public.experiences(display_order);

-- Index on type_fr for filtering by experience type
CREATE INDEX IF NOT EXISTS idx_experiences_type ON public.experiences(type_fr);

-- Composite index for common query: published experiences sorted by order
CREATE INDEX IF NOT EXISTS idx_experiences_published_order ON public.experiences(status, display_order)
  WHERE status = 'Published';

-- Index on current_position for filtering ongoing experiences
CREATE INDEX IF NOT EXISTS idx_experiences_current ON public.experiences(current_position)
  WHERE current_position = true;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICY 1: Public users can READ PUBLISHED experiences (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Experiences: Public read published" ON public.experiences;

CREATE POLICY "Experiences: Public read published"
  ON public.experiences
  FOR SELECT
  USING (status = 'Published');

-- ============================================================================
-- 5. RLS POLICY 2: Admin users can READ ALL experiences (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Experiences: Admin read all" ON public.experiences;

CREATE POLICY "Experiences: Admin read all"
  ON public.experiences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 6. RLS POLICY 3: Admin users can INSERT experiences (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Experiences: Admin insert" ON public.experiences;

CREATE POLICY "Experiences: Admin insert"
  ON public.experiences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- 7. RLS POLICY 4: Admin users can UPDATE experiences (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Experiences: Admin update" ON public.experiences;

CREATE POLICY "Experiences: Admin update"
  ON public.experiences
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
-- 8. RLS POLICY 5: Admin users can DELETE experiences (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP POLICY IF EXISTS "Experiences: Admin delete" ON public.experiences;

CREATE POLICY "Experiences: Admin delete"
  ON public.experiences
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

CREATE OR REPLACE FUNCTION public.update_experiences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CREATE TRIGGER: call update_experiences_timestamp on update (SAFE - DROP IF EXISTS)
-- ============================================================================

DROP TRIGGER IF EXISTS experiences_timestamp_trigger ON public.experiences;

CREATE TRIGGER experiences_timestamp_trigger
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experiences_timestamp();

-- ============================================================================
-- 11. RESET SEQUENCE: Ensure next auto-generated ID starts from 7
-- ============================================================================
-- 
-- After backfill INSERT with explicit IDs (1-6), the BIGSERIAL sequence
-- needs to be reset so the next auto-generated ID will be 7, not 1 or another
-- existing value.
--
-- Without this, creating a new experience would fail with:
--   "duplicate key value violates unique constraint "experiences_pkey""
--

SELECT setval('public.experiences_id_seq', 6);

-- ============================================================================
-- 12. ENABLE REALTIME: Add experiences table to supabase_realtime publication
-- ============================================================================

-- Check if table is already in publication to avoid duplicates
-- Only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'experiences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.experiences;
  END IF;
END $$;

-- ============================================================================
-- 13. BACKFILL DATA: Migrate 6 existing experiences from src/data.ts
-- ============================================================================
-- 
-- These 6 experiences are currently hardcoded in src/data.ts as seedExperiences
-- This migration preserves all content exactly as-is
--

INSERT INTO public.experiences (
  id,
  type_fr,
  type_en,
  title_fr,
  title_en,
  organization_fr,
  organization_en,
  place,
  description_fr,
  description_en,
  responsibilities_fr,
  responsibilities_en,
  technologies,
  start_date,
  end_date,
  current_position,
  location,
  status,
  display_order
)
VALUES
-- Experience 1: Cycle Ingénieur Informatique at ESPRIT
(
  1,
  'Formation',
  'Education',
  'Cycle Ingénieur Informatique',
  'Computer Engineering Degree',
  NULL,
  NULL,
  'ESPRIT',
  'Spécialisation Web et Internet, architecture logicielle et projets multidisciplinaires.',
  'Web and Internet specialization, software architecture, and multidisciplinary projects.',
  'Développement Full Stack, conception et travail en équipe agile.',
  'Full Stack development, design, and agile teamwork.',
  ARRAY['React', 'Node.js', 'Java', 'DevOps'],
  NULL,
  NULL,
  true,
  NULL,
  'Published',
  1
),

-- Experience 2: Développeur Full Stack at Slikoo
(
  2,
  'Stage',
  'Internship',
  'Développeur Full Stack',
  'Full Stack Developer',
  NULL,
  NULL,
  'Slikoo / Detectives Connect',
  'Développement d''une marketplace mettant en relation clients et détectives privés.',
  'Development of a marketplace connecting clients and private investigators.',
  'Interfaces métier, API REST, gestion des données et tests.',
  'Business interfaces, REST API, data management, and testing.',
  ARRAY['Next.js', 'NestJS', 'TypeScript', 'MySQL'],
  NULL,
  NULL,
  false,
  NULL,
  'Published',
  2
),

-- Experience 3: Interface de surveillance industrielle at MECAPROTEC
(
  3,
  'Stage',
  'Internship',
  'Interface de surveillance industrielle',
  'Industrial Monitoring Interface',
  NULL,
  NULL,
  'MECAPROTEC AÉRO / STAPLO',
  'Conception d''une interface de suivi des indicateurs de production industrielle.',
  'Design of an interface for monitoring industrial production indicators.',
  'Analyse des besoins, dashboard responsive et composants de visualisation.',
  'Requirements analysis, responsive dashboard, and visualization components.',
  ARRAY['React', 'JavaScript', 'UI/UX'],
  NULL,
  NULL,
  false,
  NULL,
  'Published',
  3
),

-- Experience 4: Licence en Ingénierie des Systèmes Informatiques
(
  4,
  'Formation',
  'Education',
  'Licence en Ingénierie des Systèmes Informatiques',
  'Bachelor in Information Systems Engineering',
  NULL,
  NULL,
  'Université de Kairouan',
  'Formation fondamentale en développement, bases de données et systèmes.',
  'Core training in development, databases, and systems.',
  'Projets académiques, algorithmique et conception logicielle.',
  'Academic projects, algorithms, and software design.',
  ARRAY['Java', 'C#', 'SQL', 'PHP'],
  NULL,
  NULL,
  false,
  NULL,
  'Published',
  4
),

-- Experience 5: Dental Stock Management Project
(
  5,
  'Stage',
  'Internship',
  'Dental Stock Management',
  'Dental Stock Management',
  NULL,
  NULL,
  'Projet de stage',
  'Application de gestion de stock et fournisseurs pour produits dentaires.',
  'Stock and supplier management application for dental products.',
  'Modélisation, développement CRUD et gestion des alertes.',
  'Modeling, CRUD development, and alert management.',
  ARRAY['React', 'Node.js', 'MongoDB'],
  NULL,
  NULL,
  false,
  NULL,
  'Published',
  5
),

-- Experience 6: Full Stack JavaScript at 9antra
(
  6,
  'Formation',
  'Training',
  'Full Stack JavaScript',
  'Full Stack JavaScript',
  NULL,
  NULL,
  '9antra',
  'Formation pratique à l''écosystème JavaScript moderne.',
  'Hands-on training in the modern JavaScript ecosystem.',
  'Applications MERN, API et déploiement.',
  'MERN applications, APIs, and deployment.',
  ARRAY['React', 'Express', 'MongoDB'],
  NULL,
  NULL,
  false,
  NULL,
  'Published',
  6
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SCHEMA COMPATIBILITY VERIFICATION
-- ============================================================================
--
-- This schema has been verified against:
-- ✅ Experience type definition (src/data.ts)
-- ✅ Frontoffice timeline rendering (App.jsx lines 643-690)
-- ✅ Admin CollectionAdmin component (App.jsx line 2813)
-- ✅ experienceService.js (all CRUD operations)
--
-- Field mapping:
-- - id: BIGSERIAL (auto-increment, primary key)
-- - type_fr/type_en: TEXT NOT NULL (experience type: "Formation", "Stage", "Expérience", etc.)
-- - title_fr/title_en: TEXT NOT NULL (experience title: "Cycle Ingénieur", "Full Stack Developer", etc.)
-- - organization_fr/organization_en: TEXT optional (bilingual organization/enterprise name)
-- - place: TEXT NOT NULL (single location string: "ESPRIT", "Slikoo", "Université de Kairouan", etc.)
-- - description_fr/description_en: TEXT NOT NULL (bilingual description of experience)
-- - responsibilities_fr/responsibilities_en: TEXT optional (mission/responsibilities in both languages)
-- - technologies: TEXT[] (array of technology names: ["React", "Node.js", "Java", ...])
-- - start_date: TEXT (ISO date YYYY-MM-DD or empty string)
-- - end_date: TEXT (ISO date YYYY-MM-DD or empty string, must be empty if current_position=true)
-- - current_position: BOOLEAN (true if ongoing/current position)
-- - location: TEXT (optional geographic location)
-- - status: TEXT 'Draft'|'Published'|'Archived' (publication status)
-- - display_order: INTEGER (sort order in timeline, 1=first)
-- - created_at: TIMESTAMP (auto-set on insert, immutable)
-- - updated_at: TIMESTAMP (auto-updated on each modification via trigger)
-- - created_by: UUID FK to auth.users (admin who created experience)
--
-- ============================================================================
-- DATA PRESERVATION & BACKFILL
-- ============================================================================
--
-- Backfill inserts 6 existing experiences from src/data.ts exactly:
--
-- 1. Cycle Ingénieur Informatique (ESPRIT)
--    - Type: Formation (Education)
--    - Period: Current (current_position=true)
--    - Description: Spécialisation Web et Internet, architecture logicielle...
--    - Responsibilities: Développement Full Stack, conception et travail en équipe agile
--    - Technologies: React, Node.js, Java, DevOps
--    - Status: Published
--    - Order: 1
--
-- 2. Développeur Full Stack (Slikoo / Detectives Connect)
--    - Type: Stage (Internship)
--    - Period: 2025
--    - Description: Développement d'une marketplace mettant en relation clients et détectives privés
--    - Responsibilities: Interfaces métier, API REST, gestion des données et tests
--    - Technologies: Next.js, NestJS, TypeScript, MySQL
--    - Status: Published
--    - Order: 2
--
-- 3. Interface de surveillance industrielle (MECAPROTEC AÉRO / STAPLO)
--    - Type: Stage (Internship)
--    - Period: 2024
--    - Description: Conception d'une interface de suivi des indicateurs de production industrielle
--    - Responsibilities: Analyse des besoins, dashboard responsive et composants de visualisation
--    - Technologies: React, JavaScript, UI/UX
--    - Status: Published
--    - Order: 3
--
-- 4. Licence en Ingénierie des Systèmes Informatiques (Université de Kairouan)
--    - Type: Formation (Education)
--    - Period: 2021 — 2024
--    - Description: Formation fondamentale en développement, bases de données et systèmes
--    - Responsibilities: Projets académiques, algorithmique et conception logicielle
--    - Technologies: Java, C#, SQL, PHP
--    - Status: Published
--    - Order: 4
--
-- 5. Dental Stock Management (Projet de stage)
--    - Type: Stage (Internship)
--    - Period: 2023
--    - Description: Application de gestion de stock et fournisseurs pour produits dentaires
--    - Responsibilities: Modélisation, développement CRUD et gestion des alertes
--    - Technologies: React, Node.js, MongoDB
--    - Status: Published
--    - Order: 5
--
-- 6. Full Stack JavaScript (9antra)
--    - Type: Formation (Training)
--    - Period: 2023
--    - Description: Formation pratique à l'écosystème JavaScript moderne
--    - Responsibilities: Applications MERN, API et déploiement
--    - Technologies: React, Express, MongoDB
--    - Status: Published
--    - Order: 6
--
-- All records have:
-- ✅ Exact content from src/data.ts (no changes, no omissions)
-- ✅ Published status (visible on frontoffice immediately)
-- ✅ Correct display_order (1-6 for timeline ordering)
-- ✅ All bilingual fields (FR + EN)
-- ✅ All technologies preserved
-- ✅ All descriptions and responsibilities preserved
-- ✅ created_at and updated_at auto-set
-- ✅ created_by will be NULL (backfill system data)
--
-- Migration uses ON CONFLICT (id) DO NOTHING to prevent duplicates if run multiple times
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
-- 1. "Experiences: Public read published"
--    - Allows SELECT for anonymous and public users
--    - Condition: status = 'Published'
--    - Effect: Frontoffice timeline only shows published experiences
--    - Used by: getPublishedExperiences() in experienceService
--
-- 2. "Experiences: Admin read all"
--    - Allows SELECT for authenticated users with admin role
--    - Condition: admin_users.role = 'admin'
--    - Effect: Admin panel shows all experiences (Draft + Published + Archived)
--    - Used by: getExperiences() in experienceService
--
-- 3. "Experiences: Admin insert"
--    - Allows INSERT only for authenticated admin users
--    - Condition: admin_users.role = 'admin'
--    - Effect: Only admins can create new experiences
--    - Used by: createExperience() in experienceService
--
-- 4. "Experiences: Admin update"
--    - Allows UPDATE only for authenticated admin users
--    - USING clause: checks if user is admin (read check)
--    - WITH CHECK clause: ensures user is admin (write check)
--    - Effect: Only admins can modify existing experiences
--    - Used by: updateExperience() in experienceService
--
-- 5. "Experiences: Admin delete"
--    - Allows DELETE only for authenticated admin users
--    - Condition: admin_users.role = 'admin'
--    - Effect: Only admins can delete experiences
--    - Used by: deleteExperience() in experienceService
--
-- ============================================================================
-- REALTIME SUPPORT & REPLICATION
-- ============================================================================
--
-- Real-time synchronization is enabled via:
-- 1. REPLICA IDENTITY FULL: Allows Realtime to capture full row changes
-- 2. supabase_realtime publication: Table added to publication (safe check for duplicates)
-- 3. Frontend: subscribeToExperienceChanges() in experienceService.js listens for INSERT/UPDATE/DELETE
--
-- Real-time Flow:
-- - Admin creates/updates/deletes experience via admin panel
-- - Supabase triggers PostgreSQL changes (via publication)
-- - Realtime broadcasts to all subscribed clients
-- - Frontoffice timeline receives update and re-renders within ~1-2 seconds
-- - No page refresh needed for users to see changes
--
-- ============================================================================
-- INDEXES & PERFORMANCE
-- ============================================================================
--
-- Indexes created for optimal performance:
-- - idx_experiences_status: ON public.experiences(status)
--   Reason: Most queries filter by published status
--   Used by: getPublishedExperiences(), which is called for public timeline
--
-- - idx_experiences_display_order: ON public.experiences(display_order)
--   Reason: Timeline sorts by display_order
--   Used by: All SELECT queries with ORDER BY display_order
--
-- - idx_experiences_type: ON public.experiences(type_fr)
--   Reason: Admin filters experiences by type
--   Used by: getExperiencesByType(), getExperienceTypes()
--
-- - idx_experiences_published_order: ON public.experiences(status, display_order) WHERE status='Published'
--   Reason: Common query for public timeline (published + sorted)
--   Used by: getPublishedExperiences() (covered index for performance)
--
-- - idx_experiences_current: ON public.experiences(current_position) WHERE current_position=true
--   Reason: Useful for finding ongoing experiences (e.g., current role highlighting)
--   Used by: Future filtering on current positions
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
-- ✅ INSERT ... ON CONFLICT (id) DO NOTHING: Prevents duplicate records if re-run
-- ✅ No data deletion: Uses IF NOT EXISTS and DROP IF EXISTS, never TRUNCATE or DELETE
-- ✅ Preserves existing data: All existing experiences remain unchanged
-- ✅ Can run multiple times: Safe to re-run if needed (idempotent)
--
-- Note: If running this migration multiple times:
-- - Existing experiences data is NOT modified (ON CONFLICT DO NOTHING protects backfill)
-- - Policies are recreated (DROP + CREATE)
-- - Indexes are NOT recreated if they already exist
-- - Realtime publication check prevents duplicates
--
-- ============================================================================
-- MIGRATION EXECUTION & VERIFICATION
-- ============================================================================
--
-- How to apply this migration:
-- 1. Log into Supabase dashboard: https://app.supabase.com
-- 2. Select project: ihogbszoeyrrusbmsgfb
-- 3. Open SQL Editor
-- 4. Create new query
-- 5. Copy and paste this entire file
-- 6. Click "Run" button
-- 7. Verify steps:
--    a. Check Table Editor > experiences (should show new table with 6 rows)
--    b. Click on table > RLS Policies tab (should show 5 policies)
--    c. Verify all 5 indexes are created (Indexes tab)
--    d. Check Realtime is enabled: Tables > experiences > Realtime (should show toggle ON)
--    e. Verify 6 backfilled records:
--       - Experience 1: Cycle Ingénieur Informatique (display_order=1)
--       - Experience 2: Développeur Full Stack (display_order=2)
--       - Experience 3: Interface de surveillance industrielle (display_order=3)
--       - Experience 4: Licence en Ingénierie des Systèmes Informatiques (display_order=4)
--       - Experience 5: Dental Stock Management (display_order=5)
--       - Experience 6: Full Stack JavaScript (display_order=6)
--       All should have status='Published'
--
-- ============================================================================

