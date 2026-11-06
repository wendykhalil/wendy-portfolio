/**
 * Service Service
 * 
 * Centralized data access layer for service management.
 * This is the single source of truth for all service data.
 * 
 * Storage strategy:
 * - Currently: localStorage (temporary solution)
 * - Future: REST API calls to backend
 * 
 * All functions work with a consistent data structure that allows
 * easy migration to backend API without changing UI components.
 */

// Storage key for localStorage
const STORAGE_KEY = "mk-services"

/**
 * In-memory cache of service data
 * Synced with localStorage for persistence
 */
let servicesCache = null

/**
 * Default services data
 * Migrated from the hardcoded array in App.jsx
 */
const initialServices = [
  {
    id: 1,
    title: {
      fr: "Web Development",
      en: "Web Development"
    },
    description: {
      fr: "Développement d'applications web modernes, fonctionnelles et évolutives.",
      en: "Modern, functional, and scalable web application development."
    },
    icon: "code",
    category: "Development",
    status: "Published",
    featured: true,
    displayOrder: 1
  },
  {
    id: 2,
    title: {
      fr: "Responsive Design",
      en: "Responsive Design"
    },
    description: {
      fr: "Conception d'interfaces adaptées à tous les écrans et appareils.",
      en: "Interfaces tailored to every screen and device."
    },
    icon: "monitor",
    category: "Design",
    status: "Published",
    featured: true,
    displayOrder: 2
  },
  {
    id: 3,
    title: {
      fr: "Backend Development",
      en: "Backend Development"
    },
    description: {
      fr: "Création d'APIs, gestion des données et logique métier.",
      en: "APIs, data management, and business logic."
    },
    icon: "layers",
    category: "Development",
    status: "Published",
    featured: true,
    displayOrder: 3
  },
  {
    id: 4,
    title: {
      fr: "Performance & Optimization",
      en: "Performance & Optimization"
    },
    description: {
      fr: "Amélioration de la qualité, rapidité et fiabilité.",
      en: "Improving quality, speed, and reliability."
    },
    icon: "spark",
    category: "Development",
    status: "Published",
    featured: true,
    displayOrder: 4
  }
]

/**
 * Initialize services from localStorage or defaults
 * Called on first access to ensure data is loaded
 */
export const initializeServices = () => {
  if (servicesCache !== null) return servicesCache

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      servicesCache = JSON.parse(stored)
    } else {
      // First load: use initial services
      servicesCache = JSON.parse(JSON.stringify(initialServices))
      persistServices()
    }
  } catch (error) {
    console.error("Error loading services from storage:", error)
    servicesCache = JSON.parse(JSON.stringify(initialServices))
  }

  return servicesCache
}

/**
 * Persist services to localStorage
 */
const persistServices = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servicesCache))
  } catch (error) {
    console.error("Error saving services to storage:", error)
  }
}

/**
 * Get all services (admin view)
 * @returns {Array} All services (Published + Draft)
 */
export const getServices = () => {
  const services = initializeServices()
  return JSON.parse(JSON.stringify(services))
}

/**
 * Get only published services (public view)
 * @returns {Array} Published services only, sorted by displayOrder
 */
export const getPublishedServices = () => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

/**
 * Get service by ID
 * @param {Number} id - Service ID
 * @returns {Object|null} Service object or null if not found
 */
export const getServiceById = (id) => {
  const services = initializeServices()
  const service = services.find((s) => s.id === id)
  return service ? JSON.parse(JSON.stringify(service)) : null
}

/**
 * Get services filtered by category
 * @param {String} category - Category name
 * @returns {Array} Services matching the category
 */
export const getServicesByCategory = (category) => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

/**
 * Get featured services
 * @returns {Array} Featured services only, sorted by displayOrder
 */
export const getFeaturedServices = () => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.featured && s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

/**
 * Create a new service
 * @param {Object} serviceData - Service data to create
 * @returns {Object} Created service with assigned ID
 */
export const createService = (serviceData) => {
  const services = initializeServices()

  // Validate required fields
  const validation = validateServiceData(serviceData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  // Generate new ID
  const newId = Math.max(...services.map((s) => s.id), 0) + 1

  // Get next displayOrder
  const nextDisplayOrder =
    Math.max(...services.map((s) => s.displayOrder || 0), 0) + 1

  // Create new service with all fields
  const newService = {
    id: newId,
    title: serviceData.title || { fr: "", en: "" },
    description: serviceData.description || { fr: "", en: "" },
    icon: serviceData.icon || "",
    category: serviceData.category || "Development",
    status: serviceData.status || "Draft",
    featured: serviceData.featured || false,
    displayOrder: serviceData.displayOrder || nextDisplayOrder,
  }

  servicesCache.push(newService)
  persistServices()

  return JSON.parse(JSON.stringify(newService))
}

/**
 * Update an existing service
 * @param {Number} id - Service ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated service
 */
export const updateService = (id, updates) => {
  const services = initializeServices()
  const index = services.findIndex((s) => s.id === id)

  if (index === -1) {
    throw new Error(`Service with ID ${id} not found`)
  }

  // Validate if updating core fields
  if (updates.title || updates.description) {
    const serviceToValidate = { ...services[index], ...updates }
    const validation = validateServiceData(serviceToValidate)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }
  }

  // Merge updates with existing service
  services[index] = {
    ...services[index],
    ...updates,
    // Ensure nested objects are merged properly
    title: {
      ...services[index].title,
      ...(updates.title || {}),
    },
    description: {
      ...services[index].description,
      ...(updates.description || {}),
    },
  }

  persistServices()
  return JSON.parse(JSON.stringify(services[index]))
}

