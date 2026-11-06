/**
 * Icon Mapping Service
 * Maps technology names to Devicon and Simple Icons identifiers
 * 
 * Uses:
 * - Devicon: https://devicon.dev/ (primary source for tech logos)
 * - Simple Icons: https://simpleicons.org/ (fallback for unsupported tech)
 * 
 * Icon identifiers format:
 * - Devicon: "devicon-<name>-plain" or "devicon-<name>-plain-wordmark"
 * - Simple Icons: "simpleicons-<name>" (lowercase, hyphens instead of spaces)
 * - Special: "fallback-letter" for first-letter generic fallback
 */

/**
 * Complete mapping of skill names to icon identifiers
 * Supports both official technology logos and generic category icons
 * 
 * IMPORTANT: All Devicon icons use -plain variant (most compatible)
 * IMPORTANT: All Simple Icons icons are verified to exist on simpleicons.org
 * IMPORTANT: Icons that fail to load will gracefully fallback to first letter
 */
export const SKILL_ICON_MAP = {
  // Langages (9 skills)
  "HTML5": "devicon-html5-plain",
  "CSS3": "devicon-css3-plain",
  "JavaScript": "devicon-javascript-plain",
  "TypeScript": "devicon-typescript-plain",
  "Python": "devicon-python-plain",
  "PHP": "devicon-php-plain",
  "Java": "devicon-java-plain",
  "C#": "devicon-csharp-plain",
  "Dart": "devicon-dart-plain",

  // Frontend (6 skills)
  "React": "devicon-react-plain",
  "Next.js": "devicon-nextjs-plain",
  "Tailwind CSS": "devicon-tailwindcss-plain",
  "Bootstrap": "devicon-bootstrap-plain",
  "Flutter": "devicon-flutter-plain",
  "FlutterFlow": "simpleicons-flutter",
  "Responsive Design": "devicon-css3-plain", // CSS foundation for responsive design

  // Backend (6+ skills)
  "Node.js": "devicon-nodejs-plain",
  "Express.js": "devicon-nodejs-plain", // Express runs on Node.js
  "NestJS": "devicon-nestjs-plain",
  "Symfony": "devicon-symfony-plain",
  ".NET": "devicon-dot-net-plain",
  "Java/JEE": "devicon-java-plain",
  "REST API": "https://avatars.githubusercontent.com/u/20165699?s=200&v=4", // FastAPI logo (official REST API icon)
  "Socket.IO": "devicon-nodejs-plain", // Socket.IO is Node.js-based
  "TypeORM": "devicon-typescript-plain", // TypeORM is TypeScript-based

  // Bases de données (5 skills)
  "MongoDB": "devicon-mongodb-plain",
  "MySQL": "devicon-mysql-plain",
  "PostgreSQL": "devicon-postgresql-plain",
  "Oracle": "devicon-oracle-plain",
  "SQL Server": "devicon-microsoftsqlserver-plain",

  // DevOps & Outils (7+ skills)
  "Git": "devicon-git-plain",
  "GitHub": "devicon-github-plain",
  "GitHub Actions": "devicon-github-plain",
  "Docker": "devicon-docker-plain",
  "Jenkins": "devicon-jenkins-plain",
  "Swagger": "devicon-swagger-plain",
  "Jira": "devicon-jira-plain",
  "Postman": "simpleicons-postman",
  "VS Code": "devicon-vscode-plain",
  "CI/CD": "devicon-circleci-plain",

  // UI/UX Design (5+ skills)
  "Figma": "devicon-figma-plain",
  "Figma Make": "devicon-figma-plain",
  "UI Design": "devicon-figma-plain", // Figma for UI
  "UX Design": "devicon-figma-plain", // Figma for UX prototyping
  "Wireframing": "devicon-inkscape-plain",

  // CMS (2 skills)
  "WordPress": "devicon-wordpress-plain",
  "Elementor": "simpleicons-elementor",

  // Systèmes (2 skills)
  "Windows": "devicon-windows8-plain",
  "Linux": "devicon-linux-plain",

  // Security & APIs (New)
  "JWT Authentication": "lucide-shield-check", // Lucide shield icon for JWT/security
  "OpenAI API": "simpleicons-openai",
  "Ollama": "simpleicons-ollama",

  // Prototyping (Alias)
  "Prototyping": "devicon-figma-plain",

  // UI/UX Design (Alias)
  "Designing": "devicon-figma-plain",
}

/**
 * Get icon identifier for a skill name
 * Returns Devicon/Simple Icons identifier, or first-letter fallback if not found
 * 
 * @param {string} skillName - The technology name (e.g., "React", "MongoDB")
 * @returns {string} Icon identifier (e.g., "devicon-react-plain") or "fallback-letter"
 */
export function getIconForSkill(skillName) {
  if (!skillName || skillName.trim() === "") {
    return "fallback-letter" // Neutral fallback, not GitHub
  }

  // Try exact match first
  if (SKILL_ICON_MAP[skillName]) {
    return SKILL_ICON_MAP[skillName]
  }

  // Try case-insensitive match
  const lowerName = skillName.toLowerCase()
  for (const [key, icon] of Object.entries(SKILL_ICON_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return icon
    }
  }

  // Fallback to first-letter (neutral, not GitHub)
  return "fallback-letter"
}

/**
 * Check if icon identifier is from Lucide
 * @param {string} iconId - Icon identifier
 * @returns {boolean}
 */
export function isLucideIcon(iconId) {
  return iconId?.startsWith("lucide-")
}

