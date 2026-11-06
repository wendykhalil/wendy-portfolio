import { useEffect, useMemo, useState, useCallback } from "react"
import {
  initialProjects,
  messages as seedMessages,
} from "./data"
import {
  getPublishedExperiences,
} from "./services/experienceService"
import { Icon } from "./icons"
import IconDisplay from "./components/IconDisplay"
import { ProjectImageCarousel } from "./components/ProjectImageCarousel"
import { getProfile, updateProfile } from "./services/profileService"
import { getIconForSkill } from "./services/iconMappingService"
import {
  getProjects,
  getPublishedProjects,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectStatus,
  getDefaultProject,
  getNextProjectId,
  getProjectStats,
} from "./services/projectService"
import {
  getSkills,
  getPublishedSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  toggleSkillStatus,
  toggleSkillFeatured,
  getDefaultSkill,
  getCategoryNames,
  getProficiencyLevels,
  validateSkillData,
  getSkillStats,
  initializeSkillsWithRealtime,
  refetchSkillsAfterReconnection,
  subscribeToSkillChanges,
} from "./services/skillService"
import { ServicesAdmin } from "./components/ServicesAdmin"
import { ExperiencesAdmin } from "./components/ExperiencesAdmin"
import { getPublishedServices } from "./services/serviceService"
import { ImageLightbox } from "./components/ImageLightbox"
import ContactForm from "./components/ContactForm"
import ContactSection from "./components/ContactSection"
import AdminContactSettings from "./components/AdminContactSettings"
import AdminContactMessages from "./components/AdminContactMessages"
import { getContactSettings } from "./services/contactService"
import {
  signOut,
  getSession,
  getCurrentUser,
  checkAdminRole,
  onAuthStateChange,
  signIn,
} from "./services/authService"

// Get profile data from service
const profile = getProfile()
const techs = [
  "HTML5",
  "CSS3",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind",
  "Node.js",
  "Express",
  "NestJS",
  "MongoDB",
  "MySQL",
  "Git",
  "GitHub",
  "Docker",
  "Figma",
  "WordPress",
]
const skillMarks = {
  JavaScript: "JS",
  TypeScript: "TS",
  React: "R",
  "Next.js": "N",
  "Node.js": "ND",
  MongoDB: "M",
  Tailwind: "TW",
  Figma: "F",
  WordPress: "W",
  Docker: "D",
  HTML5: "H5",
  CSS3: "C3",
}

const t = (locale, value) => value[locale]

function Mark({ name, small = false }) {
  return (
    <span className={`tech-mark ${small ? "small" : ""}`}>
      {skillMarks[name] || name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  className = "",
  disabled = false,
  as = "button",
}) {
  const commonProps = {
    className: `btn btn-${variant} ${className}`,
    onClick,
    children: (
      <>
        {children}
        {icon && <Icon name={icon} size={17} stroke="white" style={{ color: 'white' }} />}
      </>
    ),
  }

  if (as === "span") {
    return (
      <span
        {...commonProps}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyPress={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            onClick?.(e)
          }
        }}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      />
    )
  }

  return (
    <button
      type={type}
      {...commonProps}
      disabled={disabled}
    />
  )
}

