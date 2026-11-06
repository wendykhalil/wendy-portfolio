/**
 * Project Service
 * 
 * Centralized data access layer for project management.
 * This is the single source of truth for all project data.
 * 
 * Storage strategy:
 * - Phase 3+: Supabase PostgreSQL (backend)
 * - Fallback: localStorage for offline/error scenarios
 * 
 * All functions are async and work with Supabase as primary storage.
 * Data structure allows seamless integration with UI components.
 * 
 * Migration Notes (Phase 3):
 * - All functions converted to async
 * - Projects table must exist in Supabase (created by 007_create_projects_table.sql)
 * - RLS policies required: public read (Published status), admin CRUD
 * - Images stored in project-images bucket via imageService
 */

import { supabase } from "../lib/supabaseClient"
import { initialProjects } from "../data"
const STORAGE_KEY = "mk-projects"

/**
 * In-memory cache of project data
 * Used for client-side search/filter to avoid repeated DB queries
 */
let projectsCache = null
let cacheTimestamp = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Check if cache is still valid
 */
const isCacheValid = () => {
  return projectsCache !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION
}

/**
 * Initialize projects from Supabase
 * Falls back to localStorage if Supabase unavailable
 * Called on first access to ensure data is loaded
 */
const initializeProjects = async () => {
  if (isCacheValid()) return projectsCache

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn("Supabase fetch failed, falling back to localStorage:", error)
      return getProjectsFromLocalStorage()
    }

    projectsCache = data || []
    cacheTimestamp = Date.now()
    return projectsCache
  } catch (error) {
    console.error("Error initializing projects from Supabase:", error)
    return getProjectsFromLocalStorage()
  }
}

/**
 * Get projects from localStorage (fallback)
 */
const getProjectsFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(initialProjects))
  } catch (error) {
    console.error("Error loading projects from localStorage:", error)
    return JSON.parse(JSON.stringify(initialProjects))
  }
}

/**
 * Transform database format to app format
 * Database uses snake_case with bilingual columns; app uses camelCase with nested objects
 */
const transformFromDB = (dbProject) => {
  if (!dbProject) return null
  
  return {
    id: dbProject.id,
    title: dbProject.title || "",
    titleEn: dbProject.title_en || "",
    category: dbProject.category || "Web Dev",
    description: {
      fr: dbProject.description_fr || "",
      en: dbProject.description_en || "",
    },
    detail: {
      fr: dbProject.detail_fr || "",
      en: dbProject.detail_en || "",
    },
    contribution: {
      fr: dbProject.contribution_fr || "",
      en: dbProject.contribution_en || "",
    },
    technologies: dbProject.technologies || [],
    status: dbProject.status || "Draft",
    featured: dbProject.featured || false,
    displayOrder: dbProject.display_order || 0,
    image: dbProject.image || "",
    coverImageUrl: dbProject.cover_image_url || "",
    screenshots: dbProject.screenshots || [],
    images: dbProject.images || [],
    githubUrl: dbProject.github_url || "",
    liveUrl: dbProject.live_url || "",
    year: dbProject.year || new Date().getFullYear(),
    duration: dbProject.duration || "",
    client: dbProject.client || "",
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  }
}

/**
 * Transform app format to database format
 */
const transformToDB = (appProject) => {
  if (!appProject) return null
  
  return {
    title: appProject.title,
    title_en: appProject.titleEn,
    category: appProject.category,
    description_fr: appProject.description?.fr || "",
    description_en: appProject.description?.en || "",
    detail_fr: appProject.detail?.fr || "",
    detail_en: appProject.detail?.en || "",
    contribution_fr: appProject.contribution?.fr || "",
    contribution_en: appProject.contribution?.en || "",
    technologies: appProject.technologies || [],
    status: appProject.status || "Draft",
    featured: appProject.featured || false,
    display_order: appProject.displayOrder,
    image: appProject.image || "",
    cover_image_url: appProject.coverImageUrl || "",
    screenshots: appProject.screenshots || [],
    images: appProject.images || [],
    github_url: appProject.githubUrl || "",
    live_url: appProject.liveUrl || "",
    year: appProject.year,
    duration: appProject.duration || "",
    client: appProject.client || "",
  }
}

/**
 * Get all projects (admin view)
 * @returns {Promise<Array>} All projects (Published + Draft)
 */
