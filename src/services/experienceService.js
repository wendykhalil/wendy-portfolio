/**
 * Experience Service
 * 
 * Centralized data access layer for experience management.
 * This is the single source of truth for all experience data.
 * 
 * Storage strategy:
 * - Now: Supabase PostgreSQL (primary)
 * - Fallback: localStorage (if Supabase unavailable)
 * 
 * All functions work with a consistent data structure that allows
 * seamless integration with UI components.
 */

import { supabase } from "../lib/supabaseClient"

/**
 * Transform database row to UI-friendly format
 * Converts snake_case database columns to camelCase for components
 * @param {Object} row - Database row
 * @returns {Object} Transformed experience object
 */
const transformFromDatabase = (row) => {
  if (!row) return null
  
  return {
    id: row.id,
    type: {
      fr: row.type_fr,
      en: row.type_en,
    },
    title: {
      fr: row.title_fr,
      en: row.title_en,
    },
    organization: {
      fr: row.organization_fr || "",
      en: row.organization_en || "",
    },
    place: row.place,
    description: {
      fr: row.description_fr,
      en: row.description_en,
    },
    responsibilities: {
      fr: row.responsibilities_fr || "",
      en: row.responsibilities_en || "",
    },
    technologies: row.technologies || [],
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    currentPosition: row.current_position || false,
    location: row.location || "",
    status: row.status,
    displayOrder: row.display_order,
  }
}

/**
 * Transform UI object to database format
 * Converts camelCase to snake_case for database storage
 * @param {Object} exp - Experience object
 * @returns {Object} Database-ready object
 */
const transformToDatabase = (exp) => {
  return {
    type_fr: exp.type?.fr || "",
    type_en: exp.type?.en || "",
    title_fr: exp.title?.fr || "",
    title_en: exp.title?.en || "",
    organization_fr: exp.organization?.fr || null,
    organization_en: exp.organization?.en || null,
    place: exp.place || "",
    description_fr: exp.description?.fr || "",
    description_en: exp.description?.en || "",
    responsibilities_fr: exp.responsibilities?.fr || null,
    responsibilities_en: exp.responsibilities?.en || null,
    technologies: exp.technologies || [],
    start_date: exp.startDate || null,
    end_date: exp.endDate || null,
    current_position: exp.currentPosition || false,
    location: exp.location || "",
    status: exp.status || "Draft",
    display_order: exp.displayOrder || 0,
  }
}

/**
 * Get all experiences (admin view) from Supabase
 * @returns {Promise<Array>} All experiences (Published + Draft)
 */
export const getExperiences = async () => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching experiences:", error)
      throw error
    }

    return data?.map(transformFromDatabase) || []
  } catch (error) {
    console.error("getExperiences failed:", error.message)
    throw new Error(`Failed to load experiences: ${error.message}`)
  }
}

/**
 * Get only published experiences (public view) from Supabase
 * @returns {Promise<Array>} Published experiences only, sorted by displayOrder
 */
export const getPublishedExperiences = async () => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("status", "Published")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching published experiences:", error)
      throw error
    }

    return data?.map(transformFromDatabase) || []
  } catch (error) {
    console.error("getPublishedExperiences failed:", error.message)
    throw new Error(`Failed to load published experiences: ${error.message}`)
  }
}

/**
 * Get experience by ID
 * @param {Number} id - Experience ID
 * @returns {Promise<Object|null>} Experience object or null if not found
 */
export const getExperienceById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Record not found
      }
      console.error("Error fetching experience:", error)
      throw error
    }

    return transformFromDatabase(data)
  } catch (error) {
    console.error("getExperienceById failed:", error.message)
    throw new Error(`Failed to load experience: ${error.message}`)
  }
}

/**
 * Get experiences filtered by type
 * @param {String} type - Type name (Formation, Stage, Expérience, etc.)
 * @returns {Promise<Array>} Experiences matching the type
 */
export const getExperiencesByType = async (type) => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("type_fr", type)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching experiences by type:", error)
      throw error
    }

    return data?.map(transformFromDatabase) || []
  } catch (error) {
    console.error("getExperiencesByType failed:", error.message)
    throw new Error(`Failed to load experiences by type: ${error.message}`)
  }
}

/**
 * Create a new experience in Supabase
 * @param {Object} experienceData - Experience data to create
 * @returns {Promise<Object>} Created experience with assigned ID
 */
