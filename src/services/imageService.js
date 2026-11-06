/**
 * Image Service
 * 
 * Centralized image upload and deletion for project images.
 * Uses Supabase Storage to persist images with public CDN URLs.
 * 
 * Storage:
 * - Bucket: project-images (public)
 * - Files: /projects/{projectId}/{type}/{filename}
 *   - cover.{ext} for cover image
 *   - screenshot-{index}.{ext} for screenshots
 * 
 * URLs returned by upload() are permanent public CDN URLs
 * Example: https://...supabase.co/storage/v1/object/public/project-images/projects/1/cover.jpg
 */

import { supabase } from '../lib/supabaseClient'

const BUCKET_NAME = 'project-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} { valid: Boolean, error: String|null }
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Format non accepté. Acceptés: JPG, PNG, WEBP' 
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Fichier trop volumineux. Maximum ${MAX_FILE_SIZE / (1024 * 1024)} MB.` 
    }
  }

  return { valid: true, error: null }
}

/**
 * Get file extension from file
 * @param {File} file - File object
 * @returns {String} Extension (jpg, png, webp)
 */
const getFileExtension = (file) => {
  const type = file.type
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg' // fallback
}

/**
 * Upload project cover image
 * @param {Number} projectId - Project ID
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: String, error: String|null}>}
 */
export const uploadProjectCoverImage = async (projectId, file) => {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { url: null, error: validation.error }
    }

    // Generate filename with timestamp for uniqueness
    const ext = getFileExtension(file)
    const timestamp = Date.now()
    const filename = `projects/${projectId}/cover-${timestamp}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { 
        url: null, 
        error: `Erreur d'envoi: ${error.message}` 
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)

    if (!urlData?.publicUrl) {
      return { 
        url: null, 
        error: 'Impossible de générer l\'URL publique' 
      }
    }

    return { url: urlData.publicUrl, error: null }
  } catch (err) {
    console.error('Upload exception:', err)
    return { 
      url: null, 
      error: `Erreur: ${err.message}` 
    }
  }
}

/**
 * Upload project screenshot
 * @param {Number} projectId - Project ID
 * @param {File} file - Screenshot file to upload
 * @param {Number} index - Screenshot index (for ordering)
 * @returns {Promise<{url: String, error: String|null, index: Number}>}
 */
export const uploadProjectScreenshot = async (projectId, file, index) => {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { url: null, error: validation.error, index }
    }

    // Generate filename with timestamp
    const ext = getFileExtension(file)
    const timestamp = Date.now()
    const filename = `projects/${projectId}/screenshot-${index}-${timestamp}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Screenshot upload error:', error)
      return { 
        url: null, 
        error: `Erreur d'envoi: ${error.message}`,
        index
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)

    if (!urlData?.publicUrl) {
      return { 
        url: null, 
        error: 'Impossible de générer l\'URL publique',
        index
      }
    }

    return { url: urlData.publicUrl, error: null, index }
  } catch (err) {
    console.error('Screenshot upload exception:', err)
    return { 
      url: null, 
      error: `Erreur: ${err.message}`,
      index
    }
  }
}

/**
 * Delete image from storage
 * @param {String} publicUrl - Public URL of image to delete
 * @returns {Promise<{success: Boolean, error: String|null}>}
 */
export const deleteProjectImage = async (publicUrl) => {
  try {
    if (!publicUrl) {
      return { success: false, error: 'URL invalide' }
    }

    // Extract path from public URL
    // URL format: https://...storage/.../project-images/projects/1/cover.jpg
    const path = publicUrl.split('/project-images/')[1]
    if (!path) {
      return { success: false, error: 'Format URL non reconnu' }
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { 
        success: false, 
        error: `Erreur de suppression: ${error.message}` 
      }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Delete exception:', err)
    return { 
      success: false, 
      error: `Erreur: ${err.message}` 
    }
  }
}

/**
 * Delete old cover images for a project (cleanup when replacing)
 * @param {Number} projectId - Project ID
 * @returns {Promise<{success: Boolean, error: String|null}>}
 */
export const deleteProjectCoverImages = async (projectId) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`projects/${projectId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('List error:', error)
      return { success: false, error: `Erreur: ${error.message}` }
    }

    // Find cover images (exclude screenshots)
    const coverFiles = (data || [])
      .filter(file => file.name.startsWith('cover-') && !file.name.includes('screenshot'))
      .map(file => `projects/${projectId}/${file.name}`)

    if (coverFiles.length === 0) {
      return { success: true, error: null }
    }

    // Delete old cover images
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(coverFiles)

    if (deleteError) {
      console.error('Cleanup error:', deleteError)
      return { success: false, error: `Erreur nettoyage: ${deleteError.message}` }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Cleanup exception:', err)
    return { success: false, error: `Erreur: ${err.message}` }
  }
}