export const getProjects = async () => {
  try {
    const projects = await initializeProjects()
    return projects.map(transformFromDB)
  } catch (error) {
    console.error("Error getting projects:", error)
    return getDefaultProjects()
  }
}

/**
 * Get only published projects (public view)
 * @returns {Promise<Array>} Published projects only
 */
export const getPublishedProjects = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'Published')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn("Supabase published fetch failed:", error)
      return []
    }

    return (data || []).map(transformFromDB)
  } catch (error) {
    console.error("Error getting published projects:", error)
    return []
  }
}

/**
 * Get project by ID
 * @param {Number} id - Project ID
 * @returns {Promise<Object|null>} Project object or null if not found
 */
export const getProjectById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.warn(`Project ${id} not found:`, error)
      return null
    }

    return transformFromDB(data)
  } catch (error) {
    console.error(`Error getting project ${id}:`, error)
    return null
  }
}

/**
 * Get projects filtered by category
 * @param {String} category - Category name
 * @returns {Promise<Array>} Projects matching the category
 */
export const getProjectsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('category', category)
      .order('display_order', { ascending: true })

    if (error) {
      console.warn(`Category filter failed for ${category}:`, error)
      return []
    }

    return (data || []).map(transformFromDB)
  } catch (error) {
    console.error(`Error getting projects by category ${category}:`, error)
    return []
  }
}

/**
 * Get published projects filtered by category
 * @param {String} category - Category name
 * @returns {Promise<Array>} Published projects matching the category
 */
export const getPublishedProjectsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('category', category)
      .eq('status', 'Published')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn(`Published category filter failed for ${category}:`, error)
      return []
    }

    return (data || []).map(transformFromDB)
  } catch (error) {
    console.error(`Error getting published projects by category ${category}:`, error)
    return []
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project data to create
 * @returns {Promise<Object>} Created project with assigned ID
 */
export const createProject = async (projectData) => {
  // Validate required fields
  const validation = validateProjectData(projectData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  const dbProject = transformToDB(projectData)

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([dbProject])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`)
    }

    // Clear cache to force refresh
    projectsCache = null
    cacheTimestamp = null

    return transformFromDB(data)
  } catch (error) {
    console.error("Error creating project:", error)
    throw error
  }
}

/**
 * Update an existing project
 * @param {Number} id - Project ID
 * @param {Object} updates - Fields to update (in app format)
 * @returns {Promise<Object>} Updated project
 */
export const updateProject = async (id, updates) => {
  try {
    // Get current project for validation context
    const current = await getProjectById(id)
    if (!current) {
      throw new Error(`Project with ID ${id} not found`)
    }

    // Validate if updating core fields
    if (
      updates.title ||
      updates.titleEn ||
      updates.category ||
      updates.technologies
    ) {
      const projectToValidate = { ...current, ...updates }
      const validation = validateProjectData(projectToValidate)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
      }
    }

    // Merge updates with current data and transform
    const mergedProject = {
      ...current,
      ...updates,
      description: {
        ...current.description,
        ...(updates.description || {}),
      },
      detail: {
        ...current.detail,
        ...(updates.detail || {}),
      },
      contribution: {
        ...current.contribution,
        ...(updates.contribution || {}),
      },
    }

    const dbUpdates = transformToDB(mergedProject)

    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`)
    }

    // Clear cache to force refresh
    projectsCache = null
    cacheTimestamp = null

    return transformFromDB(data)
  } catch (error) {
    console.error(`Error updating project ${id}:`, error)
    throw error
  }
}

/**
 * Delete a project
 * @param {Number} id - Project ID
 * @returns {Promise<Boolean>} True if deleted, false if not found
 */
export const deleteProject = async (id) => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn(`Failed to delete project ${id}:`, error)
      return false
    }

    // Clear cache to force refresh
    projectsCache = null
    cacheTimestamp = null

    return true
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error)
    return false
  }
}

/**
 * Toggle project status between Published and Draft
 * @param {Number} id - Project ID
 * @returns {Promise<Object>} Updated project
 */
export const toggleProjectStatus = async (id) => {
  const project = await getProjectById(id)
  if (!project) {
    throw new Error(`Project with ID ${id} not found`)
  }

  const newStatus = project.status === "Published" ? "Draft" : "Published"
  return updateProject(id, { status: newStatus })
}

