/**
 * Skill Service
 * 
 * Centralized data access layer for skill management with Supabase and Realtime support.
 * This is the single source of truth for all skill data.
 * 
 * Storage strategy:
 * - Primary: Supabase PostgreSQL database
 * - Cache: In-memory cache for performance
 * - Realtime: Supabase Realtime subscriptions for multi-client sync
 * - Legacy: localStorage fallback for backwards compatibility
 * 
 * All functions work with a consistent data structure that allows
 * easy migration to Supabase without changing UI components.
 */

// Import initial skill data
import { initialSkills } from "../data"
import { supabase } from "../lib/supabaseClient"
import { getIconForSkill } from "./iconMappingService"

// Storage key for localStorage (legacy)
const STORAGE_KEY = "mk-skills"
const REALTIME_CHANNEL_NAME = "realtime:skills-changes"

/**
 * In-memory cache of skill data
 * Synced with Supabase for persistence
 */
let skillsCache = null

/**
 * Realtime subscription
 * Stores the current subscription so we can unsubscribe on cleanup
 */
let realtimeSubscription = null

/**
 * Connection state for Realtime
 */
let isConnected = false

/**
 * Track active channel to prevent duplicate subscriptions
 */
let activeChannel = null
let subscriptionCallbacks = []

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

/**
 * Load skills from Supabase database
 * @returns {Promise<{data: Array, error: null} | {data: null, error: Object}>}
 *          Returns {data: skills[], error: null} on success (including empty result)
 *          Returns {data: null, error: ErrorObject} on failure
 *          IMPORTANT: Distinguishes between "no skills" (success) and "query failed" (error)
 */
export const loadSkillsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error loading skills from Supabase:", error)
      return { data: null, error }
    }

    // Transform database format to application format
    // Note: data can be [], which is a valid successful response (no skills in DB)
    const transformedData = (data || []).map(transformDatabaseToSkill)
    return { data: transformedData, error: null }
  } catch (error) {
    console.error("Failed to load skills from Supabase:", error)
    return { data: null, error }
  }
}

/**
 * Create skill in Supabase
 * @param {Object} skillData - Skill data to create
 * @returns {Promise<Object>} Created skill with ID
 */
export const createSkillInSupabase = async (skillData) => {
  try {
    const dbSkill = transformSkillToDatabase(skillData)
    
    const { data, error } = await supabase
      .from("skills")
      .insert([dbSkill])
      .select()
      .single()

    if (error) {
      console.error("Error creating skill in Supabase:", error)
      throw error
    }

    return transformDatabaseToSkill(data)
  } catch (error) {
    console.error("Failed to create skill in Supabase:", error)
    throw error
  }
}

/**
 * Update skill in Supabase
 * Uses partial update transformation to preserve existing values for omitted fields
 * @param {Number} id - Skill ID
 * @param {Object} updates - Fields to update (only supplied fields are included)
 * @returns {Promise<Object>} Updated skill
 */
export const updateSkillInSupabase = async (id, updates) => {
  try {
    // Use partial update transformation to only include supplied fields
    // This prevents accidentally overwriting other fields with defaults
    const dbUpdates = transformPartialSkillUpdate(updates)
    
    const { data, error } = await supabase
      .from("skills")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating skill in Supabase:", error)
      throw error
    }

    return transformDatabaseToSkill(data)
  } catch (error) {
    console.error("Failed to update skill in Supabase:", error)
    throw error
  }
}

/**
 * Delete skill from Supabase
 * @param {Number} id - Skill ID
 * @returns {Promise<Boolean>} True if deleted
 */
export const deleteSkillInSupabase = async (id) => {
  try {
    const { error } = await supabase
      .from("skills")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting skill from Supabase:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Failed to delete skill from Supabase:", error)
    throw error
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to real-time skill changes
 * Fires callback when any skill is inserted, updated, or deleted
 * Uses Supabase v2.119.0 Realtime API with proper subscription status handling
 * @param {Function} callback - Called with { event, skill } when changes occur
 * @param {Boolean} publishedOnly - If true, only subscribe to published changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSkillChanges = (callback, publishedOnly = false) => {
  if (!supabase) {
    console.warn("Supabase client not initialized")
    return () => {}
  }

  try {
    // If channel already exists, reuse it instead of creating a duplicate
    if (activeChannel) {
      console.log("Reusing existing Realtime subscription")
      subscriptionCallbacks.push({ callback, publishedOnly })
      
      // Return unsubscribe function that removes this specific callback
      return () => {
        subscriptionCallbacks = subscriptionCallbacks.filter(
          (item) => item.callback !== callback
        )
        // Only unsubscribe from channel if no more callbacks
        if (subscriptionCallbacks.length === 0 && activeChannel) {
          activeChannel.unsubscribe()
          activeChannel = null
        }
      }
    }

    // Create new channel (first subscription)
    const channel = supabase
      .channel(REALTIME_CHANNEL_NAME, { encode: "json" })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "skills",
        },
        (payload) => {
          try {
            // For DELETE events, payload.new is null, use payload.old for the skill data
            const skillData = payload.new || payload.old
            
            if (!skillData || !skillData.id) {
              console.warn("Received skill change with invalid data:", payload)
              return
            }

            const skill = transformDatabaseToSkill(skillData)
            
            // Call ALL registered callbacks with appropriate filtering
            subscriptionCallbacks.forEach(({ callback: cb, publishedOnly: pubOnly }) => {
              try {
                // For publishedOnly filter: handle status transitions
                // Only call callback if skill should be visible to published-only subscribers
                if (pubOnly) {
                  const isPublished = skill.status === "Published"
                  const wasPublished = payload.old?.status === "Published"
                  
                  // INSERT Published or UPDATE * → Published: pass through
                  // UPDATE Published → Draft or DELETE Published: pass through (caller decides)
                  // UPDATE Draft → Draft or INSERT Draft: skip for published-only
                  if (payload.eventType === "INSERT" && !isPublished) {
                    return
                  }
                  if (payload.eventType === "UPDATE" && !isPublished && !wasPublished) {
                    return // Both old and new are Draft, skip for published-only
                  }
                }

                cb({
                  event: payload.eventType, // INSERT, UPDATE, DELETE
                  skill,
                  // Include old data for UPDATE and DELETE events (helps caller decide action)
                  old: payload.old ? transformDatabaseToSkill(payload.old) : null,
                })
              } catch (error) {
                console.error("Error in skill change callback:", error)
              }
            })
          } catch (error) {
            console.error("Error processing skill change:", error, payload)
          }
        }
      )
      // Use proper Supabase v2 subscribe callback with (status, err) signature
      .subscribe((status, err) => {
        if (err) {
          console.error("Realtime subscription error:", err)
          isConnected = false
          return
        }

        if (status === "SUBSCRIBED") {
          console.log("Realtime subscription established")
          isConnected = true
        } else if (status === "CHANNEL_ERROR") {
          console.error("Channel subscription failed")
          isConnected = false
        } else if (status === "TIMED_OUT") {
          console.warn("Realtime subscription timed out")
          isConnected = false
        } else if (status === "CLOSED") {
          console.log("Realtime subscription closed")
          isConnected = false
        }
      })

    // Store the channel and callback
    activeChannel = channel
    subscriptionCallbacks.push({ callback, publishedOnly })

    // Return unsubscribe function
    return () => {
      subscriptionCallbacks = subscriptionCallbacks.filter(
        (item) => item.callback !== callback
      )
      // Only unsubscribe from channel if no more callbacks
      if (subscriptionCallbacks.length === 0 && activeChannel) {
        activeChannel.unsubscribe()
        activeChannel = null
      }
    }
  } catch (error) {
    console.error("Error subscribing to skill changes:", error)
    return () => {}
  }
}

