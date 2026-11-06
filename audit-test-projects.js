/**
 * Audit Test Suite for Project Service
 * Reproduces the exact tests from STEP 7
 */

const initialProjects = [
  {
    id: 1,
    title: "BudgetFlow",
    titleEn: "BudgetFlow",
    category: "Web Development",
    description: {
      fr: "Application web de gestion des finances personnelles.",
      en: "Personal finance management web application.",
    },
    detail: {
      fr: "Un tableau de bord financier clair pour suivre les dépenses, revenus et objectifs mensuels.",
      en: "A clear financial dashboard to track expenses, income, and monthly goals.",
    },
    technologies: ["React", "JavaScript", "Tailwind"],
    contribution: {
      fr: "Architecture front-end, design du dashboard et visualisation des données.",
      en: "Front-end architecture, dashboard design and data visualization.",
    },
    status: "Published",
    featured: true,
    displayOrder: 1,
    image: "gradient1",
    images: [],
    githubUrl: "#",
    liveUrl: "",
    year: 2026,
    duration: "3 mois",
    client: "Startup XYZ",
  },
  {
    id: 2,
    title: "MindLog AI",
    titleEn: "MindLog AI",
    category: "Web Development",
    description: {
      fr: "Journal personnel intelligent pour organiser souvenirs et événements.",
      en: "Smart personal journal to organize memories and events.",
    },
    detail: {
      fr: "Une expérience de journal augmentée par IA qui transforme les notes en souvenirs structurés.",
      en: "An AI-enhanced journaling experience that turns notes into structured memories.",
    },
    technologies: ["React", "Django", "PostgreSQL", "AI"],
    contribution: {
      fr: "UX, composants React et intégration des fonctionnalités intelligentes.",
      en: "UX, React components and smart feature integration.",
    },
    status: "Published",
    featured: true,
    displayOrder: 2,
    image: "gradient2",
    images: [],
    githubUrl: "#",
    liveUrl: "",
    year: 2025,
    duration: "6 mois",
    client: "Tech Co",
  },
  {
    id: 3,
    title: "Draft Project",
    titleEn: "Draft Project",
    category: "UI/UX Design",
    description: {
      fr: "Projet en brouillon.",
      en: "Draft project.",
    },
    detail: {
      fr: "Ce projet est en cours de développement.",
      en: "This project is under development.",
    },
    technologies: ["Figma"],
    contribution: {
      fr: "Design et prototypage.",
      en: "Design and prototyping.",
    },
    status: "Draft",
    featured: false,
    displayOrder: 3,
    image: "gradient3",
    images: [],
    githubUrl: "",
    liveUrl: "",
    year: 2026,
    duration: "",
    client: "",
  },
]

let localStorage = {}
const STORAGE_KEY = "mk-projects"
let projectsCache = null

const initializeProjects = () => {
  if (projectsCache !== null) return projectsCache
  try {
    const stored = localStorage[STORAGE_KEY]
    projectsCache = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(initialProjects))
  } catch (error) {
    projectsCache = JSON.parse(JSON.stringify(initialProjects))
  }
  return projectsCache
}

const persistProjects = () => {
  try {
    localStorage[STORAGE_KEY] = JSON.stringify(projectsCache)
  } catch (error) {
    console.error("Error saving:", error)
  }
}

const getProjects = () => {
  const projects = initializeProjects()
  return JSON.parse(JSON.stringify(projects))
}

const getPublishedProjects = () => {
  const projects = initializeProjects()
  return JSON.parse(
    JSON.stringify(projects.filter((p) => p.status === "Published"))
  )
}

const getProjectById = (id) => {
  const projects = initializeProjects()
  const project = projects.find((p) => p.id === id)
  return project ? JSON.parse(JSON.stringify(project)) : null
}

const getProjectsByCategory = (category) => {
  const projects = initializeProjects()
  return JSON.parse(
    JSON.stringify(projects.filter((p) => p.category === category))
  )
}

