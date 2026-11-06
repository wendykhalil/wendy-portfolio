/**
 * CV Service
 * Manages PDF curriculum vitae uploads, replacements, and retrieval
 * Supports French (FR) and English (EN) versions
 * 
 * Database: cv_documents table (actual columns: id, language, file_name, storage_path, file_size, mime_type, is_current, uploaded_by_admin_id, created_at, updated_at)
 * Storage: portfolio-cvs bucket
 * 
 * Note: uploaded_by_admin_id is NOT NULL and references admin_users.id
 * Must fetch admin ID before creating CV records
 */

import { supabase } from '../lib/supabaseClient'

const BUCKET_NAME = 'portfolio-cvs'
const TABLE_NAME = 'cv_documents'
const ADMIN_TABLE_NAME = 'admin_users'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * Normalize language to lowercase 'fr' or 'en'
 * Database constraint: CHECK (language IN ('fr', 'en'))
 * @param {string} language - 'FR', 'EN', 'fr', 'en', 'french', 'english', etc.
 * @returns {Object} {language: string, error: string}
 */
function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') {
    return { language: null, error: 'Langue non spécifiée' }
  }

  const normalized = String(language).toLowerCase().trim()

  // Map common aliases to standard codes
  const languageMap = {
    'fr': 'fr',
    'en': 'en',
    'french': 'fr',
    'français': 'fr',
    'english': 'en',
    'anglais': 'en'
  }

  const result = languageMap[normalized]

  if (!result) {
    return {
      language: null,
      error: `Langue non supportée: ${language}. Accepté: 'fr' ou 'en'`
    }
  }

  return { language: result, error: null }
}

/**
 * Get authenticated admin's admin_users ID
 * Required for uploaded_by_admin_id column (NOT NULL)
 * @returns {Promise<{id: string, error: string}>}
 */
async function getAuthenticatedAdminId() {
  try {
    // Get current auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return { id: null, error: 'Non authentifié' }
    }

    const userId = session.user.id

    // Fetch admin record with this user_id
    const { data, error } = await supabase
      .from(ADMIN_TABLE_NAME)
      .select('id, role')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          id: null,
          error: 'Utilisateur non trouvé dans admin_users'
        }
      }
      return { id: null, error: `Erreur lecture admin : ${error.message}` }
    }

    if (!data) {
      return { id: null, error: 'Aucun enregistrement admin trouvé' }
    }

    if (data.role !== 'admin') {
      return { id: null, error: 'Rôle utilisateur invalide' }
    }

    return { id: data.id, error: null }
  } catch (err) {
    return { id: null, error: `Erreur : ${err.message}` }
  }
}

/**
 * Validate PDF file
 * @param {File} file - File to validate
 * @returns {Object} {valid: boolean, error: string}
 */
export function validatePdfFile(file) {
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné' }
  }

  // Check MIME type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Format non accepté. Accepté : PDF' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux. Maximum ${MAX_FILE_SIZE / 1024 / 1024} MB.`
    }
  }

  return { valid: true, error: null }
}

/**
 * Upload a new CV file to Storage
 * @param {string} language - 'fr' or 'en' (will be normalized)
 * @param {File} file - PDF file
 * @returns {Promise<{path: string, error: string}>}
 */
async function uploadCvFile(language, file) {
  try {
    // Normalize language
    const normalResult = normalizeLanguage(language)
    if (normalResult.error) {
      return { path: null, error: normalResult.error }
    }
    const normalizedLanguage = normalResult.language

    const timestamp = Date.now()
    const fileName = `cv_${normalizedLanguage}_${timestamp}.pdf`
    const storagePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (error) {
      return { path: null, error: `Erreur upload : ${error.message}` }
    }

    return { path: data.path, error: null }
  } catch (err) {
    return { path: null, error: `Erreur upload : ${err.message}` }
  }
}

/**
 * Delete a CV file from Storage
 * @param {string} storagePath - Path to file in Storage
 * @returns {Promise<{success: boolean, error: string}>}
 */
async function deleteCvFile(storagePath) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath])

    if (error) {
      return { success: false, error: `Erreur suppression : ${error.message}` }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `Erreur suppression : ${err.message}` }
  }
}

/**
 * Get public URL for a CV file
 * Generates dynamically from storage_path
 * @param {string} storagePath - Path to file in Storage
 * @returns {string} Public URL
 */
function getPublicUrl(storagePath) {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  return data?.publicUrl || null
}

/**
 * Create CV record in database
 * @param {Object} cvData - {language, file_name, storage_path, file_size, mime_type, uploaded_by_admin_id}
 * @returns {Promise<{id: string, error: string}>}
 */