/**
 * Initialize skills with real-time synchronization
 * Loads skills from Supabase and sets up real-time subscription
 * @param {Function} onSkillsChange - Called when skills change
 * @returns {Promise<Function>} Cleanup function
 */
export const initializeSkillsWithRealtime = async (onSkillsChange) => {
  try {
    // Load initial skills from Supabase
    const { data: skills, error: loadError } = await loadSkillsFromSupabase()

    // Handle database load failure
    if (loadError) {
      console.error("Failed to initialize skills - cannot load from Supabase:", loadError)
      throw new Error(`Database connection failed: ${loadError.message}`)
    }

    skillsCache = skills || []
    onSkillsChange(skillsCache)

    // Subscribe to real-time changes
    // Note: We subscribe to ALL changes (not just published) to keep admin UI in sync
    // Filtering by published status is done in the UI, not in Realtime
    const unsubscribe = subscribeToSkillChanges(({ event, skill, old: oldSkill }) => {
      if (event === "INSERT") {
        // Add new skill to cache
        skillsCache.push(skill)
      } else if (event === "UPDATE") {
        // Update existing skill in cache
        const index = skillsCache.findIndex((s) => s.id === skill.id)
        if (index !== -1) {
          skillsCache[index] = skill
        } else {
          // Skill wasn't in cache but now exists (shouldn't normally happen, but handle it)
          skillsCache.push(skill)
        }
      } else if (event === "DELETE") {
        // Remove skill from cache
        skillsCache = skillsCache.filter((s) => s.id !== skill.id)
      }

      // Always notify caller of ALL changes (admin UI needs to see all statuses)
      // Filtering for public view (Published only) is done in the UI component
      onSkillsChange([...skillsCache])
    }, false) // publishedOnly = false, subscribe to ALL changes

    // Return cleanup function
    return () => {
      unsubscribe()
    }
  } catch (error) {
    console.error("Error initializing skills with realtime:", error)
    throw error
  }
}

/**
 * Refetch skills after connection is restored
 * Useful for handling network reconnection scenarios
 * @returns {Promise<Array>} Updated skills
 */
export const refetchSkillsAfterReconnection = async () => {
  try {
    const { data: skills, error } = await loadSkillsFromSupabase()
    
    if (error) {
      console.warn("Failed to refetch skills after reconnection:", error)
      return skillsCache || []
    }

    skillsCache = skills || []
    return skillsCache
  } catch (error) {
    console.error("Error refetching skills:", error)
    return skillsCache || []
  }
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Map proficiency level names to numeric values
 */
const LEVEL_MAPPING = {
  "beginner": 1,
  "basic": 1,
  "1": 1,
  1: 1,
  "intermediate": 3,
  "intermediate/advanced": 3,
  "2": 2,
  2: 2,
  "3": 3,
  3: 3,
  "advanced": 4,
  "4": 4,
  4: 4,
  "expert": 5,
  "expertise": 5,
  "5": 5,
  5: 5,
}

/**
 * Convert proficiency level (numeric or named) to numeric 1-5
 * Supports: numeric (1-5), named labels (Beginner, Intermediate, Advanced, Expert)
 * @param {Number|String} levelInput - Level as number or string name
 * @returns {Object} { level: number, isValid: boolean, warning: string|null }
 */
const convertProficiencyLevel = (levelInput) => {
  // Handle undefined/null
  if (levelInput === undefined || levelInput === null) {
    return { level: 1, isValid: true, warning: "Level not specified, defaulted to 1 (Beginner)" }
  }

  // Normalize to lowercase string for lookup
  const normalized = String(levelInput).trim().toLowerCase()
  
  // Check mapping
  const mapped = LEVEL_MAPPING[normalized]
  if (mapped !== undefined) {
    return { level: mapped, isValid: true, warning: null }
  }

  // Try numeric parsing as fallback
  const parsed = parseInt(normalized, 10)
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
    return { level: parsed, isValid: true, warning: null }
  }

  // Invalid level - report error
  return {
    level: 1,
    isValid: false,
    warning: `Invalid proficiency level "${levelInput}". Must be 1-5 or one of: Beginner, Intermediate, Advanced, Expert. Defaulted to 1.`,
  }
}

/**
 * Transform application skill format to database format (full transformation with defaults)
 * Used for CREATE operations where all fields need defaults
 * @param {Object} skill - Application skill object
 * @returns {Object} Database format with defaults for missing fields
 */
const transformSkillToDatabase = (skill) => {
  const levelConversion = convertProficiencyLevel(skill.level)
  if (levelConversion.warning) {
    console.warn(`Level conversion: ${levelConversion.warning}`)
  }

  return {
    name: skill.name || "",
    category: skill.category || "",
    description_fr: skill.description?.fr || skill.descriptionFr || "",
    description_en: skill.description?.en || skill.descriptionEn || "",
    level: levelConversion.level,
    icon: skill.icon || null,
    featured: skill.featured || false,
    status: skill.status || "Draft",
    display_order: skill.displayOrder || skill.display_order || 0,
  }
}

