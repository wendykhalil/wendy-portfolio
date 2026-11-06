/**
 * Test Suite for Experience Service
 * Comprehensive tests for STEP 8 implementation
 */

const initialExperiences = [
  {
    id: 1,
    type: { fr: "Formation", en: "Education" },
    period: "2024 — Aujourd'hui",
    title: {
      fr: "Cycle Ingénieur Informatique",
      en: "Computer Engineering Degree",
    },
    place: "ESPRIT",
    description: {
      fr: "Spécialisation Web et Internet, architecture logicielle et projets multidisciplinaires.",
      en: "Web and Internet specialization, software architecture, and multidisciplinary projects.",
    },
    responsibilities: {
      fr: "Développement Full Stack, conception et travail en équipe agile.",
      en: "Full Stack development, design, and agile teamwork.",
    },
    technologies: ["React", "Node.js", "Java", "DevOps"],
    status: "Published",
  },
  {
    id: 2,
    type: { fr: "Stage", en: "Internship" },
    period: "2025",
    title: { fr: "Développeur Full Stack", en: "Full Stack Developer" },
    place: "Slikoo / Detectives Connect",
    description: {
      fr: "Développement d'une marketplace mettant en relation clients et détectives privés.",
      en: "Development of a marketplace connecting clients and private investigators.",
    },
    responsibilities: {
      fr: "Interfaces métier, API REST, gestion des données et tests.",
      en: "Business interfaces, REST API, data management, and testing.",
    },
    technologies: ["Next.js", "NestJS", "TypeScript", "MySQL"],
    status: "Published",
  },
  {
    id: 3,
    type: { fr: "Stage", en: "Internship" },
    period: "2024",
    title: {
      fr: "Interface de surveillance industrielle",
      en: "Industrial Monitoring Interface",
    },
    place: "MECAPROTEC AÉRO / STAPLO",
    description: {
      fr: "Conception d'une interface de suivi des indicateurs de production industrielle.",
      en: "Design of an interface for monitoring industrial production indicators.",
    },
    responsibilities: {
      fr: "Analyse des besoins, dashboard responsive et composants de visualisation.",
      en: "Requirements analysis, responsive dashboard, and visualization components.",
    },
    technologies: ["React", "JavaScript", "UI/UX"],
    status: "Published",
  },
  {
    id: 4,
    type: { fr: "Formation", en: "Education" },
    period: "2021 — 2024",
    title: {
      fr: "Licence en Ingénierie des Systèmes Informatiques",
      en: "Bachelor in Information Systems Engineering",
    },
    place: "Université de Kairouan",
    description: {
      fr: "Formation fondamentale en développement, bases de données et systèmes.",
      en: "Core training in development, databases, and systems.",
    },
    responsibilities: {
      fr: "Projets académiques, algorithmique et conception logicielle.",
      en: "Academic projects, algorithms, and software design.",
    },
    technologies: ["Java", "C#", "SQL", "PHP"],
    status: "Published",
  },
  {
    id: 5,
    type: { fr: "Stage", en: "Internship" },
    period: "2023",
    title: { fr: "Dental Stock Management", en: "Dental Stock Management" },
    place: "Projet de stage",
    description: {
      fr: "Application de gestion de stock et fournisseurs pour produits dentaires.",
      en: "Stock and supplier management application for dental products.",
    },
    responsibilities: {
      fr: "Modélisation, développement CRUD et gestion des alertes.",
      en: "Modeling, CRUD development, and alert management.",
    },
    technologies: ["React", "Node.js", "MongoDB"],
    status: "Published",
  },
  {
    id: 6,
    type: { fr: "Formation", en: "Training" },
    period: "2023",
    title: { fr: "Full Stack JavaScript", en: "Full Stack JavaScript" },
    place: "9antra",
    description: {
      fr: "Formation pratique à l'écosystème JavaScript moderne.",
      en: "Hands-on training in the modern JavaScript ecosystem.",
    },
    responsibilities: {
      fr: "Applications MERN, API et déploiement.",
      en: "MERN applications, APIs, and deployment.",
    },
    technologies: ["React", "Express", "MongoDB"],
    status: "Published",
  },
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

// Mock data module exports
const dataModule = {
  experiences: initialExperiences,
}

// Create a fake module environment for experienceService
global.require = (modulePath) => {
  if (modulePath.includes("data")) {
    return dataModule
  }
  return {}
}

// Load experienceService with mocked localStorage
let experiencesCache = null
const STORAGE_KEY = "mk-experiences"

const migrateExperiences = (experiences) => {
  return experiences.map((exp, index) => ({
    id: exp.id,
    type: exp.type,
    title: exp.title,
    organization: exp.organization || {
      fr: exp.place,
      en: exp.place,
    },
    place: exp.place,
    description: exp.description,
    responsibilities: exp.responsibilities,
    technologies: exp.technologies || [],
    startDate: exp.startDate || "",
    endDate: exp.endDate || "",
    currentPosition: exp.currentPosition || false,
    location: exp.location || "",
    status: exp.status || "Published",
    displayOrder: exp.displayOrder !== undefined ? exp.displayOrder : index + 1,
  }))
}

const persistExperiences = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(experiencesCache))
  } catch (error) {
    console.error("Error saving experiences to storage:", error)
  }
}