function SectionHead({ eyebrow, title, text, center = false }) {
  return (
    <div className={`section-head ${center ? "center" : ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

function Toast({ message }) {
  return (
    <div className="toast">
      <span>
        <Icon name="check" size={16} />
      </span>
      {message}
    </div>
  )
}

function PublicPortfolio({ projects, projectsLoading, locale, setLocale }) {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [filter, setFilter] = useState("All")
  const [selected, setSelected] = useState(null)
  const [skillTab, setSkillTab] = useState("Langages")
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState("")
  const [skillsData, setSkillsData] = useState([])
  const [skillCategories, setSkillCategories] = useState([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [contactSettings, setContactSettings] = useState(null)
  const [isLoadingContactSettings, setIsLoadingContactSettings] = useState(true)
  const [experiences, setExperiences] = useState([])
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true)
  const [experienceError, setExperienceError] = useState(null)
  
  // Load profile from Supabase on mount
  useEffect(() => {
    const loadProfile = async () => {
      const { loadProfileFromDatabase } = await import('./services/profileService.js')
      await loadProfileFromDatabase()
    }
    loadProfile()
  }, [])
  
  // Load contact settings from Supabase on mount
  useEffect(() => {
    const loadContactSettings = async () => {
      try {
        const { settings, error } = await getContactSettings()
        if (error) {
          console.error('Error loading contact settings:', error)
          return
        }
        setContactSettings(settings)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoadingContactSettings(false)
      }
    }
    loadContactSettings()
  }, [])

  // Load experiences from Supabase on mount
  useEffect(() => {
    const loadExperiences = async () => {
      try {
        setIsLoadingExperiences(true)
        setExperienceError(null)
        const data = await getPublishedExperiences()
        setExperiences(data)
      } catch (err) {
        console.error('Error loading experiences:', err)
        setExperienceError(err.message)
      } finally {
        setIsLoadingExperiences(false)
      }
    }
    loadExperiences()
  }, [])
  
  // Initialize skills with Realtime sync on mount
  useEffect(() => {
    let unsubscribe = null
    
    const setupSkills = async () => {
      try {
        setIsLoadingSkills(true)
        
        // Initialize with Realtime subscription
        unsubscribe = await initializeSkillsWithRealtime((skills) => {
          setSkillsData(skills)
          setIsLoadingSkills(false)
        })
        
        // Load categories
        const categories = await getCategoryNames()
        if (categories.length > 0) {
          setSkillCategories(categories)
          // Set first category as default if not in categories
          if (!categories.includes(skillTab)) {
            setSkillTab(categories[0])
          }
        }
      } catch (error) {
        console.error("Error setting up skills:", error)
        setIsLoadingSkills(false)
      }
    }
    
    setupSkills()
    
    // Cleanup: unsubscribe from Realtime on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])
  
  // Handle network reconnection
  useEffect(() => {
    const handleOnline = async () => {
      console.log("Connection restored, refetching skills...")
      try {
        const refreshedSkills = await refetchSkillsAfterReconnection()
        setSkillsData(refreshedSkills)
      } catch (error) {
        console.error("Error refetching skills after reconnection:", error)
      }
    }
    
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [])
  
  // Get profile data from service
  const profileData = getProfile()
  const profileContent = profileData.content[locale]
  
  const content = {
    fr: {
      nav: [
        "Accueil",
        "À propos",
        "Parcours",
        "Projets",
        "Compétences",
        "Contact",
      ],
      hello: "Bonjour, je suis",
      role: profileContent.title,
      role2: profileContent.title2,
      hero: profileContent.hero,
      available: profileContent.available,
      cv: "Télécharger mon CV",
      contact: "Me contacter",
      aboutTitle: profileContent.aboutTitle,
      about: profileContent.about,
      path: "En savoir plus sur mon parcours",
      timeline: "Parcours professionnel & projets récents",
      timelineText:
        "Découvrez les étapes de mon parcours académique, mes expériences professionnelles et mes réalisations.",
      projects: "Projets sélectionnés",
      projectsText:
        "Une sélection de projets entre développement web, conception UI/UX et création de sites WordPress.",
      skills: "Compétences & Technologies",
      services: "Ce que je peux apporter",
      contactTitle: "Construisons quelque chose ensemble.",
      contactText:
        "Vous avez une idée, un projet ou une opportunité ? Je serais ravi d'échanger avec vous et de donner vie à vos idées.",
    },
    en: {
      nav: ["Home", "About", "Journey", "Projects", "Skills", "Contact"],
      hello: "Hello, I am",
      role: profileContent.title,
      role2: profileContent.title2,
      hero: profileContent.hero,
      available: profileContent.available,
      cv: "Download my CV",
      contact: "Contact me",
      aboutTitle: profileContent.aboutTitle,
      about: profileContent.about,
      path: "Explore my journey",
      timeline: "Professional journey & recent projects",
      timelineText:
        "Discover my academic journey, professional experiences, and achievements.",
      projects: "Selected projects",
      projectsText:
        "A selection of projects spanning web development, UI/UX design, and WordPress.",
      skills: "Skills & Technologies",
      services: "What I can bring",
      contactTitle: "Let's build something together.",
      contactText:
        "Have an idea, project, or opportunity? I would be happy to connect and bring your ideas to life.",
    },
  }[locale]
  const navIds = ["home", "about", "journey", "projects", "skills", "contact"]
  const filtered = projects.filter(
    (p) =>
      p.status === "Published" && (filter === "All" || p.category === filter),
  )

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const notify = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2600)
  }

  const downloadCv = async () => {
    try {
      const { downloadCurrentCv } = await import('./services/cvService.js')
      const cvLanguage = locale === 'fr' ? 'FR' : 'EN'
      
      const { url, error } = await downloadCurrentCv(cvLanguage)
      
      if (error) {
        notify(
          locale === "fr"
            ? `Erreur : ${error}`
            : `Error: ${error}`
        )
        return
      }

      if (!url) {
        notify(
          locale === "fr"
            ? "Aucun CV disponible pour le moment"
            : "No resume available at this time"
        )
        return
      }

      // Open PDF in new tab (triggers download based on browser settings)
      window.open(url, '_blank')
    } catch (err) {
      notify(
        locale === "fr"
          ? `Erreur téléchargement : ${err.message}`
          : `Download error: ${err.message}`
      )
    }
  }

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenu(false)
  }

  const services = getPublishedServices()

  const expertise = [
    {
      icon: "code",
      title:
        locale === "fr" ? "Développement Full Stack" : "Full Stack Development",
      text:
        locale === "fr"
          ? "Applications web complètes, du front-end interactif au back-end performant."
          : "Complete web apps, from interactive front-end to high-performance back-end.",
    },
    {
      icon: "layers",
      title: "Web Design & UI/UX",
      text:
        locale === "fr"
          ? "Interfaces modernes, intuitives et centrées sur l'utilisateur."
          : "Modern, intuitive, user-centered interfaces.",
    },
    {
      icon: "monitor",
      title: locale === "fr" ? "Applications Web" : "Web Applications",
      text:
        locale === "fr"
          ? "Solutions responsive et adaptées aux besoins des utilisateurs."
          : "Responsive solutions tailored to user needs.",
    },
    {
      icon: "cms",
      title: "WordPress & CMS",
      text:
        locale === "fr"
          ? "Sites, thèmes et solutions de gestion de contenu."
          : "Websites, themes, and content management solutions.",
    },
  ]

  return (
    <div className="public-shell">
      {toast && <Toast message={toast} />}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <button className="brand" onClick={() => go("home")}>
            <span>MK</span>
            <div>
              {profileData.personal.fullName.split(" ").slice(1).join(" ")}<small>{profileContent.title2}</small>
            </div>
          </button>
          <nav className={menu ? "open" : ""}>
            {content.nav.map((item, i) => (
              <button key={item} onClick={() => go(navIds[i])}>
                {item}
              </button>
            ))}
            <div className="mobile-only lang-switch">
              <button
                className={locale === "fr" ? "active" : ""}
                onClick={() => setLocale("fr")}
              >
                FR
              </button>
              <button
                className={locale === "en" ? "active" : ""}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
          </nav>
          <div className="nav-actions">
            <div className="lang-switch">
              <button
                className={locale === "fr" ? "active" : ""}
                onClick={() => setLocale("fr")}
              >
                FR
              </button>
              <button
                className={locale === "en" ? "active" : ""}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
            <Button onClick={downloadCv} icon="download">
              {locale === "fr" ? "Mon CV" : "Resume"}
            </Button>
            <button
              className="menu-btn"
              onClick={() => setMenu(!menu)}
              aria-label="Menu"
            >
              <Icon name={menu ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="hero-grid">
            <div className="hero-copy reveal">
              <span className="eyebrow">
                {profileData.content[locale].label || 'PORTFOLIO 2026'}
              </span>
              <h1>
                {profileData.content[locale].greeting || (locale === 'fr' ? 'Bonjour, je suis' : 'Hello, I am')}
                <strong>{profileData.personal.fullName}</strong>
              </h1>
              <div className="hero-role">
                <span>{content.role}</span>
                <b>•</b>
                {content.role2}
              </div>
              <p>{content.hero}</p>
              <div className="hero-buttons">
                <Button onClick={downloadCv} icon="download">
                  {content.cv}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => go("contact")}
                  icon="arrow"
                >
                  {content.contact}
                </Button>
              </div>
              <div className="hero-bottom">
                <div className="availability">
                  <span />
                  <div>
                    <small>
                      {locale === "fr" ? "Disponibilité" : "Availability"}
                    </small>
                    {content.available}
                  </div>
                </div>
                <div className="socials">
                  {profileData.social.github && (
                    <a href={profileData.social.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                      <Icon name="github" />
                    </a>
                  )}
                  {profileData.social.linkedin && (
                    <a href={profileData.social.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                      <Icon name="linkedin" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="portrait-wrap reveal delay">
              <div className="portrait-glow" />
              <div className="portrait-frame">
                <img
                  src={profileData.personal.photo}
                  alt="Portrait professionnel placeholder de Med Khalil Wendy"
                />
                <div className="portrait-overlay" />
              </div>
              <div className="floating-chip chip-code">
                <Icon name="code" /> Full Stack
              </div>
              <div className="floating-chip chip-design">
                <Icon name="spark" /> UI/UX Design
              </div>
            </div>
          </div>
          <button className="scroll-note" onClick={() => go("tech")}>
            <span />
            {locale === "fr" ? "Défiler pour découvrir" : "Scroll to discover"}
          </button>
        </section>

        <section id="tech" className="marquee-section">
          <p>
            {locale === "fr"
              ? "TECHNOLOGIES AVEC LESQUELLES JE TRAVAILLE"
              : "TECHNOLOGIES I WORK WITH"}
          </p>
          <div className="marquee">
            <div className="marquee-track">
              {isLoadingSkills ? (
                <div className="marquee-item">
                  {locale === "fr" ? "Chargement..." : "Loading..."}
                </div>
              ) : (
                <>
                  {skillsData
                    .filter((s) => s.status === "Published" && s.featured)
                    .concat(
                      skillsData.filter((s) => s.status === "Published" && s.featured)
                    )
                    .map((skill, i) => (
                      <div className="marquee-item" key={`${skill.id}-${i}`}>
                        <div className="marquee-icon-container">
                          <IconDisplay 
                            iconId={skill.icon} 
                            skillName={skill.name} 
                            size="sm"
                          />
                          <span className="skill-name">{skill.name}</span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </section>

        <section id="about" className="section about-section">
          <div className="about-copy">
            <SectionHead
              eyebrow={locale === "fr" ? "MON PROFIL" : "MY PROFILE"}
              title={content.aboutTitle}
            />
            <p className="lead">{content.about}</p>
            <Button
              variant="secondary"
              onClick={() => go("journey")}
              icon="arrow"
            >
              {content.path}
            </Button>
            <div className="about-stats">
              <div>
                <strong>15+</strong>
                <span>{locale === "fr" ? "Technologies" : "Technologies"}</span>
              </div>
              <div>
                <strong>08</strong>
                <span>
                  {locale === "fr" ? "Projets réalisés" : "Projects delivered"}
                </span>
              </div>
              <div>
                <strong>03</strong>
                <span>{locale === "fr" ? "Expériences" : "Experiences"}</span>
              </div>
            </div>
          </div>
          <div className="expertise-grid">
            {expertise.map((item, i) => (
              <article className="expertise-card" key={item.title}>
                <span className="card-number">0{i + 1}</span>
                <div className="icon-box">
                  <Icon name={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Icon className="corner-arrow" name="arrow" />
              </article>
            ))}
          </div>
        </section>

        <section id="journey" className="section journey-section">
          <SectionHead
            eyebrow={locale === "fr" ? "MON PARCOURS" : "MY JOURNEY"}
            title={content.timeline}
            text={content.timelineText}
            center
          />
          <div className="timeline">
            {isLoadingExperiences ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p>{locale === "fr" ? "Chargement..." : "Loading..."}</p>
              </div>
            ) : experienceError ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#e74c3c" }}>
                <p>{locale === "fr" ? "Erreur lors du chargement" : "Error loading experiences"}</p>
              </div>
            ) : experiences.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p>{locale === "fr" ? "Aucune expérience" : "No experiences"}</p>
              </div>
            ) : (
              experiences.map((exp, i) => (
                <div className="timeline-item" key={exp.id}>
                  <div className="timeline-meta">
                    <span>{exp.startDate || ""}</span>
                    <small>{t(locale, exp.type)}</small>
                  </div>
                  <div className="timeline-dot">
                    {String(exp.displayOrder).padStart(2, "0")}
                  </div>
                  <article className="timeline-card">
                    <div className="timeline-top">
                      <div>
                        <span>{t(locale, exp.type)}</span>
                        <h3>{t(locale, exp.title)}</h3>
                        <strong>{exp.place}</strong>
                      </div>
                      <Icon name={i % 2 ? "briefcase" : "file"} />
                    </div>
                    <p>{t(locale, exp.description)}</p>
                    <p className="responsibility">
                      <b>{locale === "fr" ? "Mission : " : "Focus: "}</b>
                      {t(locale, exp.responsibilities)}
                    </p>
                    <div className="tag-row">
                      {exp.technologies?.map((x) => (
                        <span key={x}>
                          <Mark name={x} small />
                          {x}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="projects" className="section project-section">
          <div className="project-header">
            <SectionHead
              eyebrow={locale === "fr" ? "RÉALISATIONS" : "SELECTED WORK"}
              title={content.projects}
              text={content.projectsText}
            />
            <span className="project-count">
              {String(filtered.length).padStart(2, "0")}{" "}
              <small>{locale === "fr" ? "projets" : "projects"}</small>
            </span>
          </div>
          <div className="tabs project-tabs">
            {["All", "Web Development", "UI/UX Design", "WordPress"].map(
              (cat) => (
                <button
                  key={cat}
                  className={filter === cat ? "active" : ""}
                  onClick={() => setFilter(cat)}
                >
                  {cat === "All"
                    ? locale === "fr"
                      ? "Tous les projets"
                      : "All projects"
                    : cat}
                </button>
              ),
            )}
          </div>
          <div className="project-grid">
            {projectsLoading ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 2rem", color: "#999" }}>
                <p>{locale === "fr" ? "Chargement des projets..." : "Loading projects..."}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 2rem", color: "#999" }}>
                <p>{locale === "fr" ? "Aucun projet trouvé" : "No projects found"}</p>
              </div>
            ) : (
            filtered.map((project) => {
              // All project images are now in screenshots array
              // For legacy projects with only coverImageUrl, migrate to screenshots
              let allImages = project.screenshots && project.screenshots.length > 0
                ? project.screenshots.map(s => typeof s === 'string' ? s : s.url).filter(Boolean)
                : []
              
              // Fallback for legacy projects: if no screenshots but has coverImageUrl, use it
              if (allImages.length === 0 && project.coverImageUrl) {
                allImages = [project.coverImageUrl]
              }
              
              const hasImages = allImages.length > 0
              
              return (
                <article className="project-card" key={project.id}>
                  {/* Image Carousel - replaces old gallery grid */}
                  <div className="project-visual">
                    <ProjectImageCarousel
                      images={allImages}
                      fallbackBackground={project.image}
                      projectTitle={project.title}
                      onImageClick={() => setSelected({ ...project, _lightboxImages: allImages, _lightboxStartIndex: 0 })}
                    />
                  </div>
                  <div className="project-body">
                    <div className="project-category">
                      {project.category}
                      <span>{String(project.displayOrder).padStart(2, "0")}</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>{t(locale, project.description)}</p>
                    <div className="tag-row compact">
                      {project.technologies.map((x) => (
                        <span key={x}>{x}</span>
                      ))}
                    </div>
                    <div className="project-actions">
                      {project.githubUrl && project.githubUrl.trim() && project.githubUrl !== "#" && (
                        <button
                          onClick={() =>
                            notify(
                              locale === "fr"
                                ? "Lien GitHub de démonstration"
                                : "Demo GitHub link",
                            )
                          }
                        >
                          <Icon name="github" />
                          GitHub
                        </button>
                      )}
                      <button onClick={() => setSelected({ ...project, _lightboxImages: allImages, _lightboxStartIndex: 0 })}>
                        {locale === "fr" ? "Voir le projet" : "View project"}
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
            )}
          </div>
        </section>

        <section id="skills" className="section skills-section">
          <SectionHead
            eyebrow={locale === "fr" ? "STACK TECHNIQUE" : "TECH STACK"}
            title={content.skills}
            text={
              locale === "fr"
                ? "Un écosystème d'outils pour concevoir, développer et livrer des expériences numériques complètes."
                : "An ecosystem of tools to design, build, and ship complete digital experiences."
            }
            center
          />
          <div className="tabs skill-tabs">
            {skillCategories.map((cat) => (
              <button
                key={cat}
                className={skillTab === cat ? "active" : ""}
                onClick={() => setSkillTab(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="skill-grid">
            {isLoadingSkills ? (
              <div>{locale === "fr" ? "Chargement des compétences..." : "Loading skills..."}</div>
            ) : (
              skillsData
                .filter((s) => s.status === "Published" && s.category === skillTab)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((skill) => (
                  <div className="skill-card" key={skill.id}>
                    <div className="skill-icon-container">
                      <IconDisplay 
                        iconId={skill.icon} 
                        skillName={skill.name} 
                        size="md"
                      />
                      <div className="skill-name">{skill.name}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="section service-section">
          <SectionHead
            eyebrow={locale === "fr" ? "EXPERTISE" : "EXPERTISE"}
            title={content.services}
          />
          <div className="services-grid">
            {services.map((service, i) => (
              <article key={service.id}>
                <span>0{i + 1}</span>
                <div className="icon-box">
                  <Icon name={service.icon} />
                </div>
                <h3>{service.title[locale]}</h3>
                <p>{service.description[locale]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="contact-page-section">
          <div className="section">
            <div className="contact-section">
              <div className="contact-info">
                <div className="contact-heading">
                  <span className="eyebrow">
                    {locale === "fr" ? "PRENONS CONTACT" : "GET IN TOUCH"}
                  </span>
                  <h2>
                    {contactSettings?.[`title_${locale}`] || content.contactTitle}
                  </h2>
                  <p>
                    {contactSettings?.[`description_${locale}`] || content.contactText}
                  </p>
                </div>
                <ContactSection
                  locale={locale}
                  settings={contactSettings}
                  isLoading={isLoadingContactSettings}
                  profileData={profileData}
                />
              </div>
              
              <ContactForm
                locale={locale}
                onSubmitSuccess={() => {
                  notify(
                    locale === "fr"
                      ? "Message envoyé avec succès"
                      : "Message sent successfully"
                  )
                }}
                onSubmitError={({ error}) => {
                  notify(error || "An error occurred")
                }}
              />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-top">
          <div className="brand">
            <span>MK</span>
            <div>
              {profileData.personal.fullName}
              <small>{profileContent.title2} & UI/UX Designer</small>
            </div>
          </div>
          <div className="footer-nav">
            {content.nav.map((x, i) => (
              <button key={x} onClick={() => go(navIds[i])}>
                {x}
              </button>
            ))}
          </div>
          <button className="back-top" onClick={() => go("home")}>
            <Icon name="arrow" />
            {locale === "fr" ? "Retour en haut" : "Back to top"}
          </button>
        </div>
        <div className="footer-bottom">
          <span>
            © 2026 {profileData.personal.fullName}.{" "}
            {locale === "fr" ? "Tous droits réservés." : "All rights reserved."}
          </span>
          <span>
            {locale === "fr"
              ? "Conçu avec précision en Tunisie"
              : "Designed with precision in Tunisia"}
          </span>
        </div>
      </footer>

      {selected && (
        <ProjectModal
          project={selected}
          locale={locale}
          onClose={() => setSelected(null)}
          notify={notify}
        />
      )}
    </div>
  )
}

function ProjectModal({ project, locale, onClose, notify }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxStartIndex, setLightboxStartIndex] = useState(project._lightboxStartIndex || 0)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const t = (value) => value[locale] || value.en || value.fr

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="project-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="modal-hero" style={{ 
          background: project._lightboxImages && project._lightboxImages.length > 0
            ? `url(${project._lightboxImages[0]})` 
            : project.coverImageUrl
              ? `url(${project.coverImageUrl})`
              : project.image,
          backgroundSize: (project._lightboxImages && project._lightboxImages.length > 0) || project.coverImageUrl ? 'cover' : 'auto',
          backgroundPosition: (project._lightboxImages && project._lightboxImages.length > 0) || project.coverImageUrl ? 'center' : 'auto',
          cursor: (project._lightboxImages && project._lightboxImages.length > 0) || project.coverImageUrl ? 'pointer' : 'default'
        }}
        onClick={() => {
          if (project._lightboxImages && project._lightboxImages.length > 0) {
            setLightboxStartIndex(0)
            setLightboxOpen(true)
          }
        }}>
          {!(project._lightboxImages && project._lightboxImages.length > 0) && !project.coverImageUrl && (
            <>
              <div className="fake-browser">
                <i />
                <i />
                <i />
                <span>{project.title}.app</span>
              </div>
              <div className={`mock-screen mock-${project.id % 4}`}>
                <aside />
                <main>
                  <header />
                  <div />
                  <div />
                  <div />
                </main>
              </div>
            </>
          )}
        </div>
        <div className="modal-content">
          <div className="modal-title">
            <div>
              <span>{project.category}</span>
              <h2>{t(project.title)}</h2>
            </div>
            <strong>{project.year || 2026}</strong>
          </div>

          <p className="modal-lead">{t(project.detail)}</p>
          <div className="modal-columns">
            <div>
              <h4>
                {locale === "fr" ? "Objectifs du projet" : "Project objectives"}
              </h4>
              <p>
                {project.detail && t(project.detail)
                  ? t(project.detail)
                  : locale === "fr"
                    ? "Créer une expérience claire et fiable, réduire la complexité des parcours clés et proposer une base technique évolutive."
                    : "Create a clear and reliable experience, reduce complexity in key journeys, and provide a scalable technical foundation."}
              </p>
            </div>
            <div>
              <h4>
                {locale === "fr" ? "Mes responsabilités" : "My responsibilities"}
              </h4>
              <p>{t(project.contribution)}</p>
            </div>
            <div>
              <h4>{locale === "fr" ? "Informations" : "Project info"}</h4>
              <p>
                {project.duration && <div><strong>Durée:</strong> {project.duration}</div>}
                {project.client && <div><strong>Client:</strong> {project.client}</div>}
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <div className="tag-row">
              {project.technologies.map((x) => (
                <span key={x}>
                  <Mark name={x} small />
                  {x}
                </span>
              ))}
            </div>
            <div>
              {project.githubUrl && project.githubUrl.trim() && project.githubUrl !== "#" && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(project.githubUrl, "_blank")}
                  icon="github"
                >
                  GitHub
                </Button>
              )}
              {project.liveUrl && project.liveUrl.trim() && (
                <Button
                  onClick={() => window.open(project.liveUrl, "_blank")}
                  icon="external"
                >
                  Live demo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox viewer for images */}
      {lightboxOpen && (
        <ImageLightbox
          images={project._lightboxImages || []}
          initialIndex={lightboxStartIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}

function AdminLogin({ onLogin, error: initialError }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState(initialError || "")
  const [isLoading, setIsLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { user, session, error: signInError } = await signIn(
        email,
        password
      )

      if (signInError) {
        setError("Email ou mot de passe incorrect.")
        setIsLoading(false)
        return
      }

      if (!user || !session) {
        setError("Erreur lors de la connexion. Veuillez réessayer.")
        setIsLoading(false)
        return
      }

      // Verify admin role
      const { isAdmin, error: adminError } = await checkAdminRole(user.id)

      if (adminError || !isAdmin) {
        setError("Vous n'avez pas accès à l'administration.")
        setIsLoading(false)
        return
      }

      // Success - call onLogin with the user
      onLogin(user)
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.")
      console.error("Login error:", err)
    }

    setIsLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div className="login-brand">
          <span>MK</span>
          <strong>Med Khalil Wendy</strong>
        </div>
        <div>
          <span className="eyebrow">PORTFOLIO CMS</span>
          <h1>
            Créez. Gérez.
            <br />
            <em>Publiez.</em>
          </h1>
          <p>
            Votre espace de gestion centralisé pour un portfolio toujours à
            jour.
          </p>
        </div>
        <div className="login-quote">
          "La simplicité est la sophistication suprême."
          <small>— Léonard de Vinci</small>
        </div>
      </div>
      <div className="login-panel">
        <form onSubmit={submit}>
          <div className="mobile-login-brand">
            <span>MK</span> Portfolio Admin
          </div>
          <span className="login-icon">
            <Icon name="settings" />
          </span>
          <h2>Bienvenue</h2>
          <p>Connectez-vous pour gérer votre portfolio.</p>
          {error && <div className="error-box">{error}</div>}
          <label>
            Adresse email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              disabled={isLoading}
              required
            />
          </label>
          <label>
            Mot de passe
            <div className="password-field">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                disabled={isLoading}
              >
                <Icon name="eye" />
              </button>
            </div>
          </label>
          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked disabled={isLoading} /> Se
              souvenir de moi
            </label>
            <button type="button" disabled={isLoading}>
              Mot de passe oublié ?
            </button>
          </div>
          <Button type="submit" icon="arrow" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </Button>
          <a href="/" className="back-site">
            <Icon name="arrow" /> Retour au portfolio
          </a>
        </form>
      </div>
    </div>
  )
}

function AdminApp({ projects, setProjects, onLogout }) {
  const menu = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "projects", label: "Projets", icon: "briefcase" },
    { id: "experiences", label: "Parcours & Expériences", icon: "file" },
    { id: "skills", label: "Compétences", icon: "code" },
    { id: "profile", label: "Profil & À propos", icon: "users" },
    { id: "services", label: "Services", icon: "layers" },
    { id: "contact", label: "Contact", icon: "mail" },
    { id: "resumes", label: "Gestion des CV", icon: "download" },
    { id: "messages", label: "Messages", icon: "mail" },
    { id: "translations", label: "Traductions", icon: "spark" },
    { id: "settings", label: "Paramètres", icon: "settings" },
  ]

  // Extract page from URL, fallback to dashboard
  const getPageFromUrl = () => {
    const path = window.location.pathname
    const match = path.match(/^\/admin\/(\w+)/)
    const pageId = match ? match[1] : "dashboard"
    // Validate that the page ID exists in menu
    return menu.some((m) => m.id === pageId) ? pageId : "dashboard"
  }

  const [page, setPage] = useState(getPageFromUrl())
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState("")

  const notify = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  const navigate = (id) => {
    setPage(id)
    setDrawer(false)
    window.history.replaceState({}, "", `/admin/${id}`)
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromUrl())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  return (
    <div className={`admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      {toast && <Toast message={toast} />}
      <aside className={drawer ? "drawer-open" : ""}>
        <div className="admin-logo">
          <span>MK</span>
          <div>
            Portfolio<small>Admin CMS</small>
          </div>
          <button onClick={() => setDrawer(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {menu.map((item) => (
            <button
              className={page === item.id ? "active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "messages" && <b>3</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/">
            <Icon name="external" />
            <span>Voir le portfolio</span>
          </a>
          <button onClick={onLogout}>
            <Icon name="logout" />
            <span>Déconnexion</span>
          </button>
          <div className="admin-user">
            <span>MK</span>
            <div>
              <strong>Med Khalil</strong>
              <small>Administrateur</small>
            </div>
          </div>
        </div>
      </aside>
      {drawer && (
        <button className="drawer-backdrop" onClick={() => setDrawer(false)} />
      )}
      <div className="admin-main">
        <header>
          <button
            className="collapse-btn"
            onClick={() =>
              window.innerWidth < 900
                ? setDrawer(true)
                : setCollapsed(!collapsed)
            }
          >
            <Icon name="menu" />
          </button>
          <div className="admin-breadcrumb">
            <span>Portfolio CMS</span>
            <b>/</b>
            <strong>{menu.find((m) => m.id === page)?.label}</strong>
          </div>
          <div className="admin-head-actions">
            <button>
              <Icon name="search" />
            </button>
            <button className="notification">
              <Icon name="mail" />
              <i />
            </button>
            <div className="admin-avatar">MK</div>
          </div>
        </header>
        <div className="admin-content">
          {page === "dashboard" && (
            <Dashboard projects={projects} navigate={navigate} />
          )}
          {page === "projects" && (
            <ProjectsAdmin
              projects={projects}
              setProjects={setProjects}
              notify={notify}
            />
          )}
          {page === "experiences" && (
            <ExperiencesAdmin notify={notify} />
          )}
          {page === "skills" && (
            <SkillsAdmin notify={notify} />
          )}
          {page === "profile" && <ProfileAdmin notify={notify} />}
          {page === "services" && <ServicesAdmin notify={notify} />}
          {page === "contact" && (
            <>
              <AdminTitle
                title="Paramètres de Contact"
                subtitle="Gérez les informations de contact et les paramètres du formulaire."
              />
              <AdminContactSettings notify={notify} />
              <br />
              <AdminTitle
                title="Messages reçus"
                subtitle="Consultez et gérez les messages de contact."
              />
              <AdminContactMessages notify={notify} />
            </>
          )}
          {page === "resumes" && <ResumesAdmin notify={notify} />}
          {page === "messages" && <MessagesAdmin notify={notify} />}
          {page === "translations" && <TranslationsAdmin notify={notify} />}
          {page === "settings" && <SettingsAdmin notify={notify} />}
        </div>
      </div>
    </div>
  )
}

function AdminTitle({ title, subtitle, action }) {
  return (
    <div className="admin-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function Dashboard({ projects, navigate }) {
  const stats = [
    {
      name: "Total projets",
      value: projects.length,
      note: "+2 ce mois",
      icon: "briefcase",
    },
    {
      name: "Projets publiés",
      value: projects.filter((p) => p.status === "Published").length,
      note: "Visibles en ligne",
      icon: "check",
    },
    {
      name: "Compétences",
      value: getSkillStats().total,
      note: `${getSkillStats().categories} catégories`,
      icon: "code",
    },
    { name: "Messages reçus", value: 12, note: "3 non lus", icon: "mail" },
  ]
  const cats = ["Web Development", "UI/UX Design", "WordPress"]

  return (
    <>
      <AdminTitle
        title="Bonjour, Khalil"
        subtitle="Voici ce qui se passe sur votre portfolio aujourd'hui."
        action={
          <Button onClick={() => navigate("projects")} icon="plus">
            Nouveau projet
          </Button>
        }
      />
      <div className="stat-grid">
        {stats.map((s) => (
          <article key={s.name}>
            <div className="stat-top">
              <span>
                <Icon name={s.icon} />
              </span>
              <small>{s.note}</small>
            </div>
            <strong>{s.value}</strong>
            <p>{s.name}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <article className="admin-card chart-card">
          <div className="card-head">
            <div>
              <h3>Projets par catégorie</h3>
              <p>Répartition du contenu publié</p>
            </div>
            <button>Cette année</button>
          </div>
          <div className="bar-chart">
            {cats.map((c, i) => {
              const count = projects.filter((p) => p.category === c).length
              return (
                <div key={c}>
                  <span>{c}</span>
                  <div>
                    <i style={{ width: `${Math.max(22, count * 15)}%` }} />
                  </div>
                  <b>{count}</b>
                </div>
              )
            })}
          </div>
          <div className="views">
            <div>
              <span>Vues du portfolio</span>
              <strong>2,481</strong>
              <small>+18.2% ce mois</small>
            </div>
            <svg viewBox="0 0 280 70">
              <path d="M2 63 C30 58,35 38,62 45 S100 65,125 35 S160 50,180 26 S220 30,278 5" />
              <path
                className="fill"
                d="M2 63 C30 58,35 38,62 45 S100 65,125 35 S160 50,180 26 S220 30,278 5 V70 H2Z"
              />
            </svg>
          </div>
        </article>
        <article className="admin-card activity-card">
          <div className="card-head">
            <div>
              <h3>Activité récente</h3>
              <p>Dernières modifications</p>
            </div>
            <button>Tout voir</button>
          </div>
          {[
            {
              a: "Projet publié",
              b: "Slikoo — Detective Marketplace",
              t: "Il y a 2h",
            },
            {
              a: "Nouveau message",
              b: "Sophie Martin — NovaLab",
              t: "Il y a 5h",
            },
            { a: "Profil mis à jour", b: "Description Hero FR", t: "Hier" },
            { a: "Projet modifié", b: "MindLog AI", t: "Il y a 2j" },
          ].map((x, i) => (
            <div className="activity" key={x.b}>
              <span>
                <Icon name={i === 1 ? "mail" : i === 2 ? "users" : "edit"} />
              </span>
              <div>
                <strong>{x.a}</strong>
                <p>{x.b}</p>
              </div>
              <small>{x.t}</small>
            </div>
          ))}
        </article>
      </div>
      <div className="dashboard-grid lower">
        <article className="admin-card recent-projects">
          <div className="card-head">
            <div>
              <h3>Derniers projets</h3>
              <p>Vos ajouts les plus récents</p>
            </div>
            <button onClick={() => navigate("projects")}>
              Gérer les projets
            </button>
          </div>
          {projects.slice(0, 4).map((p) => (
            <div key={p.id}>
              <span className="project-mini" style={{ background: p.image }}>
                {p.title.slice(0, 1)}
              </span>
              <div>
                <strong>{p.title}</strong>
                <small>{p.category}</small>
              </div>
              <span className={`status ${p.status.toLowerCase()}`}>
                {p.status}
              </span>
              <small>2026</small>
              <button>
                <Icon name="arrow" />
              </button>
            </div>
          ))}
        </article>
        <article className="admin-card quick-actions">
          <div className="card-head">
            <div>
              <h3>Actions rapides</h3>
              <p>Accès aux tâches fréquentes</p>
            </div>
          </div>
          <button onClick={() => navigate("projects")}>
            <span>
              <Icon name="plus" />
            </span>
            <div>
              <strong>Ajouter un projet</strong>
              <small>Créer une nouvelle réalisation</small>
            </div>
            <Icon name="arrow" />
          </button>
          <button onClick={() => navigate("profile")}>
            <span>
              <Icon name="users" />
            </span>
            <div>
              <strong>Modifier le profil</strong>
              <small>Mettre à jour vos informations</small>
            </div>
            <Icon name="arrow" />
          </button>
          <button onClick={() => navigate("messages")}>
            <span>
              <Icon name="mail" />
            </span>
            <div>
              <strong>Voir les messages</strong>
              <small>3 messages non lus</small>
            </div>
            <Icon name="arrow" />
          </button>
        </article>
      </div>
    </>
  )
}

function ProjectsAdmin({ projects, setProjects, notify }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Toutes")
  const [status, setStatus] = useState("Tous")
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) &&
      (category === "Toutes" || p.category === category) &&
      (status === "Tous" || p.status === status),
  )

  const save = async (project) => {
    try {
      if (editing === "new") {
        await createProject(project)
      } else {
        await updateProject(project.id, project)
      }
      // Trigger refresh in App component
      setProjects()
      setEditing(null)
      notify(
        editing === "new" ? "Projet ajouté avec succès" : "Projet mis à jour",
      )
    } catch (error) {
      notify(`Erreur: ${error.message}`)
    }
  }

  return (
    <>
      <AdminTitle
        title="Projets"
        subtitle={`${projects.length} projets au total · ${projects.filter((p) => p.status === "Published").length} publiés`}
        action={
          <Button onClick={() => setEditing("new")} icon="plus">
            Ajouter un projet
          </Button>
        }
      />
      <div className="admin-card table-card">
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Toutes</option>
            <option>Web Development</option>
            <option>UI/UX Design</option>
            <option>WordPress</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Tous</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Projet</th>
                <th>Catégorie</th>
                <th>Technologies</th>
                <th>Statut</th>
                <th>Ordre</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="project-cell">
                      <span style={{ background: p.image }}>
                        {p.title.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{p.title}</strong>
                        <small>
                          {p.featured
                            ? "Projet mis en avant"
                            : "Projet standard"}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    <div className="mini-tags">
                      {p.technologies.slice(0, 3).map((x) => (
                        <span key={x}>{x}</span>
                      ))}
                      {p.technologies.length > 3 && (
                        <span>+{p.technologies.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`status ${p.status.toLowerCase()}`}
                      onClick={async () => {
                        try {
                          await toggleProjectStatus(p.id)
                          setProjects()
                          notify(
                            p.status === "Published"
                              ? "Projet dépublié"
                              : "Projet publié",
                          )
                        } catch (error) {
                          notify(`Erreur: ${error.message}`)
                        }
                      }}
                    >
                      {p.status}
                    </button>
                  </td>
                  <td>#{p.displayOrder}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="Prévisualiser"
                        onClick={() =>
                          notify("Aperçu ouvert dans le portfolio")
                        }
                      >
                        <Icon name="eye" />
                      </button>
                      <button title="Modifier" onClick={() => setEditing(p)}>
                        <Icon name="edit" />
                      </button>
                      <button title="Supprimer" onClick={() => setDeleting(p)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Icon name="search" size={30} />
              <h3>Aucun projet trouvé</h3>
              <p>Essayez de modifier votre recherche ou vos filtres.</p>
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            Affichage de 1 à {filtered.length} sur {filtered.length}
          </span>
          <div>
            <button disabled>Précédent</button>
            <button className="active">1</button>
            <button disabled>Suivant</button>
          </div>
        </div>
      </div>
      {editing && (
        <ProjectEditor
          key={editing === "new" ? "new" : editing.id}
          project={editing === "new" ? null : editing}
          nextId={Math.max(...projects.map((p) => p.id)) + 1}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <Confirm
          title={`Supprimer "${deleting.title}" ?`}
          text="Cette action retirera le projet du portfolio. Elle est irréversible dans ce prototype."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteProject(deleting.id)
              setProjects()
              setDeleting(null)
              notify("Projet supprimé")
            } catch (error) {
              notify(`Erreur: ${error.message}`)
            }
          }}
        />
      )}
    </>
  )
}

function ProjectEditor({ project, nextId, onClose, onSave }) {
  // Create a safe default form with all required bilingual fields
  const SAFE_DEFAULT_FORM = {
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

  const [form, setForm] = useState(SAFE_DEFAULT_FORM)
  const [errors, setErrors] = useState({})

  // Initialize form from project prop (Edit mode) or use default (Add mode)
  useEffect(() => {
    if (project) {
      // Edit mode: sync form to existing project
      const migratedProject = {
        ...project,
        screenshots: project.screenshots && project.screenshots.length > 0 
          ? project.screenshots 
          : (project.coverImageUrl && !project.coverImageUrl.startsWith('linear-gradient') ? [project.coverImageUrl] : []),
        coverImageUrl: ""
      }
      setForm(migratedProject)
    } else {
      // Add mode: reset to default
      setForm(SAFE_DEFAULT_FORM)
    }
  }, [project, nextId])

  const set = (key, value) => {
    setForm(prevForm => {
      return { ...prevForm, [key]: value }
    })
    // Clear error for this field when modified
    setErrors(prevErrors => {
      if (prevErrors[key]) {
        return { ...prevErrors, [key]: null }
      }
      return prevErrors
    })
  }

  const setNested = (parent, key, value) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        [parent]: {
          ...prevForm[parent],
          [key]: value,
        },
      }
    })
    // Clear error for this field when modified
    setErrors(prevErrors => {
      const errorKey = `${parent}.${key}`
      if (prevErrors[errorKey]) {
        return { ...prevErrors, [errorKey]: null }
      }
      return prevErrors
    })
  }

  const validateForm = () => {
    const newErrors = {}

    // Validate required fields
    if (!form.title?.trim()) {
      newErrors.title = "Titre FR obligatoire"
    }
    if (!form.titleEn?.trim()) {
      newErrors.titleEn = "Titre EN obligatoire"
    }
    if (!form.description?.fr?.trim()) {
      newErrors["description.fr"] = "Description FR obligatoire"
    }
    if (!form.description?.en?.trim()) {
      newErrors["description.en"] = "Description EN obligatoire"
    }
    if (!form.category?.trim()) {
      newErrors.category = "Catégorie obligatoire"
    }
    if (!form.technologies?.length) {
      newErrors.technologies = "Au moins une technologie requise"
    }

    // Validate year if provided
    if (form.year && (isNaN(form.year) || form.year < 2000 || form.year > 2099)) {
      newErrors.year = "Année invalide (2000-2099)"
    }

    // Validate URLs if provided
    if (form.githubUrl?.trim() && !isValidUrl(form.githubUrl)) {
      newErrors.githubUrl = "URL GitHub invalide"
    }
    if (form.liveUrl?.trim() && !isValidUrl(form.liveUrl)) {
      newErrors.liveUrl = "URL Live Demo invalide"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(form)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="editor-modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="editor-head">
          <div>
            <small>{project ? "MODIFICATION" : "NOUVEAU CONTENU"}</small>
            <h2>{project ? project.title : "Ajouter un projet"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="editor-body">
          <div className="form-section">
            <h3>Informations générales</h3>
            <div className="field-row">
              <label>
                Nom du projet FR
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Nom du projet FR"
                />
                {errors.title && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.title}</span>
                )}
              </label>
              <label>
                Nom du projet EN
                <input
                  value={form.titleEn}
                  onChange={(e) => set("titleEn", e.target.value)}
                  placeholder="Nom du projet EN"
                />
                {errors.titleEn && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.titleEn}</span>
                )}
              </label>
            </div>
            <div className="field-row">
              <label>
                Catégorie
                <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                  <option>Web Development</option>
                  <option>UI/UX Design</option>
                  <option>WordPress</option>
                </select>
                {errors.category && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.category}</span>
                )}
              </label>
              <label>
                Année
                <input
                  type="number"
                  min="2000"
                  max="2099"
                  value={form.year}
                  onChange={(e) => set("year", Number(e.target.value))}
                />
                {errors.year && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.year}</span>
                )}
              </label>
            </div>
            <div className="field-row">
              <label>
                Statut
                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option>Draft</option>
                  <option>Published</option>
                </select>
              </label>
              <label>
                Ordre d'affichage
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => set("displayOrder", Number(e.target.value))}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Durée (optionnel)
                <input
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="Ex: 3 mois, Ongoing"
                />
              </label>
              <label>
                Client (optionnel)
                <input
                  value={form.client}
                  onChange={(e) => set("client", e.target.value)}
                  placeholder="Nom du client"
                />
              </label>
            </div>
            <label className="check-line">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Mettre ce projet en avant
            </label>
          </div>

          <div className="form-section">
            <h3>Images du projet</h3>
            <label>
              Images et ordre (glissez les images ou utilisez les boutons ↑↓)
              <div style={{ marginBottom: '1rem' }}>
                {form.screenshots && form.screenshots.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '12px',
                    marginBottom: '1rem'
                  }}>
                    {form.screenshots.map((screenshot, idx) => {
                      const url = typeof screenshot === 'string' ? screenshot : screenshot.url
                      if (!url) return null
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '6px',
                            aspectRatio: '1 / 1',
                            background: '#202024',
                            border: idx === 0 ? '2px solid var(--purple)' : '1px solid #3a3a40'
                          }}
                        >
                          <img
                            src={url}
                            alt={`Image ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          {idx === 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              background: 'var(--purple)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              PRINCIPALE
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            right: '2px',
                            display: 'flex',
                            gap: '2px',
                            justifyContent: 'center'
                          }}>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...form.screenshots]
                                  [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
                                  set('screenshots', updated)
                                }}
                                title="Déplacer vers le haut"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  background: 'rgba(0,0,0,0.7)',
                                  border: 'none',
                                  borderRadius: '3px',
                                  color: 'white',
                                  fontSize: '12px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                ↑
                              </button>
                            )}
                            {idx < form.screenshots.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...form.screenshots]
                                  [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]]
                                  set('screenshots', updated)
                                }}
                                title="Déplacer vers le bas"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  background: 'rgba(0,0,0,0.7)',
                                  border: 'none',
                                  borderRadius: '3px',
                                  color: 'white',
                                  fontSize: '12px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                ↓
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = form.screenshots.filter((_, i) => i !== idx)
                                set('screenshots', updated)
                                try {
                                  const { deleteProjectImage } = require('./services/imageService.js')
                                  if (url && !url.startsWith('linear-gradient')) {
                                    deleteProjectImage(url).catch(err => console.warn('Delete partial:', err))
                                  }
                                } catch (err) {
                                  console.warn('Cleanup error:', err)
                                }
                              }}
                              title="Supprimer"
                              style={{
                                width: '24px',
                                height: '24px',
                                background: '#b4232f',
                                border: 'none',
                                borderRadius: '3px',
                                color: 'white',
                                fontSize: '12px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  try {
                    const { validateImageFile, uploadProjectScreenshot } = await import('./services/imageService.js')
                    const newImages = [...(form.screenshots || [])]
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i]
                      const validation = validateImageFile(file)
                      if (!validation.valid) {
                        setErrors(prev => ({ ...prev, images: validation.error }))
                        continue
                      }
                      const { url, error } = await uploadProjectScreenshot(form.id || 'new', file, i)
                      if (error) {
                        setErrors(prev => ({ ...prev, images: error }))
                      } else if (url) {
                        newImages.push(url)
                      }
                    }
                    set('screenshots', newImages)
                    setErrors(prev => ({ ...prev, images: null }))
                  } catch (err) {
                    setErrors(prev => ({ ...prev, images: `Erreur: ${err.message}` }))
                  }
                }}
              />
              {errors.images && (
                <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.images}</span>
              )}
              <small>Sélectionnez un ou plusieurs fichiers JPG, PNG ou WEBP, maximum 10 MB chacun. La première image est utilisée dans le carrousel du project.</small>
            </label>
          </div>

          <div className="form-section">
            <h3>Contenu bilingue</h3>
            <div className="field-row">
              <label>
                Description FR
                <textarea
                  rows={3}
                  value={form.description.fr}
                  onChange={(e) => setNested("description", "fr", e.target.value)}
                />
                {errors["description.fr"] && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>
                    {errors["description.fr"]}
                  </span>
                )}
              </label>
              <label>
                Description EN
                <textarea
                  rows={3}
                  value={form.description.en}
                  onChange={(e) => setNested("description", "en", e.target.value)}
                />
                {errors["description.en"] && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>
                    {errors["description.en"]}
                  </span>
                )}
              </label>
            </div>
            <div className="field-row">
              <label>
                Détails du projet FR
                <textarea
                  rows={4}
                  value={form.detail.fr}
                  onChange={(e) => setNested("detail", "fr", e.target.value)}
                />
              </label>
              <label>
                Détails du projet EN
                <textarea
                  rows={4}
                  value={form.detail.en}
                  onChange={(e) => setNested("detail", "en", e.target.value)}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Contributions FR
                <textarea
                  rows={3}
                  value={form.contribution.fr}
                  onChange={(e) => setNested("contribution", "fr", e.target.value)}
                />
              </label>
              <label>
                Contributions EN
                <textarea
                  rows={3}
                  value={form.contribution.en}
                  onChange={(e) => setNested("contribution", "en", e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Technologies & liens</h3>
            <label>
              Technologies
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px',
                background: '#101012',
                border: '1px solid var(--line)',
                borderRadius: '7px',
                minHeight: '44px',
                alignItems: 'flex-start',
                alignContent: 'flex-start'
              }}>
                {form.technologies.map((tech, idx) => (
                  <div key={idx} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#d1d1d8',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {tech}
                    <button
                      type="button"
                      onClick={() => {
                        set('technologies', form.technologies.filter((_, i) => i !== idx))
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '14px',
                        lineHeight: '1'
                      }}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                      e.preventDefault()
                      const value = e.target.value.trim()
                      if (value && !form.technologies.includes(value)) {
                        set('technologies', [...form.technologies, value])
                        e.target.value = ''
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    if (value && !form.technologies.includes(value)) {
                      set('technologies', [...form.technologies, value])
                      e.target.value = ''
                    }
                  }}
                  placeholder={form.technologies.length === 0 ? "Tapez une technologie et appuyez sur Entrée" : ""}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    flex: 1,
                    minWidth: '120px',
                    padding: '0'
                  }}
                />
              </div>
              {errors.technologies && (
                <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.technologies}</span>
              )}
            </label>
            <div className="field-row">
              <label>
                GitHub URL (optionnel)
                <input
                  value={form.githubUrl}
                  onChange={(e) => set("githubUrl", e.target.value)}
                  placeholder="https://github.com/..."
                />
                {errors.githubUrl && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.githubUrl}</span>
                )}
              </label>
              <label>
                Live Demo URL (optionnel)
                <input
                  value={form.liveUrl}
                  onChange={(e) => set("liveUrl", e.target.value)}
                  placeholder="https://..."
                />
                {errors.liveUrl && (
                  <span style={{ color: "red", fontSize: "0.875rem" }}>{errors.liveUrl}</span>
                )}
              </label>
            </div>
          </div>
        </div>
        <div className="editor-actions">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" icon="check">
            Enregistrer le projet
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function Confirm({ title, text, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-modal">
        <span>
          <Icon name="trash" />
        </span>
        <h3>{title}</h3>
        <p>{text}</p>
        <div>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  )
}

function SkillsAdmin({ notify }) {
  const [skills, setSkills] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Toutes")
  const [status, setStatus] = useState("Tous")
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize skills with Realtime sync
  useEffect(() => {
    let unsubscribe = null
    
    const setupSkills = async () => {
      try {
        setIsLoading(true)
        
        // Initialize with Realtime subscription
        unsubscribe = await initializeSkillsWithRealtime((skills) => {
          setSkills(skills)
          setIsLoading(false)
        })
        
        // Load categories
        const cats = await getCategoryNames()
        setCategories(cats)
      } catch (error) {
        console.error("Error setting up skills admin:", error)
        notify(`Erreur: ${error.message}`)
        setIsLoading(false)
      }
    }
    
    setupSkills()
    
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [notify])

  const categoryOptions = ["Toutes", ...categories]

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === "Toutes" || s.category === category) &&
      (status === "Tous" || s.status === status),
  )

  const save = async (skill) => {
    try {
      if (editing === "new") {
        await createSkill(skill)
        notify("Compétence ajoutée avec succès")
      } else {
        await updateSkill(skill.id, skill)
        notify("Compétence mise à jour")
      }
      setEditing(null)
      // Skills will update automatically via Realtime subscription
    } catch (error) {
      notify(`Erreur: ${error.message}`)
    }
  }

  return (
    <>
      <AdminTitle
        title="Compétences"
        subtitle={`${skills.length} compétences au total · ${skills.filter((s) => s.status === "Published").length} publiées`}
        action={
          <Button onClick={() => setEditing("new")} icon="plus">
            Ajouter une compétence
          </Button>
        }
      />
      <div className="admin-card table-card">
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Rechercher une compétence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Tous</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Compétence</th>
                <th>Catégorie</th>
                <th>Niveau</th>
                <th>Statut</th>
                <th>Mis en avant</th>
                <th>Ordre</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.category}</td>
                  <td>{s.level}</td>
                  <td>
                    <button
                      className={`status ${s.status.toLowerCase()}`}
                      onClick={async () => {
                        try {
                          await toggleSkillStatus(s.id)
                          notify(
                            s.status === "Published"
                              ? "Compétence dépubliée"
                              : "Compétence publiée",
                          )
                        } catch (error) {
                          notify(`Erreur: ${error.message}`)
                        }
                      }}
                    >
                      {s.status}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`status ${s.featured ? "featured" : "not-featured"}`}
                      onClick={async () => {
                        try {
                          await toggleSkillFeatured(s.id)
                          notify(
                            s.featured ? "Retiré des mis en avant" : "Ajouté aux mis en avant",
                          )
                        } catch (error) {
                          notify(`Erreur: ${error.message}`)
                        }
                      }}
                    >
                      {s.featured ? "Oui" : "Non"}
                    </button>
                  </td>
                  <td>#{s.displayOrder}</td>
                  <td>
                    <div className="row-actions">
                      <button title="Modifier" onClick={() => setEditing(s)}>
                        <Icon name="edit" />
                      </button>
                      <button title="Supprimer" onClick={() => setDeleting(s)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Icon name="search" size={30} />
              <h3>Aucune compétence trouvée</h3>
              <p>Essayez de modifier votre recherche ou vos filtres.</p>
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            Affichage de 1 à {filtered.length} sur {filtered.length}
          </span>
          <div>
            <button disabled>Précédent</button>
            <button className="active">1</button>
            <button disabled>Suivant</button>
          </div>
        </div>
      </div>
      {editing && (
        <SkillEditor
          skill={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <Confirm
          title={`Supprimer "${deleting.name}" ?`}
          text="Cette action retirera la compétence du portfolio. Elle est irréversible."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteSkill(deleting.id)
              setDeleting(null)
              notify("Compétence supprimée")
            } catch (error) {
              notify(`Erreur: ${error.message}`)
            }
          }}
        />
      )}
    </>
  )
}

function SkillEditor({ skill, onClose, onSave }) {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const levels = getProficiencyLevels()
  const [maxId, setMaxId] = useState(0)
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await getCategoryNames()
        setCategories(cats)
        
        const allSkills = await getSkills()
        const max = Math.max(...(allSkills.map((s) => s.id) || [0]))
        setMaxId(max)
      } catch (error) {
        console.error("Error loading editor data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])
  
  const base = skill || getDefaultSkill(maxId + 1)
  const [form, setForm] = useState(base)
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm({ ...form, [key]: value })
    // Clear error for this field when modified
    if (errors[key]) {
      setErrors({ ...errors, [key]: null })
    }
  }

  const setNested = (parent, key, value) => {
    setForm({
      ...form,
      [parent]: {
        ...form[parent],
        [key]: value,
      },
    })
    const errorKey = `${parent}.${key}`
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: null })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Validate required fields
    if (!form.name?.trim()) {
      newErrors.name = "Nom de compétence obligatoire"
    }
    if (!form.category?.trim()) {
      newErrors.category = "Catégorie obligatoire"
    }
    if (!form.description?.fr?.trim()) {
      newErrors["description.fr"] = "Description FR obligatoire"
    }
    if (!form.description?.en?.trim()) {
      newErrors["description.en"] = "Description EN obligatoire"
    }

    return newErrors
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    try {
      await onSave(form)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={isSaving}
        >
          <Icon name="close" />
        </button>
        
        <div className="skill-editor-header">
          <div className="skill-editor-title">
            <h2>{skill ? "Modifier la compétence" : "Ajouter une compétence"}</h2>
            <p>{skill ? "Mettez à jour les détails de cette compétence." : "Ajoutez une nouvelle compétence à votre portfolio."}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="skill-editor-form">
          <div className="skill-editor-content">
            {/* Informations générales */}
            <section className="skill-form-section">
              <h3>Informations générales</h3>
              
              <div className="form-field">
                <label htmlFor="skill-name">
                  Nom de la compétence <span className="required">*</span>
                </label>
                <input
                  id="skill-name"
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ex: React, JavaScript, TypeScript..."
                  className={`form-input ${errors.name ? "has-error" : ""}`}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="skill-category">
                    Catégorie <span className="required">*</span>
                  </label>
                  <select
                    id="skill-category"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={`form-input ${errors.category ? "has-error" : ""}`}
                  >
                    <option value="">Sélectionner une catégorie...</option>
                    {categories.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <span className="form-error">{errors.category}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="skill-level">
                    Niveau de maîtrise
                  </label>
                  <select
                    id="skill-level"
                    value={form.level}
                    onChange={(e) => set("level", parseInt(e.target.value))}
                    className="form-input"
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>{level}/5</option>
                    ))}
                  </select>
                </div>

                {form.name && (
                  <div className="form-field icon-preview-field">
                    <label>Aperçu de l'icône</label>
                    <IconDisplay 
                      iconId={getIconForSkill(form.name)} 
                      skillName={form.name} 
                      size="sm"
                    />
                  </div>
                )}
              </div>

              <div className="form-field checkbox-field">
                <label htmlFor="skill-featured" className="checkbox-label">
                  <input
                    id="skill-featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => set("featured", e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Mettre en avant cette compétence sur la page d'accueil</span>
                </label>
              </div>
            </section>

            {/* Descriptions bilingues */}
            <section className="skill-form-section">
              <h3>Descriptions bilingues</h3>
              
              <div className="form-field">
                <label htmlFor="skill-desc-fr">
                  Description FR <span className="required">*</span>
                </label>
                <textarea
                  id="skill-desc-fr"
                  value={form.description?.fr || ""}
                  onChange={(e) => setNested("description", "fr", e.target.value)}
                  placeholder="Décrivez cette compétence en français..."
                  rows={4}
                  className={`form-input ${errors["description.fr"] ? "has-error" : ""}`}
                />
                {errors["description.fr"] && (
                  <span className="form-error">{errors["description.fr"]}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="skill-desc-en">
                  Description EN <span className="required">*</span>
                </label>
                <textarea
                  id="skill-desc-en"
                  value={form.description?.en || ""}
                  onChange={(e) => setNested("description", "en", e.target.value)}
                  placeholder="Describe this skill in English..."
                  rows={4}
                  className={`form-input ${errors["description.en"] ? "has-error" : ""}`}
                />
                {errors["description.en"] && (
                  <span className="form-error">{errors["description.en"]}</span>
                )}
              </div>
            </section>

            {/* Statut */}
            <section className="skill-form-section">
              <h3>Statut de publication</h3>
              
              <div className="form-field">
                <label htmlFor="skill-status">
                  Statut
                </label>
                <select
                  id="skill-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="form-input"
                >
                  <option value="Draft">Brouillon (non visible au public)</option>
                  <option value="Published">Publié (visible au public)</option>
                </select>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="skill-editor-footer">
            <Button 
              variant="ghost" 
              onClick={onClose}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Icon name="check" />
                  {skill ? "Mise à jour..." : "Ajout..."}
                </>
              ) : (
                skill ? "Mettre à jour" : "Ajouter la compétence"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
function ProfileAdmin({ notify }) {
  // Get current profile data
  const profileData = getProfile()
  
  // Form state - initialize from profile service
  const [form, setForm] = useState({
    fullName: profileData.personal.fullName,
    email: profileData.personal.email,
    phone: profileData.personal.phone,
    location: profileData.personal.location,
    heroLabelFr: profileData.content.fr.label || 'PORTFOLIO 2026',
    heroLabelEn: profileData.content.en.label || 'PORTFOLIO 2026',
    heroGreetingFr: profileData.content.fr.greeting || 'Bonjour, je suis',
    heroGreetingEn: profileData.content.en.greeting || 'Hello, I am',
    titleFr: profileData.content.fr.title,
    titleEn: profileData.content.en.title,
    heroBioFr: profileData.content.fr.hero,
    heroBioEn: profileData.content.en.hero,
    aboutFr: profileData.content.fr.about,
    aboutEn: profileData.content.en.about,
    availableFr: profileData.content.fr.available,
    availableEn: profileData.content.en.available,
    github: profileData.social.github,
    linkedin: profileData.social.linkedin,
    availability: profileData.availability,
    photo: profileData.personal.photo,
    previewPhoto: null,
  })

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false)
  
  // Validation errors
  const [errors, setErrors] = useState({})

  // Handle text input changes
  const handleInputChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }))
    setIsDirty(true)
    // Clear error for this field when user modifies it
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }))
    }
  }

  // Handle checkbox change
  const handleCheckboxChange = (checked) => {
    setForm(prev => ({
      ...prev,
      availability: checked,
    }))
    setIsDirty(true)
  }

  // Handle photo file selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        photo: "Format non accepté. Accepté : JPG, JPEG, PNG, WEBP",
      }))
      return
    }

    // Validate file size (5 MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        photo: "Fichier trop volumineux. Maximum 5 MB.",
      }))
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setForm(prev => ({
        ...prev,
        previewPhoto: event.target.result,
      }))
      setIsDirty(true)
      setErrors(prev => ({
        ...prev,
        photo: null,
      }))
    }
    reader.readAsDataURL(file)
  }

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate URL format
  const isValidUrl = (url) => {
    if (!url || url.trim() === '') return true // Optional field
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!form.fullName.trim()) {
      newErrors.fullName = "Le nom complet est obligatoire"
    }

    if (!form.email.trim()) {
      newErrors.email = "L'email est obligatoire"
    } else if (!isValidEmail(form.email)) {
      newErrors.email = "Format email invalide"
    }

    if (!form.location.trim()) {
      newErrors.location = "La localisation est obligatoire"
    }

    if (!form.titleFr.trim()) {
      newErrors.titleFr = "Le titre professionnel FR est obligatoire"
    }

    if (!form.titleEn.trim()) {
      newErrors.titleEn = "Le titre professionnel EN est obligatoire"
    }

    if (form.github && !isValidUrl(form.github)) {
      newErrors.github = "URL GitHub invalide"
    }

    if (form.linkedin && !isValidUrl(form.linkedin)) {
      newErrors.linkedin = "URL LinkedIn invalide"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate form
    if (!validateForm()) {
      notify("Veuillez corriger les erreurs du formulaire")
      return
    }

    // Update profile in service
    updateProfile({
      personal: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        location: form.location,
        photo: form.photo,
      },
      content: {
        fr: {
          label: form.heroLabelFr,
          greeting: form.heroGreetingFr,
          title: form.titleFr,
          hero: form.heroBioFr,
          about: form.aboutFr,
          available: form.availableFr,
        },
        en: {
          label: form.heroLabelEn,
          greeting: form.heroGreetingEn,
          title: form.titleEn,
          hero: form.heroBioEn,
          about: form.aboutEn,
          available: form.availableEn,
        },
      },
      social: {
        github: form.github || '',
        linkedin: form.linkedin || '',
      },
      availability: form.availability,
    })

    setIsDirty(false)

    // Save profile to Supabase
    const saveProfile = async () => {
      try {
        const { saveProfileToDatabase } = await import('./services/profileService.js')
        await saveProfileToDatabase(getProfile())
        notify("Profil sauvegardé avec succès")
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error)
        notify("Erreur lors de la sauvegarde du profil")
      }
    }
    saveProfile()
  }

  // Handle cancel
  const handleCancel = () => {
    // Reset form to current profile data
    const current = getProfile()
    setForm({
      fullName: current.personal.fullName,
      email: current.personal.email,
      phone: current.personal.phone,
      location: current.personal.location,
      heroLabelFr: current.content.fr.label || "",
      heroLabelEn: current.content.en.label || "",
      heroGreetingFr: current.content.fr.greeting || "",
      heroGreetingEn: current.content.en.greeting || "",
      titleFr: current.content.fr.title,
      titleEn: current.content.en.title,
      heroBioFr: current.content.fr.hero,
      heroBioEn: current.content.en.hero,
      aboutFr: current.content.fr.about,
      aboutEn: current.content.en.about,
      availableFr: current.content.fr.available,
      availableEn: current.content.en.available,
      github: current.social.github,
      linkedin: current.social.linkedin,
      availability: current.availability,
      photo: current.personal.photo,
      previewPhoto: null,
    })
    setIsDirty(false)
    setErrors({})
  }

  const currentPhoto = form.previewPhoto || form.photo

  return (
    <>
      <AdminTitle
        title="Profil & À propos"
        subtitle="Gérez vos informations personnelles et les contenus du Hero."
      />
      <form
        className="admin-card settings-form"
        onSubmit={handleSubmit}
      >
        {/* Photo de profil */}
        <div className="profile-photo-row">
          <img src={currentPhoto} alt="Profile" />
          <div>
            <h3>Photo de profil</h3>
            <p>PNG ou JPG, format portrait recommandé.</p>
            <label>
              <Button variant="secondary" icon="edit" type="button" onClick={() => document.querySelector('input[type="file"]').click()}>
                Remplacer la photo
              </Button>
              <input 
                type="file" 
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </label>
            {errors.photo && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.photo}</span>}
            {form.previewPhoto && <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>Aperçu de la nouvelle photo</small>}
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="settings-section">
          <h3>Informations personnelles</h3>
          <div className="field-row">
            <label>
              Nom complet
              <input 
                value={form.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
              />
              {errors.fullName && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.fullName}</span>}
            </label>
            <label>
              Localisation
              <input 
                value={form.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
              {errors.location && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.location}</span>}
            </label>
          </div>
          <div className="field-row">
            <label>
              Email
              <input 
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              {errors.email && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.email}</span>}
            </label>
            <label>
              Téléphone
              <input 
                value={form.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Contenu bilingue - Hero */}
        <div className="settings-section">
          <h3>Contenu Hero (bilingue)</h3>
          
          <div className="field-row">
            <label>
              Label Portfolio FR
              <input 
                value={form.heroLabelFr}
                onChange={(e) => handleInputChange('heroLabelFr', e.target.value)}
                placeholder="ex: PORTFOLIO 2026"
              />
            </label>
            <label>
              Portfolio Label EN
              <input 
                value={form.heroLabelEn}
                onChange={(e) => handleInputChange('heroLabelEn', e.target.value)}
                placeholder="ex: PORTFOLIO 2026"
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Salutation FR
              <input 
                value={form.heroGreetingFr}
                onChange={(e) => handleInputChange('heroGreetingFr', e.target.value)}
                placeholder="ex: Bonjour, je suis"
              />
            </label>
            <label>
              Greeting EN
              <input 
                value={form.heroGreetingEn}
                onChange={(e) => handleInputChange('heroGreetingEn', e.target.value)}
                placeholder="ex: Hello, I am"
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Titre professionnel FR
              <input 
                value={form.titleFr}
                onChange={(e) => handleInputChange('titleFr', e.target.value)}
              />
              {errors.titleFr && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.titleFr}</span>}
            </label>
            <label>
              Professional Title EN
              <input 
                value={form.titleEn}
                onChange={(e) => handleInputChange('titleEn', e.target.value)}
              />
              {errors.titleEn && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.titleEn}</span>}
            </label>
          </div>
          <div className="field-row">
            <label>
              Description Hero FR
              <textarea
                rows={3}
                value={form.heroBioFr}
                onChange={(e) => handleInputChange('heroBioFr', e.target.value)}
              />
            </label>
            <label>
              Description Hero EN
              <textarea
                rows={3}
                value={form.heroBioEn}
                onChange={(e) => handleInputChange('heroBioEn', e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Contenu bilingue - About */}
        <div className="settings-section">
          <h3>Contenu About (bilingue)</h3>
          <div className="field-row">
            <label>
              Bio FR
              <textarea
                rows={5}
                value={form.aboutFr}
                onChange={(e) => handleInputChange('aboutFr', e.target.value)}
              />
            </label>
            <label>
              Bio EN
              <textarea
                rows={5}
                value={form.aboutEn}
                onChange={(e) => handleInputChange('aboutEn', e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Disponibilité */}
        <div className="settings-section">
          <h3>Disponibilité</h3>
          <label className="check-line">
            <input 
              type="checkbox"
              checked={form.availability}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
            />
            Afficher le statut "À la recherche d'opportunités"
          </label>
          {form.availability && (
            <>
              <label style={{ marginTop: '1rem' }}>
                Texte de disponibilité FR
                <input 
                  value={form.availableFr}
                  onChange={(e) => handleInputChange('availableFr', e.target.value)}
                />
              </label>
              <label style={{ marginTop: '1rem' }}>
                Disponibilité Text EN
                <input 
                  value={form.availableEn}
                  onChange={(e) => handleInputChange('availableEn', e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        {/* Liens sociaux */}
        <div className="settings-section">
          <h3>Liens & Réseaux</h3>
          <div className="field-row">
            <label>
              GitHub
              <input 
                type="url"
                placeholder="https://github.com/..."
                value={form.github}
                onChange={(e) => handleInputChange('github', e.target.value)}
              />
              {errors.github && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.github}</span>}
            </label>
            <label>
              LinkedIn
              <input 
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
              />
              {errors.linkedin && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.linkedin}</span>}
            </label>
          </div>
        </div>

        {/* Save buttons */}
        <div className="form-save">
          <Button type="submit" icon="check">
            Enregistrer les modifications
          </Button>
          {isDirty && (
            <Button 
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              Annuler les modifications
            </Button>
          )}
        </div>
      </form>
    </>
  )
}

function ResumesAdmin({ notify }) {
  const [cvs, setCvs] = useState({ FR: [], EN: [] })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({ FR: false, EN: false })
  const [error, setError] = useState(null)

  // Load CVs on mount
  useEffect(() => {
    loadCvs()
  }, [])

  const loadCvs = async () => {
    try {
      setLoading(true)
      const { getCvsByLanguage } = await import('./services/cvService.js')
      
      const [frResult, enResult] = await Promise.all([
        getCvsByLanguage('fr'),
        getCvsByLanguage('en')
      ])

      if (frResult.error && enResult.error) {
        setError('Erreur chargement des CVs')
      } else {
        setCvs({
          FR: frResult.cvs || [],
          EN: enResult.cvs || []
        })
        setError(null)
      }
    } catch (err) {
      setError(`Erreur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (language, file) => {
    if (!file) return

    try {
      // Convert normalized language (fr/en) to state key (FR/EN)
      const stateKey = language.toUpperCase()
      setUploading(prev => ({ ...prev, [stateKey]: true }))
      const { uploadCv } = await import('./services/cvService.js')
      
      const result = await uploadCv(language, file)
      
      if (result.error) {
        notify(`Erreur upload ${stateKey} : ${result.error}`)
      } else {
        notify(`CV ${stateKey} uploadé avec succès`)
        await loadCvs()
      }
    } catch (err) {
      notify(`Erreur : ${err.message}`)
    } finally {
      const stateKey = language.toUpperCase()
      setUploading(prev => ({ ...prev, [stateKey]: false }))
    }
  }

  const handleReplace = async (language, file) => {
    if (!file) return

    try {
      // Convert normalized language (fr/en) to state key (FR/EN)
      const stateKey = language.toUpperCase()
      setUploading(prev => ({ ...prev, [stateKey]: true }))
      const { replaceCv } = await import('./services/cvService.js')
      
      const result = await replaceCv(language, file)
      
      if (result.error) {
        notify(`Erreur remplacement ${stateKey} : ${result.error}`)
      } else {
        notify(`CV ${stateKey} remplacé avec succès`)
        await loadCvs()
      }
    } catch (err) {
      notify(`Erreur : ${err.message}`)
    } finally {
      const stateKey = language.toUpperCase()
      setUploading(prev => ({ ...prev, [stateKey]: false }))
    }
  }

  const handleDelete = async (cvId, language) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce CV ?')) return

    try {
      const { deleteCv } = await import('./services/cvService.js')
      const result = await deleteCv(cvId)
      
      if (result.error) {
        notify(`Erreur suppression : ${result.error}`)
      } else {
        notify(`CV ${language} supprimé avec succès`)
        await loadCvs()
      }
    } catch (err) {
      notify(`Erreur : ${err.message}`)
    }
  }

  const handlePreview = (url) => {
    if (url) {
      window.open(url, '_blank')
    } else {
      notify('URL du PDF non disponible')
    }
  }

  const renderLanguageSection = (language, langName) => {
    // language is the state key (FR or EN)
    // Convert to lowercase for cvService operations
    const normalizedLanguage = language.toLowerCase()
    const languageCvs = cvs[language]
    const currentCv = languageCvs && languageCvs.length > 0 ? languageCvs.find(cv => cv.is_current) : null
    const otherCvs = languageCvs && languageCvs.length > 0 ? languageCvs.filter(cv => !cv.is_current) : []

    return (
      <div key={language}>
        <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>
          CV {langName}
        </h3>

        {/* Current CV */}
        {currentCv ? (
          <article className="admin-card resume-card" key={currentCv.id}>
            <div className="pdf-preview">
              <span>PDF</span>
              <Icon name="file" size={48} />
              <strong>CURRICULUM VITAE</strong>
              <small>{currentCv.file_name}</small>
            </div>
            <div className="resume-info">
              <span>{language}</span>
              <div>
                <h3>{currentCv.file_name}</h3>
                <p>{(currentCv.file_size / 1024).toFixed(2)} KB</p>
                <small>
                  Mis à jour le{' '}
                  {new Date(currentCv.created_at).toLocaleDateString('fr-FR')} ·{' '}
                  {(currentCv.file_size / 1024 / 1024).toFixed(1)} MB
                </small>
              </div>
              <i className="status published">Active</i>
            </div>
            <div className="resume-actions">
              <Button
                variant="secondary"
                icon="eye"
                onClick={() => handlePreview(currentCv.public_url)}
                disabled={uploading[language]}
              >
                Prévisualiser
              </Button>
              <label style={{ cursor: 'pointer' }}>
                <Button
                  icon="edit"
                  disabled={uploading[language]}
                  as="span"
                >
                  {uploading[language] ? 'Upload...' : 'Remplacer'}
                </Button>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleReplace(normalizedLanguage, e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={() => handleDelete(currentCv.id, language)}
                disabled={uploading[language] || otherCvs.length === 0}
                title={
                  otherCvs.length === 0
                    ? 'Impossible de supprimer le seul CV'
                    : ''
                }
                style={{
                  opacity: uploading[language] || otherCvs.length === 0 ? 0.5 : 1,
                  cursor: uploading[language] || otherCvs.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Icon name="trash" />
              </button>
            </div>
          </article>
        ) : (
          <div className="admin-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p>Aucun CV {langName} actuellement</p>
            <label style={{ cursor: 'pointer', marginTop: '10px', display: 'inline-block' }}>
              <Button icon="upload" as="span">
                Uploader un CV
              </Button>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleUpload(normalizedLanguage, e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        {/* Previous versions */}
        {otherCvs.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              VERSIONS PRÉCÉDENTES
            </h4>
            {otherCvs.map(cv => (
              <article className="admin-card resume-card" key={cv.id} style={{ opacity: 0.7 }}>
                <div className="pdf-preview">
                  <span>PDF</span>
                  <Icon name="file" size={48} />
                  <strong>CURRICULUM VITAE</strong>
                  <small>{cv.file_name}</small>
                </div>
                <div className="resume-info">
                  <span>{language}</span>
                  <div>
                    <h3>{cv.file_name}</h3>
                    <p>{(cv.file_size / 1024).toFixed(2)} KB</p>
                    <small>
                      Uploadé le{' '}
                      {new Date(cv.created_at).toLocaleDateString('fr-FR')}
                    </small>
                  </div>
                  <i className="status">Archive</i>
                </div>
                <div className="resume-actions">
                  <Button
                    variant="secondary"
                    icon="eye"
                    onClick={() => handlePreview(cv.public_url)}
                  >
                    Prévisualiser
                  </Button>
                  <button onClick={() => handleDelete(cv.id, language)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Upload new */}
        {currentCv && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ cursor: 'pointer' }}>
              <Button variant="secondary" icon="upload" as="span">
                Ajouter une version
              </Button>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleUpload(normalizedLanguage, e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <AdminTitle
          title="Gestion des CV"
          subtitle="Gérez les versions française et anglaise de votre CV."
        />
        <div className="admin-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Chargement des CVs...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminTitle
        title="Gestion des CV"
        subtitle="Gérez les versions française et anglaise de votre CV."
      />

      {error && (
        <div className="admin-card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {renderLanguageSection('FR', 'Français')}
        {renderLanguageSection('EN', 'Anglais')}
      </div>

      <div className="admin-card upload-note" style={{ marginTop: '32px' }}>
        <Icon name="info" />
        <div>
          <h3>À propos des fichiers</h3>
          <p>
            Les fichiers PDF sont uploadés vers Supabase Storage. Vous pouvez uploader,
            remplacer, et supprimer les CVs. Un seul CV peut être actif par langue.
            Les versions précédentes sont conservées pour référence.
          </p>
        </div>
      </div>
    </>
  )
}

function MessagesAdmin({ notify }) {
  const [messages, setMessages] = useState(seedMessages)
  const [filter, setFilter] = useState("All")
  const [selected, setSelected] = useState(null)

  const shown = messages.filter((m) => filter === "All" || m.status === filter)

  return (
    <>
      <AdminTitle
        title="Messages"
        subtitle={`${messages.length} messages · ${messages.filter((x) => x.status === "Unread").length} non lus`}
      />
      <div className="tabs inbox-tabs">
        {["All", "Unread", "Read", "Archived"].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x === "All"
              ? "Tous"
              : x === "Unread"
                ? "Non lus"
                : x === "Read"
                  ? "Lus"
                  : "Archivés"}
          </button>
        ))}
      </div>
      <div className="admin-card message-list">
        {shown.length ? (
          shown.map((m) => (
            <button
              key={m.id}
              className={m.status === "Unread" ? "unread" : ""}
              onClick={() => {
                setSelected(m)
                setMessages(
                  messages.map((x) =>
                    x.id === m.id ? { ...x, status: "Read" } : x,
                  ),
                )
              }}
            >
              <span className="sender-avatar">
                {m.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <div>
                <strong>{m.name}</strong>
                <small>{m.email}</small>
              </div>
              <h4>
                {m.subject}
                <small>{m.body}</small>
              </h4>
              <time>{m.date}</time>
              {m.status === "Unread" && <i />}
            </button>
          ))
        ) : (
          <div className="empty-state">
            <Icon name="mail" size={34} />
            <h3>Aucun message</h3>
            <p>Il n'y a aucun message dans cette catégorie.</p>
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
          <div
            className="message-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelected(null)}>
              <Icon name="close" />
            </button>
            <div className="sender-large">
              {selected.name
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <small>{selected.date}</small>
            <h2>{selected.subject}</h2>
            <div className="message-from">
              <strong>{selected.name}</strong>
              <span>{selected.email}</span>
            </div>
            <p>{selected.body}</p>
            <p>
              Je reste disponible pour vous transmettre davantage d'informations
              et organiser un échange selon vos disponibilités.
            </p>
            <div className="message-actions">
              <Button icon="send" onClick={() => notify("Réponse simulée")}>
                Répondre
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMessages(
                    messages.map((x) =>
                      x.id === selected.id ? { ...x, status: "Archived" } : x,
                    ),
                  )
                  setSelected(null)
                  notify("Message archivé")
                }}
              >
                Archiver
              </Button>
              <button
                onClick={() => {
                  setMessages(messages.filter((x) => x.id !== selected.id))
                  setSelected(null)
                  notify("Message supprimé")
                }}
              >
                <Icon name="trash" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TranslationsAdmin({ notify }) {
  const [section, setSection] = useState("Navigation")
  const sections = [
    "Navigation",
    "Hero",
    "À propos",
    "Parcours",
    "Projets",
    "Compétences",
    "Services",
    "Contact",
    "Footer",
  ]
  const rows = {
    Navigation: [
      ["nav.home", "Accueil", "Home"],
      ["nav.about", "À propos", "About"],
      ["nav.journey", "Parcours", "Journey"],
      ["nav.projects", "Projets", "Projects"],
      ["nav.contact", "Contact", "Contact"],
    ],
    Hero: [
      ["hero.greeting", "Bonjour, je suis", "Hello, I am"],
      ["hero.cta", "Télécharger mon CV", "Download my resume"],
    ],
    Contact: [
      [
        "contact.title",
        "Construisons quelque chose ensemble.",
        "Let's build something together.",
      ],
    ],
  }
  const activeRows = rows[section] || [
    [`${section.toLowerCase()}.title`, section, section],
    [
      `${section.toLowerCase()}.description`,
      "Contenu français administrable.",
      "Editable English content.",
    ],
  ]

  return (
    <>
      <AdminTitle
        title="Traductions"
        subtitle="Gérez tous les contenus français et anglais du portfolio."
        action={
          <Button
            icon="check"
            onClick={() => notify("Traductions enregistrées")}
          >
            Enregistrer
          </Button>
        }
      />
      <div className="translation-layout">
        <aside className="admin-card">
          {sections.map((x) => (
            <button
              className={section === x ? "active" : ""}
              onClick={() => setSection(x)}
              key={x}
            >
              {x}
              <Icon name="arrow" />
            </button>
          ))}
        </aside>
        <div className="admin-card translation-editor">
          <div className="translation-head">
            <div>
              <h3>{section}</h3>
              <p>{activeRows.length} clés de traduction</p>
            </div>
            <div>
              <span>FR</span>
              <span>EN</span>
            </div>
          </div>
          {activeRows.map((row) => (
            <div className="translation-row" key={row[0]}>
              <code>{row[0]}</code>
              <textarea defaultValue={row[1]} rows={2} />
              <textarea defaultValue={row[2]} rows={2} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function SettingsAdmin({ notify }) {
  const [visible, setVisible] = useState({
    Hero: true,
    "À propos": true,
    Parcours: true,
    Projets: true,
    Compétences: true,
    Services: true,
    Contact: true,
  })

  return (
    <>
      <AdminTitle
        title="Paramètres"
        subtitle="Configurez votre compte, le SEO et l'affichage du portfolio."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          notify("Paramètres enregistrés")
        }}
      >
        <div className="settings-layout">
          <div>
            <section className="admin-card settings-section">
              <h3>SEO & Métadonnées</h3>
              <p>Informations utilisées par les moteurs de recherche.</p>
              <div className="field-row">
                <label>
                  Titre du site FR
                  <input defaultValue="Med Khalil Wendy — Développeur Full Stack" />
                </label>
                <label>
                  Site Title EN
                  <input defaultValue="Med Khalil Wendy — Full Stack Developer" />
                </label>
              </div>
              <div className="field-row">
                <label>
                  Meta Description FR
                  <textarea
                    rows={4}
                    defaultValue="Portfolio de Med Khalil Wendy, développeur Full Stack et designer UI/UX."
                  />
                </label>
                <label>
                  Meta Description EN
                  <textarea
                    rows={4}
                    defaultValue="Portfolio of Med Khalil Wendy, Full Stack developer and UI/UX designer."
                  />
                </label>
              </div>
            </section>
            <section className="admin-card settings-section">
              <h3>Réseaux sociaux</h3>
              <div className="field-row">
                <label>
                  GitHub
                  <input placeholder="https://github.com/..." />
                </label>
                <label>
                  LinkedIn
                  <input placeholder="https://linkedin.com/in/..." />
                </label>
              </div>
            </section>
          </div>
          <div>
            <section className="admin-card settings-section">
              <h3>Visibilité des sections</h3>
              <p>Activez ou masquez des sections du portfolio public.</p>
              <div className="toggle-list">
                {Object.entries(visible).map(([name, value]) => (
                  <label key={name}>
                    <span>
                      {name}
                      <small>Visible sur le site public</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() =>
                        setVisible({ ...visible, [name]: !value })
                      }
                    />
                    <i />
                  </label>
                ))}
              </div>
            </section>
            <section className="admin-card settings-section">
              <h3>Compte administrateur</h3>
              <label>
                Email
                <input defaultValue="admin@portfolio.test" />
              </label>
              <Button
                variant="secondary"
                icon="settings"
                onClick={() => notify("Écran de mot de passe simulé")}
              >
                Modifier le mot de passe
              </Button>
            </section>
          </div>
        </div>
        <div className="form-save">
          <Button type="submit" icon="check">
            Enregistrer les paramètres
          </Button>
        </div>
      </form>
    </>
  )
}

export default function App() {
  const [locale, setLocale] = useState("fr")
  const [refresh, setRefresh] = useState(0) // Force re-render when projects change
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAdminPath = window.location.pathname.startsWith("/admin")

  // Initialize auth state on component mount
  useEffect(() => {
    let unsubscribe
    let initializationComplete = false

    const initializeAuth = async () => {
      try {
        console.log("[Auth] Initializing auth state...")
        console.log("[Auth] isAdminPath:", window.location.pathname.startsWith("/admin"))
        
        // Step 1: Check for existing session
        const { session, error: sessionError } = await getSession()
        console.log("[Auth] getSession() returned:", { 
          hasSession: !!session,
          userId: session?.user?.id || null,
          error: sessionError 
        })

        if (sessionError) {
          console.error("[Auth] Session error:", sessionError)
          setError(sessionError)
          setIsLoading(false)
          initializationComplete = true
          return
        }

        // Step 2: If we have a session, verify it's a valid admin
        if (session?.user) {
          console.log("[Auth] Session exists, user:", session.user.id)
          
          const { isAdmin: adminStatus, error: adminError } =
            await checkAdminRole(session.user.id)

          if (adminError) {
            console.error("[Auth] Admin check error:", adminError)
            setError(adminError)
            setIsLoading(false)
            initializationComplete = true
            return
          }

          console.log("[Auth] Admin check result:", adminStatus)
          setUser(session.user)
          setIsAdmin(adminStatus)
        } else {
          console.log("[Auth] No session exists - user is unauthenticated")
          // Explicitly clear auth state
          setUser(null)
          setIsAdmin(false)
        }

        setIsLoading(false)
        initializationComplete = true

        // Step 3: Subscribe to auth state changes AFTER initial setup
        unsubscribe = onAuthStateChange(async (currentUser, session, event) => {
          console.log("[Auth] Auth state changed:", {
            event,
            userId: currentUser?.id || null,
            hasSession: !!session
          })
          
          if (currentUser && session) {
            // User logged in - ALWAYS verify admin status before allowing access
            console.log("[Auth] New user session detected, checking admin role...")
            const { isAdmin: adminStatus, error: adminError } = await checkAdminRole(currentUser.id)
            
            if (adminError) {
              console.error("[Auth] ERROR checking admin role:", adminError)
              // On error, deny access to be safe
              setUser(null)
              setIsAdmin(false)
              return
            }
            
            console.log("[Auth] New admin status:", adminStatus)
            setUser(currentUser)
            setIsAdmin(adminStatus)
          } else {
            // User logged out or session lost
            console.log("[Auth] Auth state cleared (user logged out)")
            setUser(null)
            setIsAdmin(false)
          }
        })
      } catch (err) {
        console.error("[Auth] Initialization error:", err)
        setError(err.message)
        setIsLoading(false)
        initializationComplete = true
      }
    }

    initializeAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [isAdminPath])

  // Get projects from service (async)
  const [projects, setProjectsState] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setProjectsLoading(true)
        const data = isAdminPath ? await getProjects() : await getPublishedProjects()
        setProjectsState(data || [])
      } catch (error) {
        console.error("Failed to load projects:", error)
        setProjectsState([])
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [isAdminPath, refresh])

  // Wrapper to update projects and trigger re-render
  const setProjects = () => {
    // Operation is already done in projectService (with Supabase persistence)
    // Just trigger a re-render by incrementing refresh counter
    setRefresh((prev) => prev + 1)
  }

  // ============================================================================
  // DIAGNOSTIC MODE: Log complete render decision tree
  // ============================================================================
  console.group("[APP RENDER DIAGNOSTIC]")
  console.log("=== STATE ===")
  console.log("pathname:", window.location.pathname)
  console.log("isAdminPath:", isAdminPath)
  console.log("isLoading:", isLoading)
  console.log("user exists:", !!user, user ? `(${user.id})` : "(null)")
  console.log("isAdmin:", isAdmin)
  console.log("=== DECISION TREE ===")
  console.log("1. isAdminAndLoading?", isAdminPath && isLoading, "→ should show LOADING")
  console.log("2. !isAdminPath?", !isAdminPath, "→ should show PUBLIC")
  console.log("3. !user?", !user, "→ should show LOGIN")
  console.log("4. !isAdmin?", !isAdmin, "→ should show DENIED")
  console.log("5. else →", "should show ADMIN")
  console.log("=== ACTUAL RESULT ===")
  console.groupEnd()
  
  const isAdminAndLoading = isAdminPath && isLoading
  
  if (isAdminAndLoading) {
    console.warn("[RENDER] LOADING - showing loading page")
    return (
      <div className="login-page">
        <div className="login-panel" style={{ textAlign: "center" }}>
          <div style={{ marginTop: "2rem" }}>
            <Icon name="settings" size={48} />
            <p style={{ marginTop: "1rem" }}>Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdminPath) {
    console.log("[RENDER] PUBLIC - showing public portfolio")
    return (
      <PublicPortfolio
        projects={projects}
        projectsLoading={projectsLoading}
        locale={locale}
        setLocale={setLocale}
      />
    )
  }

  if (!user) {
    console.warn("[RENDER] LOGIN - no user found, showing login page")
    return (
      <AdminLogin
        onLogin={(loggedInUser) => {
          console.log("[LOGIN SUCCESS]", loggedInUser.id)
          setUser(loggedInUser)
          setIsAdmin(true)
          window.history.replaceState({}, "", "/admin/dashboard")
        }}
        error={error}
      />
    )
  }

  if (!isAdmin) {
    console.error("[RENDER] DENIED - user exists but not admin:", user.id)
    return (
      <div className="login-page">
        <div className="login-panel" style={{ textAlign: "center" }}>
          <div style={{ marginTop: "2rem" }}>
            <Icon name="close" size={48} style={{ color: "#e74c3c" }} />
            <p style={{ marginTop: "1rem", color: "#e74c3c" }}>
              Accès refusé. Vous n'avez pas les permissions d'administrateur.
            </p>
            <Button 
              variant="primary" 
              onClick={async () => {
                await signOut()
                setUser(null)
                setIsAdmin(false)
                window.history.replaceState({}, "", "/")
              }}
              style={{ marginTop: "2rem" }}
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    )
  }

  console.error("[RENDER] ADMIN - user is admin, showing dashboard:", user.id, user.email)
  return (
    <AdminApp
      projects={projects}
      setProjects={setProjects}
      onLogout={async () => {
        console.log("[LOGOUT]", user.id)
        const { error: logoutError } = await signOut()
        if (logoutError) {
          console.error("Logout error:", logoutError)
          setError(logoutError)
          return
        }
        setUser(null)
        setIsAdmin(false)
        window.history.replaceState({}, "", "/admin/login")
      }}
    />
  )
}