export const createExperience = async (experienceData) => {
  try {
    // Validate required fields
    const validation = validateExperienceData(experienceData)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }

    // Get next display order
    const { data: existingData } = await supabase
      .from("experiences")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)

    const nextDisplayOrder = (existingData?.[0]?.display_order || 0) + 1

    // Prepare data for database
    const dbData = {
      ...transformToDatabase(experienceData),
      display_order: experienceData.displayOrder || nextDisplayOrder,
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("experiences")
      .insert([dbData])
      .select()
      .single()

    if (error) {
      console.error("Error creating experience:", error)
      throw error
    }

    return transformFromDatabase(data)
  } catch (error) {
    console.error("createExperience failed:", error.message)
    throw new Error(`Failed to create experience: ${error.message}`)
  }
}

/**
 * Update an existing experience in Supabase
 * @param {Number} id - Experience ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated experience
 */
export const updateExperience = async (id, updates) => {
  try {
    // Validate if updating core fields
    const { data: existing, error: fetchError } = await supabase
      .from("experiences")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching experience for update:", fetchError)
      throw fetchError
    }

    if (!existing) {
      throw new Error(`Experience with ID ${id} not found`)
    }

    // Validate updates
    if (updates.title || updates.type || updates.description) {
      const merged = {
        ...transformFromDatabase(existing),
        ...updates,
      }
      const validation = validateExperienceData(merged)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
      }
    }

    // Prepare data for database
    const dbData = transformToDatabase({
      ...transformFromDatabase(existing),
      ...updates,
    })

    // Update in Supabase
    const { data, error } = await supabase
      .from("experiences")
      .update(dbData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating experience:", error)
      throw error
    }

    return transformFromDatabase(data)
  } catch (error) {
    console.error("updateExperience failed:", error.message)
    throw new Error(`Failed to update experience: ${error.message}`)
  }
}

/**
 * Delete an experience from Supabase
 * @param {Number} id - Experience ID
 * @returns {Promise<Boolean>} True if deleted, false if not found
 */
export const deleteExperience = async (id) => {
  try {
    const { error } = await supabase
      .from("experiences")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting experience:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("deleteExperience failed:", error.message)
    throw new Error(`Failed to delete experience: ${error.message}`)
  }
}

/**
 * Toggle experience status between Published and Draft
 * @param {Number} id - Experience ID
 * @returns {Promise<Object>} Updated experience
 */
export const toggleExperienceStatus = async (id) => {
  try {
    const experience = await getExperienceById(id)
    if (!experience) {
      throw new Error(`Experience with ID ${id} not found`)
    }

    const newStatus = experience.status === "Published" ? "Draft" : "Published"
    return await updateExperience(id, { status: newStatus })
  } catch (error) {
    console.error("toggleExperienceStatus failed:", error.message)
    throw new Error(`Failed to toggle experience status: ${error.message}`)
  }
}

/**
 * Update display order of experiences
 * @param {Array} orderedIds - Array of experience IDs in desired order
 * @returns {Promise<Array>} Updated experiences
 */
export const updateExperiencesOrder = async (orderedIds) => {
  try {
    // Update display_order for each experience
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1,
    }))

    // Batch update
    for (const update of updates) {
      const { error } = await supabase
        .from("experiences")
        .update({ display_order: update.display_order })
        .eq("id", update.id)

      if (error) {
        console.error("Error updating experience order:", error)
        throw error
      }
    }

    // Return updated experiences
    return await getExperiences()
  } catch (error) {
    console.error("updateExperiencesOrder failed:", error.message)
    throw new Error(`Failed to update experience order: ${error.message}`)
  }
}

/**
 * Get next available ID for new experience (deprecated - Supabase handles auto-increment)
 * @returns {Promise<Number>} Next ID
 */
export const getNextExperienceId = async () => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error getting next ID:", error)
      throw error
    }

    return (data?.[0]?.id || 0) + 1
  } catch (error) {
    console.error("getNextExperienceId failed:", error.message)
    throw new Error(`Failed to get next ID: ${error.message}`)
  }
}

/**
 * Get all available experience types
 * @returns {Promise<Array>} Unique types (French labels)
 */
export const getExperienceTypes = async () => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("type_fr")
      .order("type_fr", { ascending: true })

    if (error) {
      console.error("Error fetching experience types:", error)
      throw error
    }

    // Get unique types
    const types = [...new Set(data?.map((e) => e.type_fr) || [])]
    return types.filter(t => t) // Remove null/empty
  } catch (error) {
    console.error("getExperienceTypes failed:", error.message)
    throw new Error(`Failed to load experience types: ${error.message}`)
  }
}

