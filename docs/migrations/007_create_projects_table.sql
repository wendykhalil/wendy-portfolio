-- Migration 007: Create Projects Table
-- Phase 2 Implementation: Projects Schema with 26 columns, 6 indexes, 5 RLS policies, and seed data backfill
-- Date: 2026-11-04
-- Purpose: Migrate Projects from localStorage to Supabase as single source of truth
-- Preserves all 8 existing projects with full data integrity

-- ============================================================================
-- 1. CREATE SEQUENCE FOR ID GENERATION
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq START 1;

-- ============================================================================
-- 2. CREATE PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  -- Primary Key
  id BIGINT PRIMARY KEY DEFAULT nextval('public.projects_id_seq'),
  
  -- Bilingual Title (required)
  title VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  
  -- Bilingual Description (required, short summary)
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  
  -- Bilingual Detail (required, long description)
  detail_fr TEXT NOT NULL,
  detail_en TEXT NOT NULL,
  
  -- Bilingual Contribution (optional, what I contributed)
  contribution_fr TEXT,
  contribution_en TEXT,
  
  -- Project Metadata
  category VARCHAR(50) NOT NULL,  -- Web Dev, UI/UX, WordPress, Mobile, etc.
  technologies TEXT[] NOT NULL,    -- ARRAY of tech stack (min 1 required)
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Published', 'Draft', 'Archived')),
  
  -- Display Settings
  featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER,  -- For timeline/featured ordering
  
  -- Images
  image VARCHAR(500),  -- CSS gradient fallback or old image URL
  cover_image_url VARCHAR(500),  -- Primary project cover image
  screenshots TEXT[],  -- Array of screenshot URLs from Supabase storage
  images TEXT[],  -- Array of additional project images
  
  -- External Links
  github_url VARCHAR(500),
  live_url VARCHAR(500),
  
  -- Optional Metadata
  year INTEGER,
  duration VARCHAR(100),  -- e.g., "3 months", "6 weeks"
  client VARCHAR(255),  -- Client name if applicable
  
  -- System Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT title_not_empty CHECK (title <> ''),
  CONSTRAINT title_en_not_empty CHECK (title_en <> ''),
  CONSTRAINT description_fr_not_empty CHECK (description_fr <> ''),
  CONSTRAINT description_en_not_empty CHECK (description_en <> ''),
  CONSTRAINT detail_fr_not_empty CHECK (detail_fr <> ''),
  CONSTRAINT detail_en_not_empty CHECK (detail_en <> ''),
  CONSTRAINT technologies_not_empty CHECK (array_length(technologies, 1) >= 1)
);

-- Explicitly establish sequence ownership to projects.id
-- Must come AFTER table creation so the table exists
ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_featured_order ON projects(featured DESC, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title_en);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES (using DO $$ blocks for PostgreSQL compatibility)
-- ============================================================================
-- PostgreSQL does NOT support "CREATE POLICY IF NOT EXISTS" syntax.
-- Using DO $$ blocks with pg_policies check ensures idempotent, rerunnable policies
-- that survive partial execution and safe reruns after failures.

-- Policy 1: Everyone (including anonymous users) can read published projects (Frontoffice display)
-- This policy allows both authenticated and unauthenticated (anon role) users to view Published projects.
-- Supabase requires explicit policies for the 'anon' role to allow public access.
-- The policy only checks the status column and does not require authentication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'Published projects are viewable by everyone' 
    AND tablename = 'projects'
  ) THEN
    CREATE POLICY "Published projects are viewable by everyone"
      ON projects FOR SELECT
      TO public
      USING (status = 'Published');
  END IF;
END $$;

-- Policy 2: Admin users can read all projects (drafts, archives, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'Admins can view all projects' 
    AND tablename = 'projects'
  ) THEN
    CREATE POLICY "Admins can view all projects"
      ON projects FOR SELECT
      USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM public.admin_users 
          WHERE public.admin_users.user_id = auth.uid() 
          AND public.admin_users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 3: Only admin users can create projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'Only admins can create projects' 
    AND tablename = 'projects'
  ) THEN
    CREATE POLICY "Only admins can create projects"
      ON projects FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM public.admin_users 
          WHERE public.admin_users.user_id = auth.uid() 
          AND public.admin_users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 4: Only admin users can update projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'Only admins can update projects' 
    AND tablename = 'projects'
  ) THEN
    CREATE POLICY "Only admins can update projects"
      ON projects FOR UPDATE
      USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM public.admin_users 
          WHERE public.admin_users.user_id = auth.uid() 
          AND public.admin_users.role = 'admin'
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM public.admin_users 
          WHERE public.admin_users.user_id = auth.uid() 
          AND public.admin_users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy 5: Only admin users can delete projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname = 'Only admins can delete projects' 
    AND tablename = 'projects'
  ) THEN
    CREATE POLICY "Only admins can delete projects"
      ON projects FOR DELETE
      USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM public.admin_users 
          WHERE public.admin_users.user_id = auth.uid() 
          AND public.admin_users.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;

CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- ============================================================================
-- 7. BACKFILL SEED DATA (All 8 existing projects)
-- ============================================================================
-- These projects are extracted from src/data.js and preserve all original data
-- Uses ON CONFLICT DO NOTHING to safely skip existing records on rerun
INSERT INTO projects (
  id, title, title_en, description_fr, description_en, detail_fr, detail_en,
  contribution_fr, contribution_en, category, technologies, status, featured, 
  display_order, image, cover_image_url, screenshots, images, github_url, 
  live_url, year, duration, client, created_at, updated_at
) VALUES

-- Project 1: BudgetFlow
(1,
  'BudgetFlow',
  'BudgetFlow',
  'Application web de gestion des finances personnelles.',
  'Personal finance management web application.',
  'Un tableau de bord financier clair pour suivre les dépenses, revenus et objectifs mensuels.',
  'A clear financial dashboard to track expenses, income, and monthly goals.',
  'Architecture front-end, design du dashboard et visualisation des données.',
  'Front-end architecture, dashboard design and data visualization.',
  'Web Development',
  ARRAY['React', 'JavaScript', 'Tailwind'],
  'Published',
  true,
  1,
  'linear-gradient(135deg,#172554 0%,#0f172a 48%,#7c3aed 150%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 2: MindLog AI
(2,
  'MindLog AI',
  'MindLog AI',
  'Journal personnel intelligent pour organiser souvenirs et événements.',
  'Smart personal journal to organize memories and events.',
  'Une expérience de journal augmentée par IA qui transforme les notes en souvenirs structurés.',
  'An AI-enhanced journaling experience that turns notes into structured memories.',
  'UX, composants React et intégration des fonctionnalités intelligentes.',
  'UX, React components and smart feature integration.',
  'Web Development',
  ARRAY['React', 'Django', 'PostgreSQL', 'AI'],
  'Published',
  true,
  2,
  'linear-gradient(145deg,#064e3b 0%,#111827 55%,#8b5cf6 150%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 3: Dental Management
(3,
  'Dental Management',
  'Dental Management',
  'Application de gestion de stock pour produits dentaires.',
  'Inventory management application for dental products.',
  'Suivi centralisé des produits, fournisseurs et alertes de stock critique.',
  'Centralized tracking of products, suppliers, and critical stock alerts.',
  'Développement Full Stack, modélisation et tableau de bord.',
  'Full Stack development, modeling, and dashboard.',
  'Web Development',
  ARRAY['React', 'Node.js', 'Express', 'MongoDB'],
  'Published',
  false,
  3,
  'linear-gradient(145deg,#27272a 0%,#18181b 55%,#6d28d9 150%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 4: BMP.tn
(4,
  'BMP.tn',
  'BMP.tn',
  'Marketplace entre utilisateurs et artisans.',
  'Marketplace connecting users and craftspeople.',
  'Une plateforme de mise en relation avec recherche, profils et recommandations assistées.',
  'A connecting platform with search, profiles, and assisted recommendations.',
  'Recherche utilisateur, UI et développement des parcours principaux.',
  'User research, UI and core journey development.',
  'Web Development',
  ARRAY['React', 'Tailwind', 'AI'],
  'Published',
  false,
  4,
  'linear-gradient(145deg,#3f1d35 0%,#18181b 50%,#7c3aed 140%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 5: SolarShare
(5,
  'SolarShare',
  'SolarShare',
  'Plateforme de location de matériel énergétique renouvelable.',
  'Renewable energy equipment rental platform.',
  'Catalogue et système de réservation pensé pour démocratiser l''accès au matériel solaire.',
  'Catalog and booking system designed to democratize access to solar equipment.',
  'Conception de la base de données et développement des flux de location.',
  'Database design and rental flow development.',
  'Web Development',
  ARRAY['Laravel', 'PHP', 'MySQL', 'Blade'],
  'Published',
  false,
  5,
  'linear-gradient(145deg,#422006 0%,#18181b 55%,#5b21b6 160%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 6: Slikoo
(6,
  'Slikoo',
  'Slikoo',
  'Marketplace mettant en relation clients et détectives privés.',
  'Marketplace connecting clients and private investigators.',
  'Une marketplace sécurisée avec profils, demandes de missions et messagerie.',
  'A secure marketplace with profiles, mission requests, and messaging.',
  'Développement Full Stack et création des interfaces métier.',
  'Full Stack development and business interface creation.',
  'Web Development',
  ARRAY['Next.js', 'NestJS', 'TypeScript', 'MySQL'],
  'Published',
  true,
  6,
  'linear-gradient(145deg,#172554 0%,#18181b 55%,#6d28d9 150%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 7: Verdant Time
(7,
  'Verdant Time',
  'Verdant Time',
  'Boutique de montres premium à l''interface moderne.',
  'Premium watch store with a modern interface.',
  'Un concept e-commerce éditorial mêlant luxe discret et navigation fluide.',
  'An editorial e-commerce concept blending understated luxury and fluid navigation.',
  'Direction artistique, wireframes, UI et prototype interactif.',
  'Art direction, wireframes, UI, and interactive prototype.',
  'UI/UX Design',
  ARRAY['Figma', 'Figma Make'],
  'Published',
  true,
  7,
  'linear-gradient(145deg,#052e16 0%,#18181b 55%,#4c1d95 170%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
),

-- Project 8: Atelier North
(8,
  'Atelier North',
  'Atelier North',
  'Site vitrine professionnel pour une société de conseil.',
  'Professional showcase website for a consulting firm.',
  'Un site administrable rapide et élégant orienté conversion.',
  'A fast, elegant, and conversion-focused manageable website.',
  'Personnalisation du thème, responsive et optimisation.',
  'Theme customization, responsiveness, and optimization.',
  'WordPress',
  ARRAY['WordPress', 'Elementor'],
  'Draft',
  false,
  8,
  'linear-gradient(145deg,#1e1b4b 0%,#18181b 55%,#7e22ce 150%)',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. RESET SEQUENCE TO PREVENT DUPLICATE KEY ERRORS
-- ============================================================================
-- CRITICAL: This MUST come AFTER all seed INSERT statements
-- The sequence needs to be set based on actual inserted data
--
-- This DO block safely handles all scenarios:
-- - Empty table: next generated ID = 1
-- - Table with data: next generated ID = MAX(id) + 1
-- - Rerun after partial failure: recalculates MAX(id) and resets
--
-- Why this approach:
-- 1. Empty table: setval(..., 0, true) fails because sequence min=1
--    Solution: Use setval(..., 1, false) to start at 1
-- 2. With data: Use setval(..., MAX(id), true) so nextval() = MAX(id)+1
-- 3. Idempotent: Recalculates on each run, safe for reruns

DO $$
DECLARE
  max_project_id BIGINT;
BEGIN
  SELECT MAX(id)
  INTO max_project_id
  FROM public.projects;

  IF max_project_id IS NULL THEN
    -- Empty table: start sequence at 1 (is_called=false means next ID is 1)
    PERFORM setval('public.projects_id_seq', 1, false);
  ELSE
    -- Has data: set to MAX(id) with is_called=true so next ID = MAX(id)+1
    PERFORM setval('public.projects_id_seq', max_project_id, true);
  END IF;
END $$;

-- ============================================================================
-- 9. VERIFICATION QUERY (optional, for testing)
-- ============================================================================
-- SELECT COUNT(*) as total_projects FROM projects;
-- SELECT id, title_en, status, featured FROM projects ORDER BY id;

-- ============================================================================
-- Migration 007 Complete
-- ============================================================================
-- Summary:
-- - Created projects table with 26 columns (bilingual fields, images, metadata)
-- - Created 6 indexes for fast queries (status, category, featured, created_by, created_at, title)
-- - Enabled RLS with 5 policies (public read published, admin full CRUD)
-- - Created sequence public.projects_id_seq
-- - Established explicit sequence ownership AFTER table creation
-- - Created updated_at trigger
-- - Backfilled all 8 seed projects with preserved IDs (1-8)
-- - Reset sequence AFTER seed data with safe empty-table handling
--   Empty table: next ID = 1; MAX(id)=8: next ID = 9; MAX(id)=15: next ID = 16
--
-- Ready for Phase 3: Update projectService.js to async Supabase CRUD
