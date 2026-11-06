/**
 * Test Suite for Skill Service
 * Comprehensive tests for STEP 9 implementation
 */

const groups = {
  Langages: [
    "HTML5",
    "CSS3",
    "JavaScript",
    "TypeScript",
    "Python",
    "PHP",
    "Java",
    "C#",
    "Dart",
  ],
  Frontend: [
    "React",
    "Next.js",
    "Tailwind CSS",
    "Bootstrap",
    "Flutter",
    "FlutterFlow",
  ],
  Backend: ["Node.js", "Express.js", "NestJS", "Symfony", ".NET", "Java/JEE"],
  "Bases de données": [
    "MongoDB",
    "MySQL",
    "PostgreSQL",
    "Oracle",
    "SQL Server",
  ],
  "DevOps & Outils": [
    "Git",
    "GitHub",
    "GitHub Actions",
    "Docker",
    "Jenkins",
    "Swagger",
    "Jira",
  ],
  "UI/UX Design": [
    "Figma",
    "Figma Make",
    "UX Design",
    "Wireframing",
    "Prototyping",
  ],
  CMS: ["WordPress", "Elementor"],
  Systèmes: ["Windows", "Linux"],
}

const initialSkills = Object.entries(groups).flatMap(
  ([category, items]) =>
    items.map((name, index) => ({
      id: Number(
        `${Object.keys(groups).indexOf(category) + 1}${String(index + 1).padStart(2, "0")}`,
      ),
      name,
      category,
      status: "Published",
    })),
)

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
let skillsCache = null
const STORAGE_KEY = "mk-skills"

const migrateSkills = (skills) => {
  return skills.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    description: skill.description || {
      fr: `Compétence en ${skill.name}`,
      en: `Skills in ${skill.name}`,
    },
    level: skill.level || "Intermediate",
    icon: skill.icon || null,
    featured: skill.featured || false,
    status: skill.status || "Published",
    displayOrder: skill.displayOrder !== undefined ? skill.displayOrder : index + 1,
  }))
}

const persistSkills = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skillsCache))
  } catch (error) {
    console.error("Error saving skills to storage:", error)
  }
}

const initializeSkills = () => {
  if (skillsCache !== null) return skillsCache

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      skillsCache = JSON.parse(stored)
    } else {
      skillsCache = migrateSkills(initialSkills)
      persistSkills()
    }
  } catch (error) {
    console.error("Error loading skills from storage:", error)
    skillsCache = migrateSkills(initialSkills)
  }

  return skillsCache
}

const getSkills = () => {
  const skills = initializeSkills()
  return JSON.parse(JSON.stringify(skills))
}