/**
 * Get default/template experience for new experience creation
 * @param {Number} nextId - Next ID to use (can be ignored, Supabase handles auto-increment)
 * @returns {Object} Default experience template
 */
export const getDefaultExperience = (nextId) => {
  return {
    id: null, // Supabase will auto-generate
    type: { fr: "Expérience", en: "Experience" },
    title: { fr: "", en: "" },
    organization: { fr: "", en: "" },
    place: "",
    description: { fr: "", en: "" },
    responsibilities: { fr: "", en: "" },
    technologies: [],
    startDate: "",
    endDate: "",
    currentPosition: false,
    location: "",
    status: "Draft",
    displayOrder: 0, // Will be set by createExperience
  }
}

/**
 * Get default/initial experiences (for reference/fallback)
 * @returns {Array} Default experiences
 */
export const getDefaultExperiences = async () => {
  // This is now a fallback - actual data comes from Supabase
  return []
}

/**
 * Reset all experiences to default state (admin utility)
 * WARNING: This re-populates from database backfill data
 * @returns {Promise<Array>} Reset experiences
 */
export const resetExperiences = async () => {
  // This function now does nothing since we're using Supabase
  // If needed in future, can re-run migration backfill
  console.warn("resetExperiences: Use Supabase SQL to reset data")
  return await getExperiences()
}

/**
 * Validate experience data
 * @param {Object} experience - Experience to validate
 * @returns {Object} { valid: Boolean, errors: Array }
 */
export const validateExperienceData = (experience) => {
  const errors = []

  // Required fields: Title FR/EN
  if (!experience.title?.fr || !experience.title.fr.trim()) {
    errors.push("Titre FR obligatoire")
  }

  if (!experience.title?.en || !experience.title.en.trim()) {
    errors.push("Titre EN obligatoire")
  }

  // Required fields: Description FR/EN
  if (!experience.description?.fr || !experience.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!experience.description?.en || !experience.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  // Required fields: Type and Place
  if (!experience.type) {
    errors.push("Type d'expérience obligatoire")
  }

  if (!experience.place || !experience.place.trim()) {
    errors.push("Établissement/Place obligatoire")
  }

  // Date validation
  if (experience.startDate && experience.endDate) {
    const start = new Date(experience.startDate)
    const end = new Date(experience.endDate)
    if (start > end) {
      errors.push("La date de fin doit être après la date de début")
    }
  }

  // Current position validation: if true, endDate must be empty
  if (experience.currentPosition && experience.endDate && experience.endDate.trim()) {
    errors.push("La date de fin doit être vide pour un poste actuel")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Search experiences by text (client-side search of fetched data)
 * @param {String} searchTerm - Text to search for
 * @returns {Promise<Array>} Matching experiences
 */
export const searchExperiences = async (searchTerm) => {
  try {
    const experiences = await getExperiences()
    const term = searchTerm.toLowerCase()

    return experiences.filter(
      (e) =>
        (e.title?.fr || "").toLowerCase().includes(term) ||
        (e.title?.en || "").toLowerCase().includes(term) ||
        (e.place || "").toLowerCase().includes(term) ||
        (e.type?.fr || "").toLowerCase().includes(term) ||
        (e.type?.en || "").toLowerCase().includes(term) ||
        (e.technologies || []).some((t) => t.toLowerCase().includes(term))
    )
  } catch (error) {
    console.error("searchExperiences failed:", error.message)
    throw new Error(`Failed to search experiences: ${error.message}`)
  }
}

/**
 * Get statistics about experiences
 * @returns {Promise<Object>} Experience statistics
 */
export const getExperienceStats = async () => {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("status, current_position, end_date")

    if (error) {
      console.error("Error fetching experience stats:", error)
      throw error
    }

    const experiences = data || []
    return {
      total: experiences.length,
      published: experiences.filter((e) => e.status === "Published").length,
      draft: experiences.filter((e) => e.status === "Draft").length,
      archived: experiences.filter((e) => e.status === "Archived").length,
      withEndDate: experiences.filter((e) => e.end_date && e.end_date.trim()).length,
      currentPositions: experiences.filter((e) => e.current_position).length,
    }
  } catch (error) {
    console.error("getExperienceStats failed:", error.message)
    throw new Error(`Failed to load experience stats: ${error.message}`)
  }
}
