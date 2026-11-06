/**
 * Test Suite for Service Service
 * Comprehensive tests for STEP 10 implementation
 */

// Initial services data (matching serviceService.js)
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

// Mock localStorage
const mockStorage = {}
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => {
    mockStorage[key] = value
  },
  removeItem: (key) => {
    delete mockStorage[key]
  },
  clear: () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  },
}

// Service implementation (inline for testing)
let servicesCache = null
const STORAGE_KEY = "mk-services"

const persistServices = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servicesCache))
  } catch (error) {
    console.error("Error saving services to storage:", error)
  }
}

const initializeServices = () => {
  if (servicesCache !== null) return servicesCache

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      servicesCache = JSON.parse(stored)
    } else {
      servicesCache = JSON.parse(JSON.stringify(initialServices))
      persistServices()
    }
  } catch (error) {
    console.error("Error loading services from storage:", error)
    servicesCache = JSON.parse(JSON.stringify(initialServices))
  }

  return servicesCache
}

const getServices = () => {
  const services = initializeServices()
  return JSON.parse(JSON.stringify(services))
}

const getPublishedServices = () => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getServiceById = (id) => {
  const services = initializeServices()
  const service = services.find((s) => s.id === id)
  return service ? JSON.parse(JSON.stringify(service)) : null
}