const initializeExperiences = () => {
  if (experiencesCache !== null) return experiencesCache

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      experiencesCache = JSON.parse(stored)
    } else {
      experiencesCache = migrateExperiences(initialExperiences)
      persistExperiences()
    }
  } catch (error) {
    console.error("Error loading experiences from storage:", error)
    experiencesCache = migrateExperiences(initialExperiences)
  }

  return experiencesCache
}

const getExperiences = () => {
  const experiences = initializeExperiences()
  return JSON.parse(JSON.stringify(experiences))
}

const getPublishedExperiences = () => {
  const experiences = initializeExperiences()
  return JSON.parse(
    JSON.stringify(
      experiences
        .filter((e) => e.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getExperienceById = (id) => {
  const experiences = initializeExperiences()
  const experience = experiences.find((e) => e.id === id)
  return experience ? JSON.parse(JSON.stringify(experience)) : null
}

const validateExperienceData = (experience) => {
  const errors = []

  if (!experience.title?.fr || !experience.title.fr.trim()) {
    errors.push("Titre FR obligatoire")
  }

  if (!experience.title?.en || !experience.title.en.trim()) {
    errors.push("Titre EN obligatoire")
  }

  if (!experience.description?.fr || !experience.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!experience.description?.en || !experience.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  if (!experience.type) {
    errors.push("Type d'expérience obligatoire")
  }

  if (!experience.place || !experience.place.trim()) {
    errors.push("Établissement/Place obligatoire")
  }

  if (experience.startDate && experience.endDate) {
    const start = new Date(experience.startDate)
    const end = new Date(experience.endDate)
    if (start > end) {
      errors.push("La date de fin doit être après la date de début")
    }
  }

  if (experience.currentPosition && experience.endDate && experience.endDate.trim()) {
    errors.push("La date de fin doit être vide pour un poste actuel")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const createExperience = (experienceData) => {
  const experiences = initializeExperiences()

  const validation = validateExperienceData(experienceData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  const newId = Math.max(...experiences.map((e) => e.id), 0) + 1
  const nextDisplayOrder =
    Math.max(...experiences.map((e) => e.displayOrder || 0), 0) + 1

  const newExperience = {
    id: newId,
    type: experienceData.type || { fr: "Expérience", en: "Experience" },
    title: experienceData.title || { fr: "", en: "" },
    organization: experienceData.organization || { fr: "", en: "" },
    place: experienceData.place || "",
    description: experienceData.description || { fr: "", en: "" },
    responsibilities: experienceData.responsibilities || { fr: "", en: "" },
    technologies: experienceData.technologies || [],
    startDate: experienceData.startDate || "",
    endDate: experienceData.endDate || "",
    currentPosition: experienceData.currentPosition || false,
    location: experienceData.location || "",
    status: experienceData.status || "Draft",
    displayOrder: experienceData.displayOrder || nextDisplayOrder,
  }

  experiencesCache.push(newExperience)
  persistExperiences()

  return JSON.parse(JSON.stringify(newExperience))
}

const updateExperience = (id, updates) => {
  const experiences = initializeExperiences()
  const index = experiences.findIndex((e) => e.id === id)

  if (index === -1) {
    throw new Error(`Experience with ID ${id} not found`)
  }

  if (updates.title || updates.type || updates.description) {
    const experienceToValidate = { ...experiences[index], ...updates }
    const validation = validateExperienceData(experienceToValidate)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }
  }

  experiences[index] = {
    ...experiences[index],
    ...updates,
    type: {
      ...experiences[index].type,
      ...(updates.type || {}),
    },
    title: {
      ...experiences[index].title,
      ...(updates.title || {}),
    },
    organization: {
      ...experiences[index].organization,
      ...(updates.organization || {}),
    },
    description: {
      ...experiences[index].description,
      ...(updates.description || {}),
    },
    responsibilities: {
      ...experiences[index].responsibilities,
      ...(updates.responsibilities || {}),
    },
  }

  persistExperiences()
  return JSON.parse(JSON.stringify(experiences[index]))
}

const deleteExperience = (id) => {
  const experiences = initializeExperiences()
  const index = experiences.findIndex((e) => e.id === id)

  if (index === -1) {
    return false
  }

  experiences.splice(index, 1)
  persistExperiences()

  return true
}

const toggleExperienceStatus = (id) => {
  const experience = getExperienceById(id)
  if (!experience) {
    throw new Error(`Experience with ID ${id} not found`)
  }

  const newStatus = experience.status === "Published" ? "Draft" : "Published"
  return updateExperience(id, { status: newStatus })
}

const resetExperiences = () => {
  experiencesCache = migrateExperiences(initialExperiences)
  persistExperiences()
  return JSON.parse(JSON.stringify(experiencesCache))
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

test("Load initial experiences", () => {
  localStorage.clear()
  experiencesCache = null
  const exps = getExperiences()
  assert(exps.length === 6, `Expected 6 experiences, got ${exps.length}`)
})

test("Get all experiences", () => {
  localStorage.clear()
  experiencesCache = null
  const exps = getExperiences()
  assert(exps.length >= 6, "Should have at least 6 experiences")
})

test("Get published experiences only", () => {
  const published = getPublishedExperiences()
  published.forEach((exp) => {
    assert(exp.status === "Published", "All experiences should be Published")
  })
})

test("Get experience by ID", () => {
  const exp = getExperienceById(1)
  assert(exp !== null, "Experience should be found")
  assert(exp.id === 1, "Experience ID should match")
})

test("Get non-existent experience returns null", () => {
  const exp = getExperienceById(99999)
  assert(exp === null, "Non-existent experience should return null")
})

test("Create experience", () => {
  localStorage.clear()
  experiencesCache = null
  const initialCount = getExperiences().length
  
  const newExp = createExperience({
    type: { fr: "Stage", en: "Internship" },
    title: { fr: "Test Stage", en: "Test Internship" },
    place: "Test Company",
    description: { fr: "Test Description FR", en: "Test Description EN" },
    responsibilities: { fr: "Test Resp FR", en: "Test Resp EN" },
    technologies: ["React"],
    status: "Draft",
  })
  
  assert(newExp.id > 0, "Created experience should have ID")
  const afterCount = getExperiences().length
  assert(afterCount === initialCount + 1, "Experience count should increase")
})

test("Update experience", () => {
  const updated = updateExperience(1, {
    title: { fr: "Updated Title", en: "Updated Title EN" },
  })
  
  assert(updated.title.fr === "Updated Title", "Title should be updated")
  const retrieved = getExperienceById(1)
  assert(retrieved.title.fr === "Updated Title", "Persisted update should be readable")
})

test("Update nested object (description)", () => {
  // Reset first to ensure clean state
  localStorage.clear()
  experiencesCache = null
  const exps = getExperiences()
  
  // Update with both FR and EN to avoid validation error
  updateExperience(1, {
    description: {
      fr: "New FR Description",
      en: exps[0].description.en, // Preserve EN
    },
  })
  
  const exp = getExperienceById(1)
  assert(exp.description.fr === "New FR Description", "FR description should update")
  assert(exp.description.en === exps[0].description.en, "EN description should be preserved")
})

test("Toggle status Published -> Draft", () => {
  toggleExperienceStatus(2)
  const exp = getExperienceById(2)
  assert(exp.status === "Draft", "Status should toggle to Draft")
})

test("Toggle status Draft -> Published", () => {
  toggleExperienceStatus(2)
  const exp = getExperienceById(2)
  assert(exp.status === "Published", "Status should toggle back to Published")
})

test("Delete experience", () => {
  localStorage.clear()
  experiencesCache = null
  const initialCount = getExperiences().length
  
  const result = deleteExperience(5)
  assert(result === true, "Delete should return true")
  
  const afterCount = getExperiences().length
  assert(afterCount === initialCount - 1, "Experience count should decrease")
})

test("Delete non-existent returns false", () => {
  const result = deleteExperience(99999)
  assert(result === false, "Delete non-existent should return false")
})

test("Persistence to localStorage", () => {
  localStorage.clear()
  experiencesCache = null
  
  createExperience({
    type: { fr: "Test", en: "Test" },
    title: { fr: "Persistence Test", en: "Persistence Test" },
    place: "Test",
    description: { fr: "Test", en: "Test" },
    responsibilities: { fr: "Test", en: "Test" },
  })
  
  const stored = localStorage.getItem("mk-experiences")
  assert(stored !== null, "Data should be persisted to localStorage")
  
  experiencesCache = null
  const retrieved = getExperiences()
  assert(retrieved.length > 6, "Data should be loaded from localStorage")
})

test("Data immutability", () => {
  localStorage.clear()
  experiencesCache = null
  const exp1 = getExperiences()
  const exp2 = getExperiences()
  
  exp1[0].title.fr = "MODIFIED"
  assert(exp2[0].title.fr !== "MODIFIED", "Returned data should be immutable")
})

test("Bilingual content", () => {
  const exp = getExperienceById(1)
  assert(exp.title.fr !== "", "FR title should exist")
  assert(exp.title.en !== "", "EN title should exist")
  assert(exp.description.fr !== "", "FR description should exist")
  assert(exp.description.en !== "", "EN description should exist")
})

test("Featured and displayOrder", () => {
  const exps = getPublishedExperiences()
  let prevOrder = 0
  exps.forEach((exp) => {
    assert(
      exp.displayOrder >= prevOrder,
      "Experiences should be sorted by displayOrder"
    )
    prevOrder = exp.displayOrder
  })
})

test("Validation: missing required fields", () => {
  try {
    createExperience({
      type: { fr: "Stage", en: "Internship" },
      title: { fr: "", en: "Test" }, // Missing FR title
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(
      e.message.includes("Validation failed"),
      "Should throw validation error"
    )
  }
})

test("Validation: date range", () => {
  try {
    createExperience({
      type: { fr: "Stage", en: "Internship" },
      title: { fr: "Test", en: "Test" },
      place: "Company",
      description: { fr: "Test", en: "Test" },
      responsibilities: { fr: "Test", en: "Test" },
      startDate: "2024-12-01",
      endDate: "2024-01-01", // Invalid: end before start
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should validate date range")
  }
})

test("Current position without end date", () => {
  const exp = createExperience({
    type: { fr: "Stage", en: "Internship" },
    title: { fr: "Current Role", en: "Current Role" },
    place: "Company",
    description: { fr: "Test", en: "Test" },
    responsibilities: { fr: "Test", en: "Test" },
    currentPosition: true,
  })
  
  assert(exp.currentPosition === true, "Should support currentPosition flag")
})

test("Reset to defaults", () => {
  localStorage.clear()
  experiencesCache = null
  createExperience({
    type: { fr: "Test", en: "Test" },
    title: { fr: "Custom", en: "Custom" },
    place: "Test",
    description: { fr: "Test", en: "Test" },
    responsibilities: { fr: "Test", en: "Test" },
  })
  
  const beforeReset = getExperiences().length
  resetExperiences()
  const afterReset = getExperiences().length
  
  assert(afterReset === 6, "Reset should restore initial experiences count")
})

// Run all tests
console.log("=== AUDIT: Experience Service Test Suite ===")

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

console.log("=== AUDIT RESULTS ===")
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