const createProject = (projectData) => {
  const projects = initializeProjects()
  const newId = Math.max(...projects.map((p) => p.id), 0) + 1
  
  const newProject = {
    id: newId,
    title: projectData.title,
    titleEn: projectData.titleEn || projectData.title,
    category: projectData.category,
    description: {
      fr: projectData.description?.fr || "",
      en: projectData.description?.en || "",
    },
    detail: {
      fr: projectData.detail?.fr || "",
      en: projectData.detail?.en || "",
    },
    contribution: {
      fr: projectData.contribution?.fr || "",
      en: projectData.contribution?.en || "",
    },
    technologies: projectData.technologies || [],
    status: projectData.status || "Draft",
    featured: projectData.featured || false,
    displayOrder: projectData.displayOrder || newId,
    image: projectData.image || "",
    images: projectData.images || [],
    githubUrl: projectData.githubUrl || "",
    liveUrl: projectData.liveUrl || "",
    year: projectData.year || new Date().getFullYear(),
    duration: projectData.duration || "",
    client: projectData.client || "",
  }

  projectsCache.push(newProject)
  persistProjects()
  return JSON.parse(JSON.stringify(newProject))
}

const updateProject = (id, updates) => {
  const projects = initializeProjects()
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) throw new Error(`Project with ID ${id} not found`)

  projects[index] = {
    ...projects[index],
    ...updates,
    description: {
      ...projects[index].description,
      ...(updates.description || {}),
    },
    detail: {
      ...projects[index].detail,
      ...(updates.detail || {}),
    },
    contribution: {
      ...projects[index].contribution,
      ...(updates.contribution || {}),
    },
  }

  persistProjects()
  return JSON.parse(JSON.stringify(projects[index]))
}

const deleteProject = (id) => {
  const projects = initializeProjects()
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) return false
  projects.splice(index, 1)
  persistProjects()
  return true
}

const toggleProjectStatus = (id) => {
  const project = getProjectById(id)
  if (!project) throw new Error(`Project with ID ${id} not found`)
  const newStatus = project.status === "Published" ? "Draft" : "Published"
  return updateProject(id, { status: newStatus })
}

// AUDIT TEST SUITE
console.log("=== AUDIT: Project Service Test Suite ===\n")

let passCount = 0
let failCount = 0
let failedTests = []

function test(name, fn) {
  try {
    fn()
    console.log(`✓ TEST ${passCount + failCount + 1}/20: ${name}`)
    passCount++
  } catch (error) {
    failCount++
    console.log(`✗ TEST ${passCount + failCount}/20: ${name}`)
    console.log(`  ERROR: ${error.message}\n`)
    failedTests.push({ name, error: error.message })
  }
}

// TESTS
test("Load initial projects", () => {
  const projects = getProjects()
  if (projects.length !== 3) throw new Error(`Expected 3 projects, got ${projects.length}`)
})

test("Get all projects", () => {
  const projects = getProjects()
  if (projects.length !== 3) throw new Error("Should return all projects")
  if (!projects.find(p => p.id === 1)) throw new Error("Project 1 missing")
})

test("Get published projects only", () => {
  const projects = getPublishedProjects()
  if (projects.length !== 2) throw new Error(`Expected 2 published, got ${projects.length}`)
  if (projects.some(p => p.status !== "Published")) throw new Error("Non-published project found")
})

test("Get project by ID", () => {
  const project = getProjectById(1)
  if (!project) throw new Error("Project not found")
  if (project.title !== "BudgetFlow") throw new Error("Wrong project returned")
})

test("Get non-existent project returns null", () => {
  const project = getProjectById(999)
  if (project !== null) throw new Error("Should return null for non-existent project")
})

test("Filter by category", () => {
  const projects = getProjectsByCategory("Web Development")
  if (projects.length !== 2) throw new Error(`Expected 2, got ${projects.length}`)
})