async function createCvRecord(cvData) {
  try {
    // Normalize language
    const normalResult = normalizeLanguage(cvData.language)
    if (normalResult.error) {
      return { id: null, error: normalResult.error }
    }
    const normalizedLanguage = normalResult.language

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([
        {
          language: normalizedLanguage,
          file_name: cvData.file_name,
          storage_path: cvData.storage_path,
          file_size: cvData.file_size,
          mime_type: cvData.mime_type,
          is_current: true,
          uploaded_by_admin_id: cvData.uploaded_by_admin_id
        }
      ])
      .select()

    if (error) {
      return { id: null, error: `Erreur BD : ${error.message}` }
    }

    return { id: data[0]?.id, error: null }
  } catch (err) {
    return { id: null, error: `Erreur BD : ${err.message}` }
  }
}

/**
 * Update CV record (mark as current)
 * @param {string} id - Record ID
 * @param {boolean} isCurrent - Current status
 * @returns {Promise<{success: boolean, error: string}>}
 */
async function updateCvRecord(id, isCurrent) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        is_current: isCurrent,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: `Erreur mise à jour : ${error.message}` }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `Erreur mise à jour : ${err.message}` }
  }
}

/**
 * Get all CVs for a language
 * @param {string} language - 'fr' or 'en' (will be normalized)
 * @returns {Promise<{cvs: Array, error: string}>}
 */
export async function getCvsByLanguage(language) {
  try {
    // Normalize language
    const normalResult = normalizeLanguage(language)
    if (normalResult.error) {
      return { cvs: [], error: normalResult.error }
    }
    const normalizedLanguage = normalResult.language

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('language', normalizedLanguage)
      .order('created_at', { ascending: false })

    if (error) {
      return { cvs: [], error: `Erreur lecture : ${error.message}` }
    }

    // Add dynamically generated public URLs
    const cvsWithUrls = (data || []).map(cv => ({
      ...cv,
      public_url: getPublicUrl(cv.storage_path)
    }))

    return { cvs: cvsWithUrls, error: null }
  } catch (err) {
    return { cvs: [], error: `Erreur : ${err.message}` }
  }
}

/**
 * Get current CV for a language
 * @param {string} language - 'fr' or 'en' (will be normalized)
 * @returns {Promise<{cv: Object, error: string}>}
 */
export async function getCurrentCv(language) {
  try {
    // Normalize language
    const normalResult = normalizeLanguage(language)
    if (normalResult.error) {
      return { cv: null, error: normalResult.error }
    }
    const normalizedLanguage = normalResult.language

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('language', normalizedLanguage)
      .eq('is_current', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is OK, just no current CV
        return { cv: null, error: null }
      }
      return { cv: null, error: `Erreur lecture : ${error.message}` }
    }

    // Add dynamically generated public URL
    const cvWithUrl = {
      ...data,
      public_url: getPublicUrl(data.storage_path)
    }

    return { cv: cvWithUrl, error: null }
  } catch (err) {
    return { cv: null, error: `Erreur : ${err.message}` }
  }
}

/**
 * Get current CVs for both languages
 * @returns {Promise<{cvs: {fr: Object, en: Object}, error: string}>}
 */
export async function getCurrentCvs() {
  try {
    const [frResult, enResult] = await Promise.all([
      getCurrentCv('fr'),
      getCurrentCv('en')
    ])

    if (frResult.error && enResult.error) {
      return { cvs: { fr: null, en: null }, error: 'Erreur lecture CVs' }
    }

    return {
      cvs: {
        fr: frResult.cv,
        en: enResult.cv
      },
      error: null
    }
  } catch (err) {
    return { cvs: { fr: null, en: null }, error: `Erreur : ${err.message}` }
  }
}

/**
 * Upload a new CV and make it current
 * @param {string} language - 'FR' or 'EN'
 * @param {File} file - PDF file
 * @returns {Promise<{success: boolean, id: string, error: string}>}
 */
export async function uploadCv(language, file) {
  try {
    // Validate file
    const validation = validatePdfFile(file)
    if (!validation.valid) {
      return { success: false, id: null, error: validation.error }
    }

    // Get authenticated admin ID
    const adminResult = await getAuthenticatedAdminId()
    if (adminResult.error) {
      return { success: false, id: null, error: adminResult.error }
    }

    const uploadedByAdminId = adminResult.id

    // Upload file to Storage
    const uploadResult = await uploadCvFile(language, file)
    if (uploadResult.error) {
      return { success: false, id: null, error: uploadResult.error }
    }

    // Get public URL
    const publicUrl = getPublicUrl(uploadResult.path)
    if (!publicUrl) {
      // Clean up uploaded file if URL generation failed
      await deleteCvFile(uploadResult.path)
      return {
        success: false,
        id: null,
        error: 'Erreur génération URL publique'
      }
    }

    // Create database record
    const recordResult = await createCvRecord({
      language,
      file_name: file.name,
      storage_path: uploadResult.path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by_admin_id: uploadedByAdminId
    })

    if (recordResult.error) {
      // Clean up uploaded file if database creation failed
      await deleteCvFile(uploadResult.path)
      return {
        success: false,
        id: null,
        error: recordResult.error
      }
    }

    return {
      success: true,
      id: recordResult.id,
      error: null
    }
  } catch (err) {
    return { success: false, id: null, error: `Erreur : ${err.message}` }
  }
}