/**
 * Delete a service
 * @param {Number} id - Service ID
 * @returns {Boolean} True if deleted, false if not found
 */
export const deleteService = (id) => {
  const services = initializeServices()
  const index = services.findIndex((s) => s.id === id)

  if (index === -1) {
    return false
  }

  services.splice(index, 1)
  persistServices()

  return true
}

/**
 * Toggle service status between Published and Draft
 * @param {Number} id - Service ID
 * @returns {Object} Updated service
 */
export const toggleServiceStatus = (id) => {
  const service = getServiceById(id)
  if (!service) {
    throw new Error(`Service with ID ${id} not found`)
  }

  const newStatus = service.status === "Published" ? "Draft" : "Published"
  return updateService(id, { status: newStatus })
}

/**
 * Toggle featured status of a service
 * @param {Number} id - Service ID
 * @returns {Object} Updated service
 */
export const toggleServiceFeatured = (id) => {
  const service = getServiceById(id)
  if (!service) {
    throw new Error(`Service with ID ${id} not found`)
  }

  return updateService(id, { featured: !service.featured })
}

/**
 * Update display order of services
 * @param {Array} orderedIds - Array of service IDs in desired order
 * @returns {Array} Updated services
 */
export const updateServicesOrder = (orderedIds) => {
  const services = initializeServices()

  orderedIds.forEach((id, index) => {
    const service = services.find((s) => s.id === id)
    if (service) {
      service.displayOrder = index + 1
    }
  })

  persistServices()
  return JSON.parse(JSON.stringify(services))
}

/**
 * Get next available ID for new service
 * @returns {Number} Next ID
 */
export const getNextServiceId = () => {
  const services = initializeServices()
  return Math.max(...services.map((s) => s.id), 0) + 1
}

/**
 * Get all available categories
 * @returns {Array} Sorted unique categories
 */
export const getCategories = () => {
  const services = initializeServices()
  const categories = [...new Set(services.map((s) => s.category))]
  return categories.sort()
}

/**
 * Get default/template service for new service creation
 * @param {Number} nextId - Next ID to use
 * @returns {Object} Default service template
 */
export const getDefaultService = (nextId) => {
  return {
    id: nextId,
    title: { fr: "", en: "" },
    description: { fr: "", en: "" },
    icon: "",
    category: "Development",
    status: "Draft",
    featured: false,
    displayOrder: nextId,
  }
}

/**
 * Get default/initial services
 * @returns {Array} Default services
 */
export const getDefaultServices = () => {
  return JSON.parse(JSON.stringify(initialServices))
}

/**
 * Reset all services to default state
 * @returns {Array} Reset services
 */
export const resetServices = () => {
  servicesCache = JSON.parse(JSON.stringify(initialServices))
  persistServices()
  return JSON.parse(JSON.stringify(servicesCache))
}

/**
 * Validate service data
 * @param {Object} service - Service to validate
 * @returns {Object} { valid: Boolean, errors: Array }
 */
export const validateServiceData = (service) => {
  const errors = []

  // Required fields: Title FR/EN
  if (!service.title?.fr || !service.title.fr.trim()) {
    errors.push("Titre FR obligatoire")
  }

  if (!service.title?.en || !service.title.en.trim()) {
    errors.push("Titre EN obligatoire")
  }

  // Required fields: Description FR/EN
  if (!service.description?.fr || !service.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!service.description?.en || !service.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  // Required fields: Icon
  if (!service.icon || !service.icon.trim()) {
    errors.push("Icône obligatoire")
  }

  // Category validation (optional but if provided, must be non-empty)
  if (service.category && !service.category.trim()) {
    errors.push("Catégorie invalide")
  }

  // Status validation
  if (service.status && !["Published", "Draft"].includes(service.status)) {
    errors.push("Statut invalide (Published ou Draft)")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Search services by text
 * @param {String} searchTerm - Text to search for
 * @param {Array} servicesArray - Services to search in (optional)
 * @returns {Array} Matching services
 */
export const searchServices = (searchTerm, servicesArray = null) => {
  const services = servicesArray || initializeServices()
  const term = searchTerm.toLowerCase()

  return JSON.parse(
    JSON.stringify(
      services.filter(
        (s) =>
          s.title.fr.toLowerCase().includes(term) ||
          s.title.en.toLowerCase().includes(term) ||
          s.description.fr.toLowerCase().includes(term) ||
          s.description.en.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term) ||
          s.icon.toLowerCase().includes(term)
      )
    )
  )
}

/**
 * Get statistics about services
 * @returns {Object} Service statistics
 */
export const getServiceStatistics = () => {
  const services = initializeServices()
  const categories = getCategories()

  return {
    total: services.length,
    published: services.filter((s) => s.status === "Published").length,
    draft: services.filter((s) => s.status === "Draft").length,
    featured: services.filter((s) => s.featured).length,
    categories: categories.length,
    byCategory: categories.reduce((acc, cat) => {
      acc[cat] = services.filter((s) => s.category === cat).length
      return acc
    }, {}),
  }
}