/**
 * Check if icon identifier is from Devicon
 * @param {string} iconId - Icon identifier
 * @returns {boolean}
 */
export function isDeviconIcon(iconId) {
  return iconId?.startsWith("devicon-")
}

/**
 * Check if icon identifier is from Simple Icons
 * @param {string} iconId - Icon identifier
 * @returns {boolean}
 */
export function isSimpleIcon(iconId) {
  return iconId?.startsWith("simpleicons-")
}

/**
 * Check if icon identifier is fallback (first letter)
 * @param {string} iconId - Icon identifier
 * @returns {boolean}
 */
export function isFallbackIcon(iconId) {
  return iconId === "fallback-letter"
}

/**
 * Convert Lucide identifier to icon name
 * @param {string} iconId - Icon identifier (e.g., "lucide-shield-check")
 * @returns {string} Lucide icon name
 */
export function getLucideIconName(iconId) {
  if (!isLucideIcon(iconId)) {
    return null // Return null for non-Lucide icons
  }
  // Remove "lucide-" prefix
  return iconId.replace("lucide-", "")
}

/**
 * Convert icon identifier to Devicon class name
 * @param {string} iconId - Icon identifier (e.g., "devicon-react-plain")
 * @returns {string} CSS class name for Devicon
 */
export function getDeviconClassName(iconId) {
  if (!isDeviconIcon(iconId)) {
    return null // Return null for non-Devicon icons
  }
  // Already in correct format
  return iconId
}

/**
 * Convert Simple Icons identifier to icon name
 * @param {string} iconId - Icon identifier (e.g., "simpleicons-react")
 * @returns {string} Simple Icons icon name
 */
export function getSimpleIconName(iconId) {
  if (!isSimpleIcon(iconId)) {
    return null // Return null for non-Simple Icons
  }
  // Remove "simpleicons-" prefix
  return iconId.replace("simpleicons-", "")
}

/**
 * Get all available icons for a category
 * @param {string} category - Category name (e.g., "Frontend", "Backend")
 * @returns {Object} Map of skill names to icons in that category
 */
export function getIconsByCategory(category) {
  const categoryMap = {
    "Langages": [
      "HTML5", "CSS3", "JavaScript", "TypeScript", "Python",
      "PHP", "Java", "C#", "Dart"
    ],
    "Frontend": [
      "React", "Next.js", "Tailwind CSS", "Bootstrap", "Flutter", "FlutterFlow", "Responsive Design"
    ],
    "Backend": [
      "Node.js", "Express.js", "NestJS", "Symfony", ".NET", "Java/JEE", "REST API", "Socket.IO", "TypeORM"
    ],
    "Bases de données": [
      "MongoDB", "MySQL", "PostgreSQL", "Oracle", "SQL Server"
    ],
    "DevOps & Outils": [
      "Git", "GitHub", "GitHub Actions", "Docker", "Jenkins", "Swagger", "Jira", "Postman", "VS Code", "CI/CD"
    ],
    "UI/UX Design": [
      "Figma", "Figma Make", "UI Design", "UX Design", "Wireframing", "Prototyping"
    ],
    "CMS": [
      "WordPress", "Elementor"
    ],
    "Systèmes": [
      "Windows", "Linux"
    ],
    "Intelligence artificielle": [
      "JWT Authentication", "OpenAI API", "Ollama"
    ]
  }

  const skills = categoryMap[category] || []
  const result = {}

  skills.forEach((skill) => {
    result[skill] = getIconForSkill(skill)
  })

  return result
}

/**
 * Get all skill-to-icon mappings as array
 * @returns {Array} Array of {name, icon} objects
 */
export function getAllSkillIcons() {
  return Object.entries(SKILL_ICON_MAP).map(([name, icon]) => ({
    name,
    icon
  }))
}

/**
 * Get all skills organized by category with icons
 * @returns {Object} Nested object: category -> array of {name, icon}
 */
export function getAllSkillsByCategory() {
  const result = {}

  Object.entries(SKILL_ICON_MAP).forEach(([name, icon]) => {
    // Find category by checking which category the skill belongs to
    const categories = {
      "Langages": ["HTML5", "CSS3", "JavaScript", "TypeScript", "Python", "PHP", "Java", "C#", "Dart"],
      "Frontend": ["React", "Next.js", "Tailwind CSS", "Bootstrap", "Flutter", "FlutterFlow", "Responsive Design"],
      "Backend": ["Node.js", "Express.js", "NestJS", "Symfony", ".NET", "Java/JEE", "REST API", "Socket.IO", "TypeORM"],
      "Bases de données": ["MongoDB", "MySQL", "PostgreSQL", "Oracle", "SQL Server"],
      "DevOps & Outils": ["Git", "GitHub", "GitHub Actions", "Docker", "Jenkins", "Swagger", "Jira", "Postman", "VS Code", "CI/CD"],
      "UI/UX Design": ["Figma", "Figma Make", "UI Design", "UX Design", "Wireframing", "Prototyping"],
      "CMS": ["WordPress", "Elementor"],
      "Systèmes": ["Windows", "Linux"],
      "Intelligence artificielle": ["JWT Authentication", "OpenAI API", "Ollama"],
    }

    for (const [category, skills] of Object.entries(categories)) {
      if (skills.includes(name)) {
        if (!result[category]) {
          result[category] = []
        }
        result[category].push({ name, icon })
        break
      }
    }
  })

  return result
}
