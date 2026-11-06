/**
 * Hero Service
 * Manages hero section data with Supabase persistence
 * Provides load and save operations for profile data
 * Uses singleton profile pattern (single profile record per portfolio)
 */

import { supabase } from '../lib/supabaseClient'

const TABLE_NAME = 'profiles'

// Stable singleton ID for the portfolio profile
// Ensures all saves update the same record instead of creating duplicates
const PROFILE_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Load profile data from Supabase
 * Fetches the singleton profile using stable ID
 * Falls back to default if not found
 * @returns {Promise<{profile: Object, error: string}>}
 */
export async function loadProfileFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', PROFILE_ID)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return null, caller will use defaults
        return { profile: null, error: null }
      }
      console.error('Error loading profile:', error)
      return { profile: null, error: `Erreur chargement profil: ${error.message}` }
    }

    // Transform database record to profile object
    const profile = transformDatabaseToProfile(data)
    return { profile, error: null }
  } catch (err) {
    console.error('Exception loading profile:', err)
    return { profile: null, error: `Erreur: ${err.message}` }
  }
}

/**
 * Save profile data to Supabase
 * Updates the singleton profile record using stable ID
 * All saves update the same record, preventing duplicate profiles
 * @param {Object} profileData - Profile object to save
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function saveProfileToSupabase(profileData) {
  try {
    // Transform profile object to database record
    const dbRecord = transformProfileToDatabase(profileData)

    // Always use the stable singleton ID for consistency
    dbRecord.id = PROFILE_ID

    // Upsert with singleton ID ensures same record is updated
    // If record exists (most cases): UPDATE
    // If record doesn't exist (first save): INSERT
    const { error: upsertError } = await supabase
      .from(TABLE_NAME)
      .upsert([dbRecord], { onConflict: 'id' })

    if (upsertError) {
      console.error('Error saving profile:', upsertError)
      return { success: false, error: `Erreur sauvegarde: ${upsertError.message}` }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Exception saving profile:', err)
    return { success: false, error: `Erreur: ${err.message}` }
  }
}

/**
 * Transform database record to profile object format
 * @param {Object} dbRecord - Database record
 * @returns {Object} Profile object
 */
function transformDatabaseToProfile(dbRecord) {
  if (!dbRecord) return null

  return {
    id: dbRecord.id,
    personal: {
      fullName: dbRecord.full_name,
      email: dbRecord.email,
      phone: dbRecord.phone,
      location: dbRecord.location,
      photo: dbRecord.photo,
    },
    content: {
      fr: {
        label: dbRecord.hero_label_fr,
        greeting: dbRecord.hero_greeting_fr,
        title: dbRecord.hero_title_fr,
        title2: dbRecord.hero_title2_fr,
        hero: dbRecord.hero_description_fr,
        aboutTitle: dbRecord.about_title_fr,
        about: dbRecord.about_fr,
        available: dbRecord.available_fr,
      },
      en: {
        label: dbRecord.hero_label_en,
        greeting: dbRecord.hero_greeting_en,
        title: dbRecord.hero_title_en,
        title2: dbRecord.hero_title2_en,
        hero: dbRecord.hero_description_en,
        aboutTitle: dbRecord.about_title_en,
        about: dbRecord.about_en,
        available: dbRecord.available_en,
      },
    },
    social: {
      github: dbRecord.github || '',
      linkedin: dbRecord.linkedin || '',
    },
    availability: dbRecord.availability,
  }
}

/**
 * Transform profile object to database record format
 * @param {Object} profile - Profile object
 * @returns {Object} Database record
 */
function transformProfileToDatabase(profile) {
  return {
    full_name: profile.personal.fullName,
    email: profile.personal.email,
    phone: profile.personal.phone,
    location: profile.personal.location,
    photo: profile.personal.photo,
    hero_label_fr: profile.content.fr.label,
    hero_greeting_fr: profile.content.fr.greeting,
    hero_title_fr: profile.content.fr.title,
    hero_title2_fr: profile.content.fr.title2,
    hero_description_fr: profile.content.fr.hero,
    hero_label_en: profile.content.en.label,
    hero_greeting_en: profile.content.en.greeting,
    hero_title_en: profile.content.en.title,
    hero_title2_en: profile.content.en.title2,
    hero_description_en: profile.content.en.hero,
    about_title_fr: profile.content.fr.aboutTitle,
    about_fr: profile.content.fr.about,
    available_fr: profile.content.fr.available,
    about_title_en: profile.content.en.aboutTitle,
    about_en: profile.content.en.about,
    available_en: profile.content.en.available,
    github: profile.social.github,
    linkedin: profile.social.linkedin,
    availability: profile.availability,
  }
}