/**
 * Transform only supplied fields for partial UPDATE operations
 * Preserves existing database values for omitted properties
 * Supports numeric levels 1-5 and named labels
 * @param {Object} updates - Partial skill object with only fields to update
 * @returns {Object} Database format with ONLY supplied fields (no defaults for omitted fields)
 */
const transformPartialSkillUpdate = (updates) => {
  const dbUpdates = {}
  
  // Map application fields to database fields, but ONLY if they were supplied
  if (updates.name !== undefined) {
    dbUpdates.name = updates.name
  }
  if (updates.category !== undefined) {
    dbUpdates.category = updates.category
  }
  if (updates.description !== undefined) {
    dbUpdates.description_fr = updates.description.fr || ""
    dbUpdates.description_en = updates.description.en || ""
  } else {
    // Handle legacy separate description fields
    if (updates.descriptionFr !== undefined) {
      dbUpdates.description_fr = updates.descriptionFr
    }
    if (updates.descriptionEn !== undefined) {
      dbUpdates.description_en = updates.descriptionEn
    }
  }
  if (updates.level !== undefined) {
    const levelConversion = convertProficiencyLevel(updates.level)
    if (levelConversion.warning) {
      console.warn(`Level conversion during update: ${levelConversion.warning}`)
    }
    dbUpdates.level = levelConversion.level
  }
  if (updates.icon !== undefined) {
    dbUpdates.icon = updates.icon
  }
  if (updates.featured !== undefined) {
    dbUpdates.featured = updates.featured
  }
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
  }
  if (updates.displayOrder !== undefined) {
    dbUpdates.display_order = updates.displayOrder
  } else if (updates.display_order !== undefined) {
    dbUpdates.display_order = updates.display_order
  }
  
  return dbUpdates
}

/**
 * Transform database format to application skill format
 * Automatically assigns icon if missing using iconMappingService
 * 
 * @param {Object} dbSkill - Database skill object
 * @returns {Object} Application format
 */
const transformDatabaseToSkill = (dbSkill) => {
  // Automatically assign icon from mapping service if not present
  const icon = dbSkill.icon || getIconForSkill(dbSkill.name)
  
  return {
    id: dbSkill.id,
    name: dbSkill.name || "",
    category: dbSkill.category || "",
    description: {
      fr: dbSkill.description_fr || "",
      en: dbSkill.description_en || "",
    },
    level: dbSkill.level || 1,
    icon: icon,
    featured: dbSkill.featured || false,
    status: dbSkill.status || "Draft",
    displayOrder: dbSkill.display_order || 0,
  }
}

/**
 * Update in-memory cache
 * @param {Array} skills - New skills array
 */
const updateCache = (skills) => {
  skillsCache = JSON.parse(JSON.stringify(skills))
}

/**
 * Invalidate in-memory cache
 */
const invalidateCache = () => {
  skillsCache = null
}

// ============================================================================
// LEGACY LOCALSTORAGE OPERATIONS (FOR MIGRATION)
// ============================================================================

/**
 * Backup current skills from localStorage
 * Creates a complete backup with timestamp and metadata
 * @returns {Object} Backup object with data, timestamp, and recovery key
 */
export const backupLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      console.log("No localStorage skills to backup")
      return null
    }

    // Parse and validate the stored data
    let parsedData
    try {
      parsedData = JSON.parse(stored)
    } catch (parseError) {
      console.error("Failed to parse localStorage data for backup:", parseError)
      return null
    }

    // Validate it's an array
    if (!Array.isArray(parsedData)) {
      console.error("localStorage data is not an array, cannot backup")
      return null
    }

    const backup = {
      timestamp: new Date().toISOString(),
      version: 1, // For future format versioning
      count: parsedData.length,
      data: parsedData, // Complete array copy
      backupKey: `${STORAGE_KEY}-backup-${Date.now()}`,
    }

    // Store backup in localStorage for recovery
    try {
      localStorage.setItem(backup.backupKey, JSON.stringify(backup))
      console.log(`Backup created: ${backup.backupKey} (${backup.count} skills)`)
      return backup
    } catch (storageError) {
      console.error("Failed to store backup in localStorage:", storageError)
      return null
    }
  } catch (error) {
    console.error("Error backing up localStorage:", error)
    return null
  }
}

/**
 * Get list of available backup keys
 * @returns {Array} Array of backup key strings
 */
