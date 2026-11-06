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

function PublicPortfolio({ projects, projectsLoading, locale, setLocale, profileData }) {
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
  const profileContent = profileData?.content[locale] || {}
  
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
              {profileData?.personal?.fullName?.split(" ")?.slice(1)?.join(" ") || "Wendy"}<small>{profileContent.title2}</small>
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
                {profileData?.content[locale]?.label || 'PORTFOLIO 2026'}
              </span>
              <h1>
                {profileData?.content[locale]?.greeting || (locale === 'fr' ? 'Bonjour, je suis' : 'Hello, I am')}
                <strong>{profileData?.personal?.fullName || 'Med Khalil Wendy'}</strong>
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
                  {profileData?.social?.github && (
                    <a href={profileData.social.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                      <Icon name="github" />
                    </a>
                  )}
                  {profileData?.social?.linkedin && (
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
                  src="data:image/jpeg;base64,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ooAKSikoASkpaKYCUUUUALSUUUhhRRRQIUUUUUDCiiimISiiigApaKKYCUUtJQAtFJRQAtJRRSAKKKKACiikpDFopKWgQUUUUAFJRS0AFFFFABRRRQMKKKKYgooopDCiiigQUUUUAJRS0lMYtFJS0CCilooAKY1PprV8Z4g/8ifHf9y//qRSPjPEL/kT4/8A7l//AFIpBRS0V9ofZiUUtJQAUlLRQAUUUUAFFFFABRRRQAUtJS0gCiilpDEpaSjNMBaKbRmgB1Jmm5pM0APzSZptJTEOzSZpKKAHZpwNMpwoAfS0gpakYU6m06gQUlLRQAlFFJQAtFFFACUUUUAJSUUUAFFLSUDHUUUUCFozSUtAAaSiigApKWkoASiiigBKKKKACiiigBKWiimAUUUUALRSUtACUtFFMBKKKWgApKWkoAKWikoAKKKKAEpaKKQBRRRQAUUUUhhRRRTEJS0lFAxaKSloEFFFFAwooooEFFFFAwooooEFFFLQAlFFFACUtFFABS0UlADqY1OprV8Z4g/8ifHf9y//AKkUj4zxC/5E+O/7l/8A1IpBRRRX2h9mJRRS0AFFFFACUUtJQAtFFJQAtFFJQAtFJRQAuaM02igBc0ZptFAC0UlLQAlFOxS7aAG0VJtpdtIZDRTjTaYgp4plPFAElLTaWpGLS0lJQAtFFFAhKKKWmAUUlFIApKWkoAKSiimAUUUUgFopKKAFpabS0wCilpaQDaQ0UUAJRRRQMKKKKYBRRRSEFFFLQMSiiimIKKKKYBRRRQAUUUUAFFFFABRRS0AJRS0lABRRRSAKKKWmAlFFFIAooooAKKKKACiiigBKWkooAWiiigAooooAKKKKACiiigAooopgFFFFIBaSikoAdTWpaaa+M8Qf+RPjv+5f/wBSKR8Z4hf8ifHf9y//AKkUgpaKK+0PsxKKWigBKWkooAWkopKAFopKSgB1JSUUAFFLRigBKKdinbaAGUuKk208LSuBFinBal207FK4yPbTgtPopAG2kalppoArtUdPamVYgp4plPFAD6KKWpGLRSUUCFpKKKACiiigApaSigAooooAbRRSUwCiiigAooooAKWkpaAFpaSikAlIaKKAClpKKACiiimAUUUUAFFFFABRRSUwFooooAKSlooASloooAWkoooAKKKKACiikoAWiiigAooooAKKKKACiiig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
"
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
              {profileData?.personal?.fullName || "Med Khalil Wendy"}
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
            © 2026 {profileData?.personal?.fullName || "Med Khalil Wendy"}.{" "}
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
          {page === "profile" && <ProfileAdmin notify={notify} profileData={profileData} />}
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
function ProfileAdmin({ notify, profileData }) {
  
  // Form state - initialize from profile data (with fallbacks)
  const getInitialFormState = () => {
    if (!profileData) {
      return {
        fullName: "Med Khalil Wendy",
        email: "",
        phone: "",
        location: "Tunisie",
        heroLabelFr: 'PORTFOLIO 2026',
        heroLabelEn: 'PORTFOLIO 2026',
        heroGreetingFr: 'Bonjour, je suis',
        heroGreetingEn: 'Hello, I am',
        titleFr: "Future Ingénieur Informatique",
        titleEn: "Future Software Engineer",
        heroBioFr: "",
        heroBioEn: "",
        aboutFr: "",
        aboutEn: "",
        availableFr: "",
        availableEn: "",
        github: "",
        linkedin: "",
        availability: true,
        photo: "/images/profile.jpg",
        previewPhoto: null,
      }
    }
    
    return {
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
    }
  }

  const [form, setForm] = useState(getInitialFormState)
  
  // Update form when profileData loads
  useEffect(() => {
    if (profileData) {
      setForm(getInitialFormState())
    }
  }, [profileData])

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
  const [profileData, setProfileData] = useState(null) // Add profile data state
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAdminPath = window.location.pathname.startsWith("/admin")

  // Load profile from Supabase on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { loadProfileFromDatabase, getProfile: getProfileData } = await import('./services/profileService.js')
        const result = await loadProfileFromDatabase()
        // Get fresh profile data after loading from database
        const freshProfile = getProfileData()
        setProfileData(freshProfile)
      } catch (err) {
        console.error('Error loading profile:', err)
        // Fallback to default profile
        const { getProfile: getProfileData } = await import('./services/profileService.js')
        setProfileData(getProfileData())
      }
    }
    loadProfile()
  }, [])

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
        profileData={profileData}
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