/**
 * Get next available ID for new project
 * @returns {Promise<Number>} Next ID
 */
export const getNextProjectId = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    if (error) {
      console.warn("Failed to get next project ID:", error)
      return 1
    }

    return data && data.length > 0 ? data[0].id + 1 : 1
  } catch (error) {
    console.error("Error getting next project ID:", error)
    return 1
  }
}

/**
 * Get all available categories
 * @returns {Promise<Array>} Unique categories
 */
export const getCategories = async () => {
  try {
    const projects = await getProjects()
    const categories = [...new Set(projects.map((p) => p.category))]
    return categories.sort()
  } catch (error) {
    console.error("Error getting categories:", error)
    return []
  }
}

/**
 * Get default/template project for new project creation
 * @param {Number} nextId - Next ID to use
 * @returns {Object} Default project template
 */
export const getDefaultProject = async (nextId) => {
  return {
    id: nextId,
    title: "",
    titleEn: "",
    category: "Web Dev",
    description: { fr: "", en: "" },
    detail: { fr: "", en: "" },
    contribution: { fr: "", en: "" },
    technologies: [],
    status: "Draft",
    featured: false,
    displayOrder: nextId,
    image: "",
    coverImageUrl: "",
    screenshots: [],
    images: [],
    githubUrl: "",
    liveUrl: "",
    year: new Date().getFullYear(),
    duration: "",
    client: "",
  }
}

/**
 * Get default/initial projects
 * @returns {Array} Default projects
 */
export const getDefaultProjects = () => {
  return JSON.parse(JSON.stringify(initialProjects))
}

/**
 * Reset all projects to default state (seedData)
 * @returns {Promise<Array>} Reset projects
 */
export const resetProjects = async () => {
  // Note: This would require deleting all projects and re-inserting seed data
  // For now, just return defaults
  console.warn("resetProjects called - consider implementation")
  projectsCache = null
  cacheTimestamp = null
  return getDefaultProjects()
}

/**
 * Validate project data
 * @param {Object} project - Project to validate
 * @returns {Object} { valid: Boolean, errors: Array }
 */
export const validateProjectData = (project) => {
  const errors = []

  // Required fields
  if (!project.title || !project.title.trim()) {
    errors.push("Titre FR obligatoire")
  }

  if (!project.titleEn || !project.titleEn.trim()) {
    errors.push("Titre EN obligatoire")
  }

  if (!project.description?.fr || !project.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!project.description?.en || !project.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  if (!project.category || !project.category.trim()) {
    errors.push("Catégorie obligatoire")
  }

  if (!project.technologies || project.technologies.length === 0) {
    errors.push("Au moins une technologie requise")
  }

  // Validate year if provided
  if (project.year && (isNaN(project.year) || project.year < 2000 || project.year > 2099)) {
    errors.push("Année invalide (2000-2099)")
  }

  // Validate URLs if provided
  if (project.githubUrl && project.githubUrl.trim() && project.githubUrl !== "#") {
    if (!isValidUrl(project.githubUrl)) {
      errors.push("URL GitHub invalide")
    }
  }

  if (project.liveUrl && project.liveUrl.trim()) {
    if (!isValidUrl(project.liveUrl)) {
      errors.push("URL Live Demo invalide")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate URL format
 * @param {String} url - URL to validate
 * @returns {Boolean} True if valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Search projects by text
 * @param {String} searchTerm - Text to search for
 * @param {Array} projectsArray - Projects to search in (optional, uses all if not provided)
 * @returns {Promise<Array>} Matching projects
 */
export const searchProjects = async (searchTerm, projectsArray = null) => {
  const projects = projectsArray || await getProjects()
  const term = searchTerm.toLowerCase()

  return projects.filter(
    (p) =>
      p.title.toLowerCase().includes(term) ||
      p.titleEn.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.technologies.some((t) => t.toLowerCase().includes(term))
  )
}

/**
 * Get statistics about projects
 * @returns {Promise<Object>} Project statistics
 */
export const getProjectStats = async () => {
  const projects = await getProjects()
  return {
    total: projects.length,
    published: projects.filter((p) => p.status === "Published").length,
    draft: projects.filter((p) => p.status === "Draft").length,
    featured: projects.filter((p) => p.featured).length,
    categories: await getCategories(),
  }
}