/**
 * Replace current CV with a new one
 * Safe operation: uploads new file and updates DB before deleting old one
 * @param {string} language - 'FR' or 'EN'
 * @param {File} file - New PDF file
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function replaceCv(language, file) {
  try {
    // Validate file
    const validation = validatePdfFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Get authenticated admin ID
    const adminResult = await getAuthenticatedAdminId()
    if (adminResult.error) {
      return { success: false, error: adminResult.error }
    }

    const uploadedByAdminId = adminResult.id

    // Get current CV to preserve if replacement fails
    const currentResult = await getCurrentCv(language)
    if (currentResult.error) {
      return { success: false, error: currentResult.error }
    }

    const oldCv = currentResult.cv
    if (!oldCv) {
      // No current CV exists, just upload new one
      const uploadResult = await uploadCv(language, file)
      return {
        success: uploadResult.success,
        error: uploadResult.error
      }
    }

    // Upload new file to Storage
    const uploadResult = await uploadCvFile(language, file)
    if (uploadResult.error) {
      return { success: false, error: uploadResult.error }
    }

    // Get public URL
    const publicUrl = getPublicUrl(uploadResult.path)
    if (!publicUrl) {
      await deleteCvFile(uploadResult.path)
      return { success: false, error: 'Erreur génération URL publique' }
    }

    // Mark old CV as not current
    const updateOldResult = await updateCvRecord(oldCv.id, false)
    if (updateOldResult.error) {
      // Clean up new file if update fails
      await deleteCvFile(uploadResult.path)
      return { success: false, error: updateOldResult.error }
    }

    // Create new CV record as current
    const recordResult = await createCvRecord({
      language,
      file_name: file.name,
      storage_path: uploadResult.path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by_admin_id: uploadedByAdminId
    })

    if (recordResult.error) {
      // Restore old CV as current
      await updateCvRecord(oldCv.id, true)
      // Clean up new file
      await deleteCvFile(uploadResult.path)
      return { success: false, error: recordResult.error }
    }

    // Now safe to delete old file from Storage (DB is consistent)
    await deleteCvFile(oldCv.storage_path)

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `Erreur : ${err.message}` }
  }
}

/**
 * Delete a specific CV record and its file
 * Cannot delete if it's the only current CV for that language
 * @param {string} id - CV record ID
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function deleteCv(id) {
  try {
    // Get CV record to check if it's current
    const { data, error: selectError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single()

    if (selectError) {
      return { success: false, error: `CV non trouvé : ${selectError.message}` }
    }

    const cv = data
    const { language, storage_path, is_current } = cv

    // If this is the current CV, find another to promote or prevent deletion
    if (is_current) {
      // Check if there are other CVs for this language
      const { data: otherCvs, error: listError } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('language', language)
        .neq('id', id)
        .limit(1)

      if (listError) {
        return {
          success: false,
          error: `Erreur vérification : ${listError.message}`
        }
      }

      if (!otherCvs || otherCvs.length === 0) {
        // This is the only CV for this language
        return {
          success: false,
          error: `Impossible de supprimer : c'est le seul CV pour cette langue`
        }
      }

      // Promote the oldest other CV as current
      const otherCv = otherCvs[0]
      const promoteResult = await updateCvRecord(otherCv.id, true)
      if (promoteResult.error) {
        return { success: false, error: promoteResult.error }
      }
    }

    // Delete database record
    const { error: deleteDbError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)

    if (deleteDbError) {
      return {
        success: false,
        error: `Erreur suppression BD : ${deleteDbError.message}`
      }
    }

    // Delete file from Storage
    await deleteCvFile(storage_path)

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `Erreur : ${err.message}` }
  }
}

/**
 * Download current CV for a language
 * Returns the public URL for the current CV
 * @param {string} language - 'fr' or 'en' (will be normalized)
 * @returns {Promise<{url: string, error: string}>}
 */
export async function downloadCurrentCv(language) {
  try {
    const { cv, error } = await getCurrentCv(language)

    if (error) {
      return { url: null, error }
    }

    if (!cv) {
      // Normalize for display
      const normalResult = normalizeLanguage(language)
      const lang = normalResult.error ? language : normalResult.language
      return {
        url: null,
        error: `Aucun CV disponible pour ${lang}`
      }
    }

    // Return dynamically generated public URL
    return { url: cv.public_url, error: null }
  } catch (err) {
    return { url: null, error: `Erreur : ${err.message}` }
  }
}