test("Create project", () => {
  const newProject = createProject({
    title: "Test Project FR",
    titleEn: "Test Project EN",
    category: "Web Development",
    description: { fr: "Test FR", en: "Test EN" },
    detail: { fr: "Detail FR", en: "Detail EN" },
    contribution: { fr: "Contrib FR", en: "Contrib EN" },
    technologies: ["React"],
    year: 2026,
  })
  if (!newProject.id) throw new Error("No ID assigned")
  if (newProject.title !== "Test Project FR") throw new Error("Title not set correctly")
  if (newProject.status !== "Draft") throw new Error("Status should default to Draft")
})

test("Project count increased", () => {
  const projects = getProjects()
  if (projects.length !== 4) throw new Error(`Expected 4 projects, got ${projects.length}`)
})

test("Update project", () => {
  const updated = updateProject(1, {
    title: "Updated Title",
    year: 2027,
  })
  if (updated.title !== "Updated Title") throw new Error("Title not updated")
  if (updated.year !== 2027) throw new Error("Year not updated")
})

test("Update nested object (description)", () => {
  const updated = updateProject(1, {
    description: { fr: "New FR description" },
  })
  if (updated.description.fr !== "New FR description") throw new Error("FR description not updated")
  if (updated.description.en !== "Personal finance management web application.") throw new Error("EN description should be preserved")
})

test("Toggle status Published -> Draft", () => {
  const updated = toggleProjectStatus(2)
  if (updated.status !== "Draft") throw new Error("Status not toggled to Draft")
})

test("Toggle status Draft -> Published", () => {
  const updated = toggleProjectStatus(2)
  if (updated.status !== "Published") throw new Error("Status not toggled back to Published")
})

test("Delete project", () => {
  const success = deleteProject(4)
  if (!success) throw new Error("Delete returned false")
})

test("Project count after delete should be 3", () => {
  const projects = getProjects()
  if (projects.length !== 3) throw new Error(`Expected 3 projects, got ${projects.length}`)
})

test("Deleted project is gone", () => {
  const project = getProjectById(4)
  if (project !== null) throw new Error("Deleted project still exists")
})

test("Delete non-existent returns false", () => {
  const success = deleteProject(999)
  if (success !== false) throw new Error("Should return false")
})

test("Persistence to localStorage", () => {
  const storedData = localStorage[STORAGE_KEY]
  if (!storedData) throw new Error("Data not in localStorage")
  const parsed = JSON.parse(storedData)
  if (parsed.length !== 3) throw new Error(`Expected 3 in storage, got ${parsed.length}`)
})

test("Data immutability", () => {
  const project1 = getProjects()[0]
  project1.title = "MODIFIED"
  const project2 = getProjects()[0]
  if (project2.title === "MODIFIED") throw new Error("Original data was modified")
})

test("Bilingual content", () => {
  const project = getProjectById(1)
  if (!project.title || !project.titleEn) throw new Error("Missing titles")
  if (!project.description.fr || !project.description.en) throw new Error("Missing descriptions")
})

test("Featured and displayOrder", () => {
  const project = getProjectById(1)
  if (project.featured !== true) throw new Error("Featured not set")
  if (project.displayOrder !== 1) throw new Error("displayOrder not set")
})

console.log(`\n=== AUDIT RESULTS ===`)
console.log(`Passed: ${passCount}/20`)
console.log(`Failed: ${failCount}/20`)

if (failedTests.length > 0) {
  console.log(`\n=== FAILED TESTS ===`)
  failedTests.forEach((t, i) => {
    console.log(`${i + 1}. Test: "${t.name}"`)
    console.log(`   Error: ${t.error}\n`)
  })
}

console.log(`\n=== CONCLUSION ===`)
if (failCount === 0) {
  console.log(`✓ ALL 20 TESTS PASSED`)
} else {
  console.log(`✗ ${failCount} tests failed (see above)`)
}