const getPublishedSkills = () => {
  const skills = initializeSkills()
  return JSON.parse(
    JSON.stringify(
      skills
        .filter((s) => s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getSkillById = (id) => {
  const skills = initializeSkills()
  const skill = skills.find((s) => s.id === id)
  return skill ? JSON.parse(JSON.stringify(skill)) : null
}

const getSkillsByCategory = (category) => {
  const skills = initializeSkills()
  return JSON.parse(
    JSON.stringify(
      skills
        .filter((s) => s.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getPublishedSkillsByCategory = (category) => {
  const skills = initializeSkills()
  return JSON.parse(
    JSON.stringify(
      skills
        .filter((s) => s.status === "Published" && s.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getFeaturedSkills = () => {
  const skills = initializeSkills()
  return JSON.parse(
    JSON.stringify(
      skills
        .filter((s) => s.featured && s.status === "Published")
        .sort((a, b) => a.displayOrder - b.displayOrder)
    )
  )
}

const getProficiencyLevels = () => {
  return ["Beginner", "Intermediate", "Advanced", "Expert"]
}

const getCategoryNames = () => {
  const skills = initializeSkills()
  const categories = {}
  skills.forEach((skill) => {
    if (!categories[skill.category]) {
      categories[skill.category] = true
    }
  })
  return Object.keys(categories).sort()
}

const validateSkillData = (skill) => {
  const errors = []

  if (!skill.name || !skill.name.trim()) {
    errors.push("Nom de compétence obligatoire")
  }

  if (!skill.category || !skill.category.trim()) {
    errors.push("Catégorie obligatoire")
  }

  if (!skill.description?.fr || !skill.description.fr.trim()) {
    errors.push("Description FR obligatoire")
  }

  if (!skill.description?.en || !skill.description.en.trim()) {
    errors.push("Description EN obligatoire")
  }

  const validLevels = getProficiencyLevels()
  if (skill.level && !validLevels.includes(skill.level)) {
    errors.push(`Niveau invalide. Doit être: ${validLevels.join(", ")}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const createSkill = (skillData) => {
  const skills = initializeSkills()

  const validation = validateSkillData(skillData)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
  }

  const categoryCode = Object.keys(groups).indexOf(skillData.category) + 1
  const categorySkills = skills.filter((s) => s.category === skillData.category)
  const skillCount = categorySkills.length + 1
  const newId = Number(`${categoryCode}${String(skillCount).padStart(2, "0")}`)

  const nextDisplayOrder =
    Math.max(...skills.map((s) => s.displayOrder || 0), 0) + 1

  const newSkill = {
    id: newId,
    name: skillData.name || "",
    category: skillData.category || "",
    description: skillData.description || {
      fr: `Compétence en ${skillData.name}`,
      en: `Skills in ${skillData.name}`,
    },
    level: skillData.level || "Intermediate",
    icon: skillData.icon || null,
    featured: skillData.featured || false,
    status: skillData.status || "Draft",
    displayOrder: skillData.displayOrder || nextDisplayOrder,
  }

  skillsCache.push(newSkill)
  persistSkills()

  return JSON.parse(JSON.stringify(newSkill))
}

const updateSkill = (id, updates) => {
  const skills = initializeSkills()
  const index = skills.findIndex((s) => s.id === id)

  if (index === -1) {
    throw new Error(`Skill with ID ${id} not found`)
  }

  if (updates.name || updates.category || updates.level) {
    const skillToValidate = { ...skills[index], ...updates }
    const validation = validateSkillData(skillToValidate)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
    }
  }

  skills[index] = {
    ...skills[index],
    ...updates,
    description: {
      ...skills[index].description,
      ...(updates.description || {}),
    },
  }

  persistSkills()
  return JSON.parse(JSON.stringify(skills[index]))
}

const deleteSkill = (id) => {
  const skills = initializeSkills()
  const index = skills.findIndex((s) => s.id === id)

  if (index === -1) {
    return false
  }

  skills.splice(index, 1)
  persistSkills()

  return true
}

const toggleSkillStatus = (id) => {
  const skill = getSkillById(id)
  if (!skill) {
    throw new Error(`Skill with ID ${id} not found`)
  }

  const newStatus = skill.status === "Published" ? "Draft" : "Published"
  return updateSkill(id, { status: newStatus })
}

const toggleSkillFeatured = (id) => {
  const skill = getSkillById(id)
  if (!skill) {
    throw new Error(`Skill with ID ${id} not found`)
  }

  return updateSkill(id, { featured: !skill.featured })
}

const updateSkillsOrder = (orderedIds) => {
  const skills = initializeSkills()

  orderedIds.forEach((id, index) => {
    const skill = skills.find((s) => s.id === id)
    if (skill) {
      skill.displayOrder = index + 1
    }
  })

  persistSkills()
  return JSON.parse(JSON.stringify(skills))
}

const searchSkills = (searchTerm, skillsArray = null) => {
  const skills = skillsArray || initializeSkills()
  const term = searchTerm.toLowerCase()

  return JSON.parse(
    JSON.stringify(
      skills.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term) ||
          s.level.toLowerCase().includes(term) ||
          (s.description?.fr || "").toLowerCase().includes(term) ||
          (s.description?.en || "").toLowerCase().includes(term)
      )
    )
  )
}

const getSkillStats = () => {
  const skills = initializeSkills()
  const categories = {}

  skills.forEach((skill) => {
    if (!categories[skill.category]) {
      categories[skill.category] = []
    }
    categories[skill.category].push(skill)
  })

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
      Beginner: skills.filter((s) => s.level === "Beginner").length,
      Intermediate: skills.filter((s) => s.level === "Intermediate").length,
      Advanced: skills.filter((s) => s.level === "Advanced").length,
      Expert: skills.filter((s) => s.level === "Expert").length,
    },
  }
}

const resetSkills = () => {
  skillsCache = migrateSkills(initialSkills)
  persistSkills()
  return JSON.parse(JSON.stringify(skillsCache))
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

test("Load initial skills", () => {
  localStorage.clear()
  skillsCache = null
  const skills = getSkills()
  const expected = Object.values(groups).reduce((sum, items) => sum + items.length, 0)
  assert(skills.length === expected, `Expected ${expected} skills, got ${skills.length}`)
})

test("Get all skills", () => {
  localStorage.clear()
  skillsCache = null
  const skills = getSkills()
  const expected = Object.values(groups).reduce((sum, items) => sum + items.length, 0)
  assert(skills.length >= expected, `Should have at least ${expected} skills`)
})

test("Get published skills only", () => {
  const published = getPublishedSkills()
  published.forEach((skill) => {
    assert(skill.status === "Published", "All skills should be Published")
  })
})

test("Get skill by ID", () => {
  const skill = getSkillById(101)
  assert(skill !== null, "Skill should be found")
  assert(skill.id === 101, "Skill ID should match")
})

test("Get non-existent skill returns null", () => {
  const skill = getSkillById(99999)
  assert(skill === null, "Non-existent skill should return null")
})

test("Get skills by category", () => {
  const langages = getSkillsByCategory("Langages")
  assert(langages.length > 0, "Should find skills in Langages category")
  langages.forEach((s) => {
    assert(s.category === "Langages", "All should be in Langages category")
  })
})

test("Get published skills by category", () => {
  const frontend = getPublishedSkillsByCategory("Frontend")
  frontend.forEach((s) => {
    assert(s.category === "Frontend", "All should be in Frontend category")
    assert(s.status === "Published", "All should be published")
  })
})

test("Get featured skills", () => {
  // First, create a featured skill
  localStorage.clear()
  skillsCache = null
  getSkills() // Initialize
  createSkill({
    name: "Test Featured",
    category: "Langages",
    description: { fr: "Test", en: "Test" },
    featured: true,
    status: "Published",
  })
  
  const featured = getFeaturedSkills()
  const hasTest = featured.some((s) => s.name === "Test Featured")
  assert(hasTest, "Should find featured skill")
})

test("Create skill", () => {
  localStorage.clear()
  skillsCache = null
  const initialCount = getSkills().length
  
  const newSkill = createSkill({
    name: "Test Skill",
    category: "Langages",
    description: { fr: "Test Description FR", en: "Test Description EN" },
    level: "Advanced",
    status: "Draft",
  })
  
  assert(newSkill.id > 0, "Created skill should have ID")
  const afterCount = getSkills().length
  assert(afterCount === initialCount + 1, "Skill count should increase")
})

test("Update skill", () => {
  const updated = updateSkill(101, {
    level: "Expert",
  })
  
  assert(updated.level === "Expert", "Level should be updated")
  const retrieved = getSkillById(101)
  assert(retrieved.level === "Expert", "Persisted update should be readable")
})

test("Update nested object (description)", () => {
  localStorage.clear()
  skillsCache = null
  const skills = getSkills()
  const skill = skills[0]
  
  updateSkill(skill.id, {
    description: {
      fr: "New FR Description",
      en: skill.description.en,
    },
  })
  
  const updated = getSkillById(skill.id)
  assert(updated.description.fr === "New FR Description", "FR description should update")
  assert(updated.description.en === skill.description.en, "EN description should be preserved")
})

test("Toggle status Published -> Draft", () => {
  toggleSkillStatus(101)
  const skill = getSkillById(101)
  assert(skill.status === "Draft", "Status should toggle to Draft")
})

test("Toggle status Draft -> Published", () => {
  toggleSkillStatus(101)
  const skill = getSkillById(101)
  assert(skill.status === "Published", "Status should toggle back to Published")
})

test("Toggle featured status", () => {
  localStorage.clear()
  skillsCache = null
  getSkills()
  
  const skill = createSkill({
    name: "Test Featured Toggle",
    category: "Frontend",
    description: { fr: "Test", en: "Test" },
    featured: false,
  })
  
  toggleSkillFeatured(skill.id)
  const updated = getSkillById(skill.id)
  assert(updated.featured === true, "Featured should toggle to true")
  
  toggleSkillFeatured(skill.id)
  const toggled = getSkillById(skill.id)
  assert(toggled.featured === false, "Featured should toggle back to false")
})

test("Delete skill", () => {
  localStorage.clear()
  skillsCache = null
  const initialCount = getSkills().length
  
  const result = deleteSkill(101)
  assert(result === true, "Delete should return true")
  
  const afterCount = getSkills().length
  assert(afterCount === initialCount - 1, "Skill count should decrease")
})

test("Delete non-existent returns false", () => {
  const result = deleteSkill(99999)
  assert(result === false, "Delete non-existent should return false")
})

test("Update skills order", () => {
  localStorage.clear()
  skillsCache = null
  const allSkills = getSkills()
  const skills = allSkills.slice(0, Math.min(5, allSkills.length))
  
  if (skills.length < 2) {
    // Skip test if not enough skills
    return
  }
  
  const ids = skills.map((s) => s.id)
  
  // Reverse the order
  const reversed = ids.reverse()
  updateSkillsOrder(reversed)
  
  const updated = getSkills()
  assert(updated.find((s) => s.id === reversed[0]).displayOrder === 1, "Order should be updated")
})

test("Search skills by name", () => {
  const results = searchSkills("React")
  const hasReact = results.some((s) => s.name === "React")
  assert(hasReact, "Should find skill by name")
})

test("Search skills by category", () => {
  const results = searchSkills("Frontend")
  results.forEach((s) => {
    const match = s.name.includes("Frontend") || s.category.includes("Frontend")
    assert(match, "Results should match search term")
  })
})

test("Persistence to localStorage", () => {
  localStorage.clear()
  skillsCache = null
  
  createSkill({
    name: "Persistence Test Skill",
    category: "Langages",
    description: { fr: "Test", en: "Test" },
  })
  
  const stored = localStorage.getItem("mk-skills")
  assert(stored !== null, "Data should be persisted to localStorage")
  
  skillsCache = null
  const retrieved = getSkills()
  const hasSkill = retrieved.some((s) => s.name === "Persistence Test Skill")
  assert(hasSkill, "Data should be loaded from localStorage")
})

test("Data immutability", () => {
  localStorage.clear()
  skillsCache = null
  const skills1 = getSkills()
  const skills2 = getSkills()
  
  skills1[0].name = "MODIFIED"
  assert(skills2[0].name !== "MODIFIED", "Returned data should be immutable")
})

test("Bilingual content", () => {
  const skill = getSkillById(101)
  assert(skill.description.fr !== "", "FR description should exist")
  assert(skill.description.en !== "", "EN description should exist")
})

test("Proficiency levels", () => {
  const levels = getProficiencyLevels()
  assert(levels.length === 4, "Should have 4 proficiency levels")
  assert(levels.includes("Beginner"), "Should include Beginner")
  assert(levels.includes("Intermediate"), "Should include Intermediate")
  assert(levels.includes("Advanced"), "Should include Advanced")
  assert(levels.includes("Expert"), "Should include Expert")
})

test("Category names", () => {
  const categories = getCategoryNames()
  assert(categories.length === 8, "Should have 8 categories")
  assert(categories.includes("Langages"), "Should include Langages")
  assert(categories.includes("Frontend"), "Should include Frontend")
  assert(categories.includes("Backend"), "Should include Backend")
})

test("Skill statistics", () => {
  localStorage.clear()
  skillsCache = null
  getSkills()
  
  const stats = getSkillStats()
  const expected = Object.values(groups).reduce((sum, items) => sum + items.length, 0)
  assert(stats.total === expected, `Total should be ${expected}`)
  assert(stats.published === expected, "All should be published initially")
  assert(stats.draft === 0, "No drafts initially")
  assert(stats.categories === 8, "Should have 8 categories")
})

test("Validation: missing name", () => {
  try {
    createSkill({
      name: "",
      category: "Langages",
      description: { fr: "Test", en: "Test" },
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing category", () => {
  try {
    createSkill({
      name: "Test",
      category: "",
      description: { fr: "Test", en: "Test" },
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing FR description", () => {
  try {
    createSkill({
      name: "Test",
      category: "Langages",
      description: { fr: "", en: "Test" },
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: missing EN description", () => {
  try {
    createSkill({
      name: "Test",
      category: "Langages",
      description: { fr: "Test", en: "" },
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Validation: invalid proficiency level", () => {
  try {
    createSkill({
      name: "Test",
      category: "Langages",
      description: { fr: "Test", en: "Test" },
      level: "InvalidLevel",
    })
    throw new Error("Should have thrown validation error")
  } catch (e) {
    assert(e.message.includes("Validation failed"), "Should throw validation error")
  }
})

test("Reset to defaults", () => {
  localStorage.clear()
  skillsCache = null
  createSkill({
    name: "Custom Skill",
    category: "Langages",
    description: { fr: "Test", en: "Test" },
  })
  
  const beforeReset = getSkills().length
  resetSkills()
  const afterReset = getSkills().length
  
  const expected = Object.values(groups).reduce((sum, items) => sum + items.length, 0)
  assert(afterReset === expected, `Reset should restore initial skills count (${expected})`)
})

test("Featured count in statistics", () => {
  localStorage.clear()
  skillsCache = null
  getSkills()
  
  // Create a featured skill
  createSkill({
    name: "Featured Stat Test",
    category: "Langages",
    description: { fr: "Test", en: "Test" },
    featured: true,
  })
  
  const stats = getSkillStats()
  assert(stats.featured >= 1, "Featured count should include new featured skill")
})

// Run all tests
console.log("=== AUDIT: Skill Service Test Suite ===")
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