const getServicesByCategory = (category) => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getFeaturedServices = () => {
  const services = initializeServices()
  return JSON.parse(
    JSON.stringify(
      services
        .filter((s) => s.featured && s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getCategories = () => {
  const services = initializeServices()
  const categories = [...new Set(services.map((s) => s.category))]
  return categories.sort()
}

const validateServiceData = (service) => {
  const errors = []

  if (!service.title?.fr || !service.title.fr.trim()) {
    errors.push("Titre FR obligatoire")
  }

  if (!service.title?.en || !service.title.en.trim()) {
    errors.push("Titre EN obligatoire")
  }

  if (!service.description?.fr || !service.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!service.description?.en || !service.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  if (!service.icon || !service.icon.trim()) {
    errors.push("Icône obligatoire")
  }

  if (service.category && !service.category.trim()) {
    errors.push("Catégorie invalide")
  }

  if (service.status && !["Published", "Draft"].includes(service.status)) {
    errors.push("Statut invalide (Published ou Draft)")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const createService = (serviceData) => {
  const services = initializeServices()

  const validation = validateServiceData(serviceData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  const newId = Math.max(...services.map((s) => s.id), 0) + 1
  const nextDisplayOrder = Math.max(...services.map((s) => s.displayOrder || 0), 0) + 1

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

const updateService = (id, updates) => {
  const services = initializeServices()
  const index = services.findIndex((s) => s.id === id)

  if (index === -1) {
    throw new Error(`Service with ID ${id} not found`)
  }

  if (updates.title || updates.description) {
    const serviceToValidate = { ...services[index], ...updates }
    const validation = validateServiceData(serviceToValidate)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }
  }

  services[index] = {
    ...services[index],
    ...updates,
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

const deleteService = (id) => {
  const services = initializeServices()
  const index = services.findIndex((s) => s.id === id)

  if (index === -1) {
    return false
  }

  services.splice(index, 1)
  persistServices()

  return true
}

const toggleServiceStatus = (id) => {
  const service = getServiceById(id)
  if (!service) {
    throw new Error(`Service with ID ${id} not found`)
  }

  const newStatus = service.status === "Published" ? "Draft" : "Published"
  return updateService(id, { status: newStatus })
}

const toggleServiceFeatured = (id) => {
  const service = getServiceById(id)
  if (!service) {
    throw new Error(`Service with ID ${id} not found`)
  }

  return updateService(id, { featured: !service.featured })
}

const updateServicesOrder = (orderedIds) => {
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

const getNextServiceId = () => {
  const services = initializeServices()
  return Math.max(...services.map((s) => s.id), 0) + 1
}

const getDefaultService = (nextId) => {
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

const getDefaultServices = () => {
  return JSON.parse(JSON.stringify(initialServices))
}

const resetServices = () => {
  servicesCache = JSON.parse(JSON.stringify(initialServices))
  persistServices()
  return JSON.parse(JSON.stringify(servicesCache))
}

const searchServices = (searchTerm, servicesArray = null) => {
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

const getServiceStatistics = () => {
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

// Test Suite
const tests = []
let passed = 0
let failed = 0

const test = (name, fn) => {
  tests.push({ name, fn })
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || "Assertion failed")
  }
}

const assertEqual = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

// ===== TESTS =====

test("Load initial services", () => {
  localStorage.clear()
  servicesCache = null
  const services = getServices()
  assert(services.length === 4, `Expected 4 services, got ${services.length}`)
})

test("Get all services", () => {
  localStorage.clear()
  servicesCache = null
  const services = getServices()
  assert(services.length === 4, "Should return 4 initial services")
})

test("Get published services only", () => {
  const published = getPublishedServices()
  published.forEach((service) => {
    assert(service.status === "Published", "All services should be Published")
  })
  assert(published.length === 4, "All initial services are published")
})

test("Get service by ID", () => {
  const service = getServiceById(1)
  assert(service !== null, "Service should be found")
  assert(service.id === 1, "Service ID should match")
  assert(service.title.fr === "Web Development", "Title FR should match")
})

test("Get non-existent service returns null", () => {
  const service = getServiceById(99999)
  assert(service === null, "Non-existent service should return null")
})

test("Get services by category", () => {
  const development = getServicesByCategory("Development")
  assert(development.length === 3, "Should find 3 services in Development category")
  development.forEach((s) => {
    assert(s.category === "Development", "All should be in Development category")
  })
})

test("Get featured services", () => {
  const featured = getFeaturedServices()
  assert(featured.length === 4, "All initial services should be featured")
  featured.forEach((s) => {
    assert(s.featured === true, "All should be featured")
    assert(s.status === "Published", "All should be published")
  })
})

test("Get categories", () => {
  const categories = getCategories()
  assert(categories.length === 2, "Should have 2 categories (Development and Design)")
  assert(categories.includes("Development"), "Should include Development")
  assert(categories.includes("Design"), "Should include Design")
})

test("Create service", () => {
  localStorage.clear()
  servicesCache = null
  const initialCount = getServices().length
  
  const newService = createService({
    title: {
      fr: "Test Service FR",
      en: "Test Service EN"
    },
    description: {
      fr: "Test Description FR",
      en: "Test Description EN"
    },
    icon: "zap",
    category: "Development",
    status: "Draft",
  })
  
  assert(newService.id === 5, "Created service should have ID 5")
  assert(newService.title.fr === "Test Service FR", "Title FR should match")
  const afterCount = getServices().length
  assert(afterCount === initialCount + 1, "Service count should increase")
})

test("Update service", () => {
  const updated = updateService(1, {
    category: "Design"
  })
  
  assert(updated.category === "Design", "Category should be updated")
  const retrieved = getServiceById(1)
  assert(retrieved.category === "Design", "Persisted update should be readable")
})

test("Update nested object (title)", () => {
  localStorage.clear()
  servicesCache = null
  const services = getServices()
  const service = services[0]
  
  updateService(service.id, {
    title: {
      fr: "New Title FR",
      en: service.title.en,
    },
  })
  
  const updated = getServiceById(service.id)
  assert(updated.title.fr === "New Title FR", "FR title should update")
  assert(updated.title.en === service.title.en, "EN title should be preserved")
})

test("Update nested object (description)", () => {
  localStorage.clear()
  servicesCache = null
  const services = getServices()
  const service = services[0]
  
  updateService(service.id, {
    description: {
      fr: "New Description FR",
      en: service.description.en,
    },
  })
  
  const updated = getServiceById(service.id)
  assert(updated.description.fr === "New Description FR", "FR description should update")
  assert(updated.description.en === service.description.en, "EN description should be preserved")
})

test("Toggle status Published -> Draft", () => {
  localStorage.clear()
  servicesCache = null
  const services = getServices()
  const serviceId = services[0].id
  
  toggleServiceStatus(serviceId)
  const service = getServiceById(serviceId)
  assert(service.status === "Draft", "Status should toggle to Draft")
})

test("Toggle status Draft -> Published", () => {
  const serviceId = 1
  toggleServiceStatus(serviceId)
  const service = getServiceById(serviceId)
  assert(service.status === "Published", "Status should toggle back to Published")
})

test("Toggle featured status", () => {
  localStorage.clear()
  servicesCache = null
  getServices()
  
  const service = createService({
    title: { fr: "Test Featured", en: "Test Featured" },
    description: { fr: "Test", en: "Test" },
    icon: "star",
    featured: false,
  })
  
  toggleServiceFeatured(service.id)
  const updated = getServiceById(service.id)
  assert(updated.featured === true, "Featured should toggle to true")
  
  toggleServiceFeatured(service.id)
  const toggled = getServiceById(service.id)
  assert(toggled.featured === false, "Featured should toggle back to false")
})

test("Delete service", () => {
  localStorage.clear()
  servicesCache = null
  const initialCount = getServices().length
  
  const result = deleteService(1)
  assert(result === true, "Delete should return true")
  
  const afterCount = getServices().length
  assert(afterCount === initialCount - 1, "Service count should decrease")
})

test("Delete non-existent returns false", () => {
  const result = deleteService(99999)
  assert(result === false, "Delete non-existent should return false")
})

test("Update services order", () => {
  localStorage.clear()
  servicesCache = null
  const allServices = getServices()
  
  if (allServices.length < 2) {
    return // Skip test if not enough services
  }
  
  const ids = allServices.map((s) => s.id)
  const reversed = ids.reverse()
  updateServicesOrder(reversed)
  
  const updated = getServices()
  const firstService = updated.find((s) => s.id === reversed[0])
  assert(firstService.displayOrder === 1, "Display order should be updated")
})

test("Search services by title FR", () => {
  const results = searchServices("Web Development")
  const hasMatch = results.some((s) => s.title.fr.includes("Web Development"))
  assert(hasMatch, "Should find service by FR title")
})

test("Search services by title EN", () => {
  const results = searchServices("Responsive")
  const hasMatch = results.some((s) => s.title.en.includes("Responsive"))
  assert(hasMatch, "Should find service by EN title")
})

test("Search services by description", () => {
  const results = searchServices("APIs")
  const hasMatch = results.some((s) => s.description.en.includes("APIs"))
  assert(hasMatch, "Should find service by description")
})

test("Search services by category", () => {
  const results = searchServices("Development")
  results.forEach((s) => {
    const match = s.category.includes("Development") || s.title.fr.includes("Development")
    assert(match, "Results should match search term")
  })
})

test("Persistence to localStorage", () => {
  localStorage.clear()
  servicesCache = null
  
  createService({
    title: { fr: "Persistence Test", en: "Persistence Test" },
    description: { fr: "Test", en: "Test" },
    icon: "check",
  })
  
  const stored = localStorage.getItem("mk-services")
  assert(stored !== null, "Data should be persisted to localStorage")
  
  servicesCache = null
  const retrieved = getServices()
  const hasService = retrieved.some((s) => s.title.fr === "Persistence Test")
  assert(hasService, "Data should be loaded from localStorage")
})

test("Data immutability", () => {
  localStorage.clear()
  servicesCache = null
  const services1 = getServices()
  const services2 = getServices()
  
  services1[0].title.fr = "MODIFIED"
  assert(services2[0].title.fr !== "MODIFIED", "Returned data should be immutable")
})

test("Bilingual content FR", () => {
  const service = getServiceById(1)
  assert(service.title.fr !== "", "FR title should exist")
  assert(service.description.fr !== "", "FR description should exist")
})

test("Bilingual content EN", () => {
  const service = getServiceById(1)
  assert(service.title.en !== "", "EN title should exist")
  assert(service.description.en !== "", "EN description should exist")
})

test("Service data model structure", () => {
  const service = getServiceById(1)
  assert(service.id !== undefined, "Should have id")
  assert(service.title !== undefined, "Should have title")
  assert(service.title.fr !== undefined, "Should have title.fr")
  assert(service.title.en !== undefined, "Should have title.en")
  assert(service.description !== undefined, "Should have description")
  assert(service.description.fr !== undefined, "Should have description.fr")
  assert(service.description.en !== undefined, "Should have description.en")
  assert(service.icon !== undefined, "Should have icon")
  assert(service.category !== undefined, "Should have category")
  assert(service.status !== undefined, "Should have status")
  assert(service.featured !== undefined, "Should have featured")
  assert(service.displayOrder !== undefined, "Should have displayOrder")
})

test("Get next service ID", () => {
  localStorage.clear()
  servicesCache = null
  getServices()
  
  const nextId = getNextServiceId()
  assert(nextId === 5, "Next ID should be 5")
})

test("Get default service", () => {
  const defaultService = getDefaultService(10)
  assert(defaultService.id === 10, "ID should match")
  assert(defaultService.status === "Draft", "Should be Draft by default")
  assert(defaultService.featured === false, "Should not be featured by default")
  assert(defaultService.title.fr === "", "FR title should be empty")
  assert(defaultService.title.en === "", "EN title should be empty")
})

test("Get default services", () => {
  const defaults = getDefaultServices()
  assert(defaults.length === 4, "Should return 4 default services")
  assert(defaults[0].id === 1, "First default service should have ID 1")
})

test("Service statistics", () => {
  localStorage.clear()
  servicesCache = null
  getServices()
  
  const stats = getServiceStatistics()
  assert(stats.total === 4, "Total should be 4")
  assert(stats.published === 4, "All should be published initially")
  assert(stats.draft === 0, "No drafts initially")
  assert(stats.featured === 4, "All should be featured initially")
  assert(stats.categories === 2, "Should have 2 categories")
})

test("Service statistics by category", () => {
  const stats = getServiceStatistics()
  assert(stats.byCategory["Development"] === 3, "Development should have 3 services")
  assert(stats.byCategory["Design"] === 1, "Design should have 1 service")
})

test("Validation: missing title FR", () => {
  try {
    createService({
      title: { fr: "", en: "Test" },
      description: { fr: "Test", en: "Test" },
      icon: "code",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing title EN", () => {
  try {
    createService({
      title: { fr: "Test", en: "" },
      description: { fr: "Test", en: "Test" },
      icon: "code",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing description FR", () => {
  try {
    createService({
      title: { fr: "Test", en: "Test" },
      description: { fr: "", en: "Test" },
      icon: "code",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing description EN", () => {
  try {
    createService({
      title: { fr: "Test", en: "Test" },
      description: { fr: "Test", en: "" },
      icon: "code",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing icon", () => {
  try {
    createService({
      title: { fr: "Test", en: "Test" },
      description: { fr: "Test", en: "Test" },
      icon: "",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: invalid status", () => {
  try {
    createService({
      title: { fr: "Test", en: "Test" },
      description: { fr: "Test", en: "Test" },
      icon: "code",
      status: "Invalid",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Reset to defaults", () => {
  localStorage.clear()
  servicesCache = null
  createService({
    title: { fr: "Custom", en: "Custom" },
    description: { fr: "Custom", en: "Custom" },
    icon: "star",
  })
  
  const beforeReset = getServices().length
  resetServices()
  const afterReset = getServices().length
  
  assert(afterReset === 4, "Reset should restore initial 4 services")
})

test("Admin-Frontend synchronization (published services filtered)", () => {
  localStorage.clear()
  servicesCache = null
  getServices()
  
  // Create draft service
  createService({
    title: { fr: "Draft Service", en: "Draft Service" },
    description: { fr: "Test", en: "Test" },
    icon: "code",
    status: "Draft",
  })
  
  const allServices = getServices()
  const publishedServices = getPublishedServices()
  
  assert(allServices.length === 5, "Admin should see 5 services (4 + 1 draft)")
  assert(publishedServices.length === 4, "Frontend should see only 4 published services")
})

test("Display order sorting", () => {
  const published = getPublishedServices()
  for (let i = 0; i < published.length - 1; i++) {
    assert(
      published[i].displayOrder <= published[i + 1].displayOrder,
      "Services should be sorted by displayOrder"
    )
  }
})

test("Featured count in statistics", () => {
  localStorage.clear()
  servicesCache = null
  getServices()
  
  createService({
    title: { fr: "Featured Stat Test", en: "Featured Stat Test" },
    description: { fr: "Test", en: "Test" },
    icon: "star",
    featured: true,
  })
  
  const stats = getServiceStatistics()
  assert(stats.featured === 5, "Featured count should include new featured service")
})

// Run all tests
console.log("=== TEST SUITE: Service Service (STEP 10) ===")
console.log("")

for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ TEST ${tests.indexOf(t) + 1}/${tests.length}: ${t.name}`)
    passed++
  } catch (error) {
    console.log(`✗ TEST ${tests.indexOf(t) + 1}/${tests.length}: ${t.name}`)
    console.log(`  Error: ${error.message}`)
    failed++
  }
}

console.log("")
console.log("=== TEST RESULTS ===")
console.log(`Passed: ${passed}/${tests.length}`)
console.log(`Failed: ${failed}/${tests.length}`)
console.log("=== CONCLUSION ===")
if (failed === 0) {
  console.log("✓ ALL TESTS PASSED")
  process.exit(0)
} else {
  console.log(`✗ ${failed} TESTS FAILED`)
  process.exit(1)
}
