-- Migration: Create profiles table for portfolio hero and profile data
-- Date: 2026-11-04
-- Purpose: Store bilingual profile content with Supabase persistence
-- Design: Single profile record per portfolio (singleton pattern)
-- Singleton ID: 00000000-0000-0000-0000-000000000001
-- Status: Ready for manual execution in Supabase SQL Editor

-- ============================================================================
-- PROFILES TABLE (Hero and Profile Data)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  
  -- Personal information
  full_name TEXT NOT NULL DEFAULT 'Med Khalil Wendy',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT 'Tunisie',
  photo TEXT DEFAULT '/images/profile.jpg',
  
  -- Hero section - French
  hero_label_fr TEXT NOT NULL DEFAULT 'PORTFOLIO 2026',
  hero_greeting_fr TEXT NOT NULL DEFAULT 'Bonjour, je suis',
  hero_title_fr TEXT NOT NULL DEFAULT 'Future Ingénieur Informatique',
  hero_title2_fr TEXT NOT NULL DEFAULT 'Full Stack Developer',
  hero_description_fr TEXT NOT NULL DEFAULT 'Passionné par le développement web et la conception d''interfaces modernes, je transforme les idées en applications performantes, intuitives et scalables.',
  
  -- Hero section - English
  hero_label_en TEXT NOT NULL DEFAULT 'PORTFOLIO 2026',
  hero_greeting_en TEXT NOT NULL DEFAULT 'Hello, I am',
  hero_title_en TEXT NOT NULL DEFAULT 'Future Software Engineer',
  hero_title2_en TEXT NOT NULL DEFAULT 'Full Stack Developer',
  hero_description_en TEXT NOT NULL DEFAULT 'Passionate about web development and modern interface design, I turn ideas into high-performance, intuitive, and scalable applications.',
  
  -- About section - French
  about_title_fr TEXT NOT NULL DEFAULT 'À propos de moi',
  about_fr TEXT NOT NULL DEFAULT 'Je suis Med Khalil Wendy, étudiant en cycle ingénieur en informatique à ESPRIT, spécialisé en Web et Internet. Passionné par la création d''applications web et les nouvelles technologies, j''aime concevoir des interfaces modernes et développer des solutions complètes répondant à des besoins réels.',
  available_fr TEXT NOT NULL DEFAULT 'À la recherche d''opportunités professionnelles',
  
  -- About section - English
  about_title_en TEXT NOT NULL DEFAULT 'About me',
  about_en TEXT NOT NULL DEFAULT 'I am Med Khalil Wendy, a computer engineering student at ESPRIT specializing in Web and Internet technologies. Passionate about web applications and emerging technologies, I enjoy crafting modern interfaces and building complete solutions for real needs.',
  available_en TEXT NOT NULL DEFAULT 'Open to professional opportunities',
  
  -- Social links
  github TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  
  -- Availability status
  availability BOOLEAN DEFAULT true,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SINGLETON CONSTRAINT
-- ============================================================================

-- Ensures only one profile record can exist
-- Unique index on constant value (1) prevents insertion of second row
CREATE UNIQUE INDEX idx_profiles_singleton ON public.profiles ((1))
  WHERE id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (for public portfolio display)
-- Accessible to both anonymous and authenticated users
CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- Policy: Admin-only update access
-- Requires authentication and admin role verification
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND admin_users.role = 'admin'
    )
  );

-- Policy: Admin-only insert access (edge case coverage)
-- Rarely used (only one record) but provided for completeness
CREATE POLICY "profiles_admin_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND admin_users.role = 'admin'
    )
  );

-- ============================================================================
-- SINGLETON PROFILE DATA
-- ============================================================================

-- Insert the singleton profile record
-- ID: 00000000-0000-0000-0000-000000000001 (matches heroService.js PROFILE_ID)
-- All admin saves use this ID via upsert, ensuring single profile record
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  phone,
  location,
  photo,
  hero_label_fr,
  hero_greeting_fr,
  hero_title_fr,
  hero_title2_fr,
  hero_description_fr,
  hero_label_en,
  hero_greeting_en,
  hero_title_en,
  hero_title2_en,
  hero_description_en,
  about_title_fr,
  about_fr,
  available_fr,
  about_title_en,
  about_en,
  available_en,
  github,
  linkedin,
  availability
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Med Khalil Wendy',
  '',
  '',
  'Tunisie',
  '/images/profile.jpg',
  'PORTFOLIO 2026',
  'Bonjour, je suis',
  'Future Ingénieur Informatique',
  'Full Stack Developer',
  'Passionné par le développement web et la conception d''interfaces modernes, je transforme les idées en applications performantes, intuitives et scalables.',
  'PORTFOLIO 2026',
  'Hello, I am',
  'Future Software Engineer',
  'Full Stack Developer',
  'Passionate about web development and modern interface design, I turn ideas into high-performance, intuitive, and scalable applications.',
  'À propos de moi',
  'Je suis Med Khalil Wendy, étudiant en cycle ingénieur en informatique à ESPRIT, spécialisé en Web et Internet. Passionné par la création d''applications web et les nouvelles technologies, j''aime concevoir des interfaces modernes et développer des solutions complètes répondant à des besoins réels.',
  'À la recherche d''opportunités professionnelles',
  'About me',
  'I am Med Khalil Wendy, a computer engineering student at ESPRIT specializing in Web and Internet technologies. Passionate about web applications and emerging technologies, I enjoy crafting modern interfaces and building complete solutions for real needs.',
  'Open to professional opportunities',
  '',
  '',
  true
) ON CONFLICT DO NOTHING;