export const getAvailableBackups = () => {
  try {
    const backups = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${STORAGE_KEY}-backup-`)) {
        backups.push(key)
      }
    }
    return backups.sort() // Sort chronologically (newer first when reversed)
  } catch (error) {
    console.error("Error getting backups:", error)
    return []
  }
}

/**
 * Verify a backup is valid and contains complete data
 * @param {String} backupKey - Backup key to verify
 * @returns {Object} { valid: boolean, message: string, count: number|null }
 */
export const verifyBackup = (backupKey) => {
  try {
    const backupJson = localStorage.getItem(backupKey)
    if (!backupJson) {
      return { valid: false, message: "Backup not found", count: null }
    }

    const backup = JSON.parse(backupJson)

    // Validate backup structure
    if (!backup.data || !Array.isArray(backup.data)) {
      return {
        valid: false,
        message: "Backup corrupted: missing or invalid data array",
        count: null,
      }
    }

    if (!backup.timestamp) {
      return {
        valid: false,
        message: "Backup corrupted: missing timestamp",
        count: backup.data.length,
      }
    }

    // Validate backup count matches actual data length (INTEGRITY CHECK)
    const skillCount = backup.data.length
    if (backup.count !== skillCount) {
      return {
        valid: false,
        message: `Backup corrupted: count mismatch (backup.count=${backup.count} but data.length=${skillCount})`,
        count: skillCount,
      }
    }

    // Validate each skill has required fields
    let corruptedCount = 0
    backup.data.forEach((skill, index) => {
      if (!skill.name || skill.category === undefined) {
        corruptedCount++
        console.warn(`Backup skill ${index} missing required fields:`, skill)
      }
    })

    if (corruptedCount > 0) {
      return {
        valid: false,
        message: `Backup contains ${corruptedCount}/${skillCount} corrupted skills`,
        count: skillCount,
      }
    }

    return {
      valid: true,
      message: `Backup verified: ${skillCount} skills, created ${backup.timestamp}`,
      count: skillCount,
    }
  } catch (error) {
    console.error("Error verifying backup:", error)
    return {
      valid: false,
      message: `Backup verification failed: ${error.message}`,
      count: null,
    }
  }
}

/**
 * Analyze skills data for migration (compare local vs database)
 * Reports all conflicts, duplicates, missing skills, and invalid level values
 * @returns {Promise<Object>} Analysis results with detailed reporting
 */
export const analyzeMigrationData = async () => {
  try {
    const localData = getLocalStorageSkills()
    const { data: dbData, error: dbError } = await loadSkillsFromSupabase()

    // Handle Supabase query failure
    if (dbError) {
      throw new Error(
        `Failed to load database skills for analysis: ${dbError.message}`
      )
    }

    const analysis = {
      localCount: localData.length,
      dbCount: dbData ? dbData.length : 0,
      local: localData,
      database: dbData || [],
      duplicates: [],
      conflicts: [],
      missing: [],
      duplicatesByAllFields: [],
      invalidLevels: [], // Track skills with invalid level values
    }

    // Check for invalid level values in local data
    localData.forEach((skill) => {
      const levelConversion = convertProficiencyLevel(skill.level)
      if (!levelConversion.isValid) {
        analysis.invalidLevels.push({
          name: skill.name,
          category: skill.category,
          level: skill.level,
          warning: levelConversion.warning,
        })
      }
    })

    // Find duplicates and conflicts (same name + category)
    localData.forEach((localSkill) => {
      const dbMatch = (dbData || []).find(
        (db) =>
          db.name.toLowerCase() === localSkill.name.toLowerCase() &&
          db.category.toLowerCase() === localSkill.category.toLowerCase()
      )
      
      if (dbMatch) {
        // Check if ALL relevant fields match (normalize levels for comparison)
        const localLevel = convertProficiencyLevel(localSkill.level).level
        const fieldsMatch =
          localSkill.description?.fr === dbMatch.description?.fr &&
          localSkill.description?.en === dbMatch.description?.en &&
          localLevel === dbMatch.level &&
          localSkill.icon === dbMatch.icon &&
          localSkill.featured === dbMatch.featured &&
          localSkill.status === dbMatch.status &&
          localSkill.displayOrder === dbMatch.displayOrder

        if (fieldsMatch) {
          // Exact duplicate
          analysis.duplicatesByAllFields.push({
            local: localSkill,
            database: dbMatch,
          })
        } else {
          // Conflict: same name+category but different data
          analysis.conflicts.push({
            local: localSkill,
            database: dbMatch,
            differences: {
              description_fr:
                localSkill.description?.fr !== dbMatch.description?.fr,
              description_en:
                localSkill.description?.en !== dbMatch.description?.en,
              level: localLevel !== dbMatch.level,
              icon: localSkill.icon !== dbMatch.icon,
              featured: localSkill.featured !== dbMatch.featured,
              status: localSkill.status !== dbMatch.status,
              displayOrder:
                localSkill.displayOrder !== dbMatch.displayOrder,
            },
          })
        }
        
        // Also track as duplicate for reporting
        analysis.duplicates.push({
          local: localSkill,
          database: dbMatch,
        })
      }
    })

    // Find skills only in local storage
    localData.forEach((localSkill) => {
      const exists = (dbData || []).some(
        (db) =>
          db.name.toLowerCase() === localSkill.name.toLowerCase() &&
          db.category.toLowerCase() === localSkill.category.toLowerCase()
      )
      if (!exists) {
        analysis.missing.push(localSkill)
      }
    })

    console.log("Migration analysis:", {
      localCount: analysis.localCount,
      dbCount: analysis.dbCount,
      exactDuplicates: analysis.duplicatesByAllFields.length,
      conflicts: analysis.conflicts.length,
      missing: analysis.missing.length,
      invalidLevels: analysis.invalidLevels.length,
    })

    return analysis
  } catch (error) {
    console.error("Error analyzing migration data:", error)
    throw error
  }
}

/**
 * Prepare skills for migration (deduplicate, transform, validate)
 * CRITICAL: Blocks migration if any unresolved conflicts exist
 * @param {Object} analysis - Analysis from analyzeMigrationData
 * @returns {Array} Prepared skills ready to insert
 * @throws Error if conflicts exist (never silently proceeds with conflicts)
 */
export const prepareMigrationData = (analysis) => {
  // ⚠️ CRITICAL CHECK 1: Block migration if invalid proficiency levels exist
  if (analysis.invalidLevels && analysis.invalidLevels.length > 0) {
    const invalidSummary = analysis.invalidLevels
      .map(s => `${s.name} (${s.category}): level="${s.level}" - ${s.warning}`)
      .join("\n  • ")
    
    throw new Error(
      `Cannot proceed with migration: ${analysis.invalidLevels.length} skills have invalid proficiency levels.\n\n` +
      `Skills with invalid levels (must be fixed before migration):\n  • ${invalidSummary}\n\n` +
      `Valid levels are: 1-5 (numeric) or Beginner, Intermediate, Advanced, Expert (named).\n` +
      `Fix invalid levels in localStorage before retrying migration.`
    )
  }

  // ⚠️ CRITICAL CHECK 2: Block migration if any conflicts exist
  if (analysis.conflicts && analysis.conflicts.length > 0) {
    const conflictSummary = analysis.conflicts
      .map(c => `${c.name} (${c.category}): ${Object.keys(c.differences).filter(k => c.differences[k]).join(", ")}`)
      .join("\n  • ")
    
    throw new Error(
      `Cannot proceed with migration: ${analysis.conflicts.length} unresolved conflicts detected.\n\n` +
      `Skills with same name+category but different data (must resolve manually):\n  • ${conflictSummary}\n\n` +
      `Conflicts must be reviewed and resolved manually before migration. ` +
      `Choose whether to keep local or database version for each conflict.`
    )
  }

  const toInsert = [...analysis.missing]

  // Log summary of what will be inserted
  if (analysis.duplicatesByAllFields && analysis.duplicatesByAllFields.length > 0) {
    console.log(
      `Migration will skip ${analysis.duplicatesByAllFields.length} exact duplicates (all fields match).`
    )
  }

  if (toInsert.length > 0) {
    console.log(
      `Migration will insert ${toInsert.length} new skills not found in database.`
    )
  }

  return toInsert
}

/**
 * Insert skills batch into Supabase during migration
 * @param {Array} skills - Skills to insert
 * @returns {Promise<Object>} Insertion results
 */
export const insertSkillsBatch = async (skills) => {
  if (!skills || skills.length === 0) {
    return { inserted: 0, failed: 0, errors: [] }
  }

  const results = {
    inserted: 0,
    failed: 0,
    errors: [],
  }

  // Try to insert all skills together first (faster if all succeed)
  try {
    const dbSkills = skills.map(transformSkillToDatabase)
    
    const { data, error } = await supabase
      .from("skills")
      .insert(dbSkills)
      .select()

    if (error) {
      // If batch insert fails, try individual inserts for better error reporting
      console.warn(
        `Batch insert failed (${error.message}), attempting individual inserts for error reporting...`
      )
      
      // Clear results for individual retry
      results.inserted = 0
      results.failed = 0
      results.errors = []
      
      // Try each skill individually to identify which ones fail
      for (const skill of skills) {
        try {
          const dbSkill = transformSkillToDatabase(skill)
          const { data: insertedData, error: insertError } = await supabase
            .from("skills")
            .insert([dbSkill])
            .select()

          if (insertError) {
            results.failed++
            results.errors.push(
              `"${skill.name}" (${skill.category}): ${insertError.message}`
            )
            console.error(
              `Failed to insert skill "${skill.name}": ${insertError.message}`
            )
          } else {
            results.inserted++
          }
        } catch (catchError) {
          results.failed++
          results.errors.push(
            `"${skill.name}" (${skill.category}): ${catchError.message}`
          )
          console.error(
            `Error inserting skill "${skill.name}": ${catchError.message}`
          )
        }
      }
      
      // Return results even if some failed (don't throw)
      return results
    }

    // Batch insert succeeded
    results.inserted = data?.length || 0
    results.failed = 0
    results.errors = []
    return results
  } catch (error) {
    console.error("Failed to insert skills batch:", error)
    
    // Return error without throwing (allows executor to report it)
    return {
      inserted: 0,
      failed: skills.length,
      errors: [error.message],
    }
  }
}

/**
 * Verify migration completed successfully
 * Compares ALL fields and detects any mismatches, missing records, extra records, or count discrepancies
 * @returns {Promise<Object>} Comprehensive verification result
 */
export const verifyMigration = async () => {
  try {
    const localData = getLocalStorageSkills()
    const { data: dbData, error: dbError } = await loadSkillsFromSupabase()

    // Handle Supabase query failure
    if (dbError) {
      console.error("Cannot verify migration: failed to load database skills", dbError)
      return {
        passed: false,
        error: `Database query failed: ${dbError.message}`,
        totalLocal: localData.length,
        totalDatabase: 0,
        mismatches: [],
        missing: [],
        extra: [],
        unresolved: true,
      }
    }

    const dbSkills = dbData || []
    const mismatches = []
    const missing = []
    const extra = []

    // Verify: all local skills exist in database with matching data
    localData.forEach((localSkill) => {
      const dbMatch = dbSkills.find(
        (db) =>
          db.name.toLowerCase() === localSkill.name.toLowerCase() &&
          db.category.toLowerCase() === localSkill.category.toLowerCase()
      )

      if (!dbMatch) {
        // Skill missing from database - should not happen after successful migration
        missing.push({
          name: localSkill.name,
          category: localSkill.category,
          reason: "Not found in database",
        })
        return
      }

      // Compare ALL fields for this skill
      const fieldDifferences = {}
      
      if (localSkill.description?.fr !== dbMatch.description?.fr) {
        fieldDifferences.description_fr = {
          local: localSkill.description?.fr,
          database: dbMatch.description?.fr,
        }
      }
      
      if (localSkill.description?.en !== dbMatch.description?.en) {
        fieldDifferences.description_en = {
          local: localSkill.description?.en,
          database: dbMatch.description?.en,
        }
      }
      
      // Normalize local level for comparison (matches insertion normalization via convertProficiencyLevel)
      const normalizedLocalLevel = convertProficiencyLevel(localSkill.level)
      if (normalizedLocalLevel.level !== dbMatch.level) {
        fieldDifferences.level = {
          local: localSkill.level,
          database: dbMatch.level,
          normalized: normalizedLocalLevel,
        }
      }
      
      if (localSkill.icon !== dbMatch.icon) {
        fieldDifferences.icon = {
          local: localSkill.icon,
          database: dbMatch.icon,
        }
      }
      
      if (localSkill.featured !== dbMatch.featured) {
        fieldDifferences.featured = {
          local: localSkill.featured,
          database: dbMatch.featured,
        }
      }
      
      if (localSkill.status !== dbMatch.status) {
        fieldDifferences.status = {
          local: localSkill.status,
          database: dbMatch.status,
        }
      }
      
      if (localSkill.displayOrder !== dbMatch.displayOrder) {
        fieldDifferences.displayOrder = {
          local: localSkill.displayOrder,
          database: dbMatch.displayOrder,
        }
      }

      // If any fields differ, record the mismatch
      if (Object.keys(fieldDifferences).length > 0) {
        mismatches.push({
          name: localSkill.name,
          category: localSkill.category,
          differences: fieldDifferences,
        })
      }
    })

    // Check for extra records in database not found in local storage
    // CRITICAL: Extra records must FAIL verification unless explicitly approved
    // (This prevents silent data merging without user awareness)
    dbSkills.forEach((dbSkill) => {
      const hasLocal = localData.some(
        (local) =>
          local.name.toLowerCase() === dbSkill.name.toLowerCase() &&
          local.category.toLowerCase() === dbSkill.category.toLowerCase()
      )
      if (!hasLocal) {
        extra.push({
          name: dbSkill.name,
          category: dbSkill.category,
          status: dbSkill.status,
          note: "Not in local storage - must be reviewed before migration proceeds",
        })
      }
    })

    // Verification passes ONLY if:
    // 1. No missing local skills (all local skills exist in DB)
    // 2. No mismatched fields (all fields match exactly)
    // 3. No extra database records (all DB records have local equivalents)
    // Extra records MUST fail verification to prevent silent data merging
    const passed = missing.length === 0 && mismatches.length === 0 && extra.length === 0

    const details = []
    if (passed) {
      details.push(`✓ Migration verified: ${localData.length} skills migrated, no extra records`)
    } else {
      if (missing.length > 0) {
        details.push(`✗ ${missing.length} local skills missing from database`)
      }
      if (mismatches.length > 0) {
        details.push(`✗ ${mismatches.length} local skills have field mismatches`)
      }
      if (extra.length > 0) {
        details.push(`✗ BLOCKER: ${extra.length} extra database records not in local storage (must be reviewed and resolved before migration)`)
      }
    }

    return {
      passed,
      totalLocal: localData.length,
      totalDatabase: dbSkills.length,
      mismatches,
      missing,
      extra,
      summary: details.join(" | "),
    }
  } catch (error) {
    console.error("Error verifying migration:", error)
    return {
      passed: false,
      error: error.message,
      mismatches: [],
      missing: [],
      extra: [],
    }
  }
}

/**
 * Rollback migration by restoring from backup
 * Validates backup before restoring to prevent data loss
 * @param {String} backupKey - Backup key to restore from
 * @returns {Object} { success: boolean, message: string, count: number|null }
 */
export const rollbackMigration = (backupKey) => {
  try {
    // Verify backup is valid before attempting restore
    const verification = verifyBackup(backupKey)
    if (!verification.valid) {
      console.error("Cannot rollback: backup is invalid")
      return {
        success: false,
        message: `Cannot rollback: ${verification.message}`,
        count: null,
      }
    }

    // Get the backup
    const backupJson = localStorage.getItem(backupKey)
    if (!backupJson) {
      return {
        success: false,
        message: "Backup not found during rollback",
        count: null,
      }
    }

    const backup = JSON.parse(backupJson)

    // Restore the exact data array
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data))

    // Invalidate cache so next read gets fresh data
    invalidateCache()

    console.log(
      `Migration rolled back from backup: ${backupKey} (${backup.data.length} skills restored)`
    )

    return {
      success: true,
      message: `Rollback successful: ${backup.data.length} skills restored from backup (${backup.timestamp})`,
      count: backup.data.length,
    }
  } catch (error) {
    console.error("Error rolling back migration:", error)
    return {
      success: false,
      message: `Rollback failed: ${error.message}`,
      count: null,
    }
  }
}

/**
 * Get skills from localStorage (legacy)
 * @returns {Array} Skills from localStorage
 */
const getLocalStorageSkills = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Error reading localStorage:", error)
  }
  return []
}

/**
 * Migrate old skill data to new schema with all required fields
 * Validates level conversion and reports invalid levels
 * @param {Array} skills - Old skills data
 * @returns {Array} Migrated skills with full schema
 */
const migrateSkills = (skills) => {
  return skills.map((skill, index) => {
    const levelConversion = convertProficiencyLevel(skill.level)
    if (levelConversion.warning) {
      console.warn(`Migrating skill "${skill.name}": ${levelConversion.warning}`)
    }

    return {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      description: skill.description || {
        fr: `Compétence en ${skill.name}`,
        en: `Skills in ${skill.name}`,
      },
      level: levelConversion.level, // Use converted numeric level
      icon: skill.icon || null,
      featured: skill.featured || false,
      status: skill.status || "Published",
      displayOrder: skill.displayOrder !== undefined ? skill.displayOrder : index + 1,
    }
  })
}

/**
 * Initialize skills from localStorage or defaults (legacy)
 * Called on first access to ensure data is loaded
 */
export const initializeSkills = () => {
  if (skillsCache !== null) return skillsCache

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      skillsCache = JSON.parse(stored)
    } else {
      // First load: migrate from initialSkills with new fields
      skillsCache = migrateSkills(initialSkills)
      persistSkills()
    }
  } catch (error) {
    console.error("Error loading skills from storage:", error)
    skillsCache = migrateSkills(initialSkills)
  }

  return skillsCache
}

/**
 * Persist skills to localStorage (legacy)
 */
const persistSkills = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skillsCache))
  } catch (error) {
    console.error("Error saving skills to storage:", error)
  }
}


// ============================================================================
// ASYNC CRUD OPERATIONS (NOW SUPABASE-BACKED)
// ============================================================================

/**
 * Get all skills (admin view)
 * @returns {Promise<Array>} All skills (Published + Draft)
 */
export const getSkills = async () => {
  try {
    const { data, error } = await loadSkillsFromSupabase()

    if (error) {
      console.warn("Error fetching skills from Supabase, falling back to localStorage:", error)
      const skills = initializeSkills()
      return JSON.parse(JSON.stringify(skills))
    }

    const skills = data || []
    updateCache(skills)
    return skills
  } catch (error) {
    console.warn("Error fetching skills from Supabase, falling back to localStorage:", error)
    const skills = initializeSkills()
    return JSON.parse(JSON.stringify(skills))
  }
}

/**
 * Get only published skills (public view)
 * @returns {Promise<Array>} Published skills only, sorted by displayOrder
 */
export const getPublishedSkills = async () => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("status", "Published")
      .order("display_order", { ascending: true })

    if (error) throw error

    return (data || []).map(transformDatabaseToSkill)
  } catch (error) {
    console.warn("Error fetching published skills from Supabase, falling back to localStorage")
    const skills = initializeSkills()
    return JSON.parse(
      JSON.stringify(
        skills
          .filter((s) => s.status === "Published")
          .sort((a, b) => a.displayOrder - b.displayOrder)
      )
    )
  }
}

/**
 * Get skill by ID
 * @param {Number} id - Skill ID
 * @returns {Promise<Object|null>} Skill object or null if not found
 */
export const getSkillById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return data ? transformDatabaseToSkill(data) : null
  } catch (error) {
    console.warn("Error fetching skill by ID, falling back to localStorage")
    const skills = initializeSkills()
    const skill = skills.find((s) => s.id === id)
    return skill ? JSON.parse(JSON.stringify(skill)) : null
  }
}

/**
 * Get skills filtered by category
 * @param {String} category - Category name
 * @returns {Promise<Array>} Skills matching the category
 */
export const getSkillsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("category", category)
      .order("display_order", { ascending: true })

    if (error) throw error
    return (data || []).map(transformDatabaseToSkill)
  } catch (error) {
    console.warn("Error fetching skills by category, falling back to localStorage")
    const skills = initializeSkills()
    return JSON.parse(
      JSON.stringify(
        skills
          .filter((s) => s.category === category)
          .sort((a, b) => a.displayOrder - b.displayOrder)
      )
    )
  }
}

/**
 * Get published skills filtered by category
 * @param {String} category - Category name
 * @returns {Promise<Array>} Published skills matching the category
 */
export const getPublishedSkillsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("category", category)
      .eq("status", "Published")
      .order("display_order", { ascending: true })

    if (error) throw error
    return (data || []).map(transformDatabaseToSkill)
  } catch (error) {
    console.warn("Error fetching published skills by category, falling back to localStorage")
    const skills = initializeSkills()
    return JSON.parse(
      JSON.stringify(
        skills
          .filter((s) => s.status === "Published" && s.category === category)
          .sort((a, b) => a.displayOrder - b.displayOrder)
      )
    )
  }
}

/**
 * Get featured skills
 * @returns {Promise<Array>} Featured skills only, sorted by displayOrder
 */
export const getFeaturedSkills = async () => {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("featured", true)
      .eq("status", "Published")
      .order("display_order", { ascending: true })

    if (error) throw error
    return (data || []).map(transformDatabaseToSkill)
  } catch (error) {
    console.warn("Error fetching featured skills, falling back to localStorage")
    const skills = initializeSkills()
    return JSON.parse(
      JSON.stringify(
        skills
          .filter((s) => s.featured && s.status === "Published")
          .sort((a, b) => a.displayOrder - b.displayOrder)
      )
    )
  }
}

/**
 * Create a new skill
 * @param {Object} skillData - Skill data to create
 * @returns {Promise<Object>} Created skill with assigned ID
 */
export const createSkill = async (skillData) => {
  // Validate required fields
  const validation = validateSkillData(skillData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  try {
    return await createSkillInSupabase(skillData)
  } catch (error) {
    console.error("Failed to create skill:", error)
    throw error
  }
}

/**
 * Update an existing skill
 * @param {Number} id - Skill ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated skill
 */
export const updateSkill = async (id, updates) => {
  // Validate if updating core fields
  if (updates.name || updates.category || updates.level) {
    const existing = await getSkillById(id)
    if (!existing) {
      throw new Error(`Skill with ID ${id} not found`)
    }

    const skillToValidate = { ...existing, ...updates }
    const validation = validateSkillData(skillToValidate)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }
  }

  try {
    return await updateSkillInSupabase(id, updates)
  } catch (error) {
    console.error("Failed to update skill:", error)
    throw error
  }
}

/**
 * Delete a skill
 * @param {Number} id - Skill ID
 * @returns {Promise<Boolean>} True if deleted
 */
export const deleteSkill = async (id) => {
  try {
    return await deleteSkillInSupabase(id)
  } catch (error) {
    console.error("Failed to delete skill:", error)
    throw error
  }
}

/**
 * Toggle skill status between Published and Draft
 * @param {Number} id - Skill ID
 * @returns {Promise<Object>} Updated skill
 */
export const toggleSkillStatus = async (id) => {
  try {
    const skill = await getSkillById(id)
    if (!skill) {
      throw new Error(`Skill with ID ${id} not found`)
    }

    const newStatus = skill.status === "Published" ? "Draft" : "Published"
    return await updateSkill(id, { status: newStatus })
  } catch (error) {
    console.error("Failed to toggle skill status:", error)
    throw error
  }
}

/**
 * Toggle featured status of a skill
 * @param {Number} id - Skill ID
 * @returns {Promise<Object>} Updated skill
 */
export const toggleSkillFeatured = async (id) => {
  try {
    const skill = await getSkillById(id)
    if (!skill) {
      throw new Error(`Skill with ID ${id} not found`)
    }

    return await updateSkill(id, { featured: !skill.featured })
  } catch (error) {
    console.error("Failed to toggle skill featured:", error)
    throw error
  }
}

/**
 * Update display order of skills
 * @param {Array} orderedIds - Array of skill IDs in desired order
 * @returns {Promise<Array>} Updated skills
 */
export const updateSkillsOrder = async (orderedIds) => {
  try {
    const updates = orderedIds.map((id, index) => ({
      id,
      displayOrder: index + 1,
    }))

    const results = []
    for (const update of updates) {
      const skill = await updateSkill(update.id, { displayOrder: update.displayOrder })
      results.push(skill)
    }

    return results
  } catch (error) {
    console.error("Failed to update skills order:", error)
    throw error
  }
}

/**
 * Get next available ID for new skill
 * ⚠️ DEPRECATED: Should not be used with Supabase BIGSERIAL
 * 
 * Supabase automatically generates sequential IDs via BIGSERIAL.
 * This function is kept for backwards compatibility only.
 * 
 * @deprecated Use createSkill() instead, which lets Supabase generate the ID
 * @returns {Promise<Number>} Next ID (calculated from existing skills)
 */
export const getNextSkillId = async () => {
  try {
    const skills = await getSkills()
    return Math.max(...skills.map((s) => s.id), 0) + 1
  } catch (error) {
    console.warn("Error getting next skill ID, using fallback")
    const skills = initializeSkills()
    return Math.max(...skills.map((s) => s.id), 0) + 1
  }
}

/**
 * Get all available categories
 * @returns {Promise<Object>} Categories with skills
 */
export const getCategories = async () => {
  try {
    const skills = await getSkills()
    const categories = {}

    skills.forEach((skill) => {
      if (!categories[skill.category]) {
        categories[skill.category] = []
      }
      categories[skill.category].push(skill)
    })

    return categories
  } catch (error) {
    console.warn("Error getting categories, falling back to localStorage")
    const skills = initializeSkills()
    const categories = {}

    skills.forEach((skill) => {
      if (!categories[skill.category]) {
        categories[skill.category] = []
      }
      categories[skill.category].push(skill)
    })

    return categories
  }
}

/**
 * Get category names sorted from skill_categories table
 * @returns {Promise<Array>} Sorted category names
 */
export const getCategoryNames = async () => {
  try {
    // Query the skill_categories table instead of deriving from skills
    const { data, error } = await supabase
      .from('skill_categories')
      .select('name')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn("Error querying skill_categories table:", error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn("No categories found in database, falling back to localStorage")
      const skills = initializeSkills()
      const categories = {}

      skills.forEach((skill) => {
        if (!categories[skill.category]) {
          categories[skill.category] = []
        }
        categories[skill.category].push(skill)
      })

      return Object.keys(categories).sort()
    }

    // Return sorted category names
    return data.map(cat => cat.name)
  } catch (error) {
    console.warn("Error getting category names from database, falling back to localStorage:", error)
    const skills = initializeSkills()
    const categories = {}

    skills.forEach((skill) => {
      if (!categories[skill.category]) {
        categories[skill.category] = []
      }
      categories[skill.category].push(skill)
    })

    return Object.keys(categories).sort()
  }
}

/**
 * Get available proficiency levels
 * @returns {Array} Available levels
 */
export const getProficiencyLevels = () => {
  return [1, 2, 3, 4, 5]
}

/**
 * Get default/template skill for new skill creation
 * @param {Number} nextId - Next ID to use
 * @returns {Object} Default skill template
 */
export const getDefaultSkill = (nextId) => {
  return {
    id: nextId,
    name: "",
    category: "",
    description: {
      fr: "",
      en: "",
    },
    level: 2,
    icon: null,
    featured: false,
    status: "Draft",
    displayOrder: nextId,
  }
}

/**
 * Get default/initial skills
 * @returns {Array} Default skills
 */
export const getDefaultSkills = () => {
  return JSON.parse(JSON.stringify(migrateSkills(initialSkills)))
}

/**
 * Reset all skills to default state
 * 
 * ⚠️ WARNING: This function PERMANENTLY DELETES all current skills and replaces them with defaults.
 * 
 * CRITICAL CONSTRAINTS:
 * - NEVER call this function during or immediately after migration
 * - NEVER call this function without explicit user confirmation in UI
 * - NEVER call this in automated workflows or batch operations
 * - This is intended ONLY for development/testing scenarios
 * - All skill data will be lost - this is NOT reversible via undo
 * 
 * @returns {Promise<Array>} Reset skills (default set)
 * @throws Error if deletion or insertion fails
 */
export const resetSkills = async () => {
  try {
    // Delete all existing skills
    const { error: deleteError } = await supabase
      .from("skills")
      .delete()
      .neq("id", 0) // Delete all

    if (deleteError) throw deleteError

    // Insert default skills
    const defaultSkills = getDefaultSkills()
    const dbSkills = defaultSkills.map(transformSkillToDatabase)
    
    const { data, error: insertError } = await supabase
      .from("skills")
      .insert(dbSkills)
      .select()

    if (insertError) throw insertError

    const result = (data || []).map(transformDatabaseToSkill)
    updateCache(result)
    return result
  } catch (error) {
    console.error("Failed to reset skills:", error)
    throw error
  }
}

/**
 * Validate skill data
 * @param {Object} skill - Skill to validate
 * @returns {Object} { valid: Boolean, errors: Array }
 */
export const validateSkillData = (skill) => {
  const errors = []

  // Required fields: Name
  if (!skill.name || !skill.name.trim()) {
    errors.push("Nom de compétence obligatoire")
  }

  // Required fields: Category
  if (!skill.category || !skill.category.trim()) {
    errors.push("Catégorie obligatoire")
  }

  // Required fields: Description FR/EN
  if (!skill.description?.fr || !skill.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!skill.description?.en || !skill.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  // Validate level (now numeric 1-5)
  const level = typeof skill.level === "number" ? skill.level : parseInt(skill.level)
  if (isNaN(level) || level < 1 || level > 5) {
    errors.push("Niveau invalide. Doit être entre 1 et 5")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Search skills by text
 * @param {String} searchTerm - Text to search for
 * @returns {Promise<Array>} Matching skills
 */
export const searchSkills = async (searchTerm) => {
  try {
    const skills = await getSkills()
    const term = searchTerm.toLowerCase()

    return JSON.parse(
      JSON.stringify(
        skills.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.category.toLowerCase().includes(term) ||
            (s.level && s.level.toString().includes(term)) ||
            (s.description?.fr || "").toLowerCase().includes(term) ||
            (s.description?.en || "").toLowerCase().includes(term)
        )
      )
    )
  } catch (error) {
    console.warn("Error searching skills, falling back to localStorage")
    const skills = initializeSkills()
    const term = searchTerm.toLowerCase()

    return JSON.parse(
      JSON.stringify(
        skills.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.category.toLowerCase().includes(term)
        )
      )
    )
  }
}

/**
 * Get statistics about skills
 * @returns {Promise<Object>} Skill statistics
 */
export const getSkillStats = async () => {
  try {
    const skills = await getSkills()
    const categories = await getCategories()

    return {
      total: skills.length,
      published: skills.filter((s) => s.status === "Published").length,
      draft: skills.filter((s) => s.status === "Draft").length,
      featured: skills.filter((s) => s.featured).length,
      categories: Object.keys(categories).length,
      byCategory: Object.keys(categories)
        .sort()
        .reduce((acc, cat) => {
          acc[cat] = categories[cat].length
          return acc
        }, {}),
      byLevel: {
        1: skills.filter((s) => s.level === 1).length,
        2: skills.filter((s) => s.level === 2).length,
        3: skills.filter((s) => s.level === 3).length,
        4: skills.filter((s) => s.level === 4).length,
        5: skills.filter((s) => s.level === 5).length,
      },
    }
  } catch (error) {
    console.warn("Error getting skill stats, falling back to localStorage")
    const skills = initializeSkills()
    const categories = getCategories()

    return {
      total: skills.length,
      published: skills.filter((s) => s.status === "Published").length,
      draft: skills.filter((s) => s.status === "Draft").length,
      featured: skills.filter((s) => s.featured).length,
      categories: Object.keys(categories).length,
    }
  }
}
