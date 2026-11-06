const shots = [
  "linear-gradient(135deg,#172554 0%,#0f172a 48%,#7c3aed 150%)",
  "linear-gradient(145deg,#064e3b 0%,#111827 55%,#8b5cf6 150%)",
  "linear-gradient(145deg,#27272a 0%,#18181b 55%,#6d28d9 150%)",
  "linear-gradient(145deg,#3f1d35 0%,#18181b 50%,#7c3aed 140%)",
  "linear-gradient(145deg,#422006 0%,#18181b 55%,#5b21b6 160%)",
  "linear-gradient(145deg,#172554 0%,#18181b 55%,#6d28d9 150%)",
  "linear-gradient(145deg,#052e16 0%,#18181b 55%,#4c1d95 170%)",
  "linear-gradient(145deg,#1e1b4b 0%,#18181b 55%,#7e22ce 150%)",
]

export const initialProjects = [
  {
    id: 1,
    title: "BudgetFlow",
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
    image: shots[0],
    githubUrl: "#",
  },
  {
    id: 2,
    title: "MindLog AI",
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
    image: shots[1],
    githubUrl: "#",
  },
  {
    id: 3,
    title: "Dental Management",
    category: "Web Development",
    description: {
      fr: "Application de gestion de stock pour produits dentaires.",
      en: "Inventory management application for dental products.",
    },
    detail: {
      fr: "Suivi centralisé des produits, fournisseurs et alertes de stock critique.",
      en: "Centralized tracking of products, suppliers, and critical stock alerts.",
    },
    technologies: ["React", "Node.js", "Express", "MongoDB"],
    contribution: {
      fr: "Développement Full Stack, modélisation et tableau de bord.",
      en: "Full Stack development, modeling, and dashboard.",
    },
    status: "Published",
    featured: false,
    displayOrder: 3,
    image: shots[2],
    githubUrl: "#",
  },
  {
    id: 4,
    title: "BMP.tn",
    category: "Web Development",
    description: {
      fr: "Marketplace entre utilisateurs et artisans.",
      en: "Marketplace connecting users and craftspeople.",
    },
    detail: {
      fr: "Une plateforme de mise en relation avec recherche, profils et recommandations assistées.",
      en: "A connecting platform with search, profiles, and assisted recommendations.",
    },
    technologies: ["React", "Tailwind", "AI"],
    contribution: {
      fr: "Recherche utilisateur, UI et développement des parcours principaux.",
      en: "User research, UI and core journey development.",
    },
    status: "Published",
    featured: false,
    displayOrder: 4,
    image: shots[3],
  },
  {
    id: 5,
    title: "SolarShare",
    category: "Web Development",
    description: {
      fr: "Plateforme de location de matériel énergétique renouvelable.",
      en: "Renewable energy equipment rental platform.",
    },
    detail: {
      fr: "Catalogue et système de réservation pensé pour démocratiser l'accès au matériel solaire.",
      en: "Catalog and booking system designed to democratize access to solar equipment.",
    },
    technologies: ["Laravel", "PHP", "MySQL", "Blade"],
    contribution: {
      fr: "Conception de la base de données et développement des flux de location.",
      en: "Database design and rental flow development.",
    },
    status: "Published",
    featured: false,
    displayOrder: 5,
    image: shots[4],
  },
  {
    id: 6,
    title: "Slikoo",
    category: "Web Development",
    description: {
      fr: "Marketplace mettant en relation clients et détectives privés.",
      en: "Marketplace connecting clients and private investigators.",
    },
    detail: {
      fr: "Une marketplace sécurisée avec profils, demandes de missions et messagerie.",
      en: "A secure marketplace with profiles, mission requests, and messaging.",
    },
    technologies: ["Next.js", "NestJS", "TypeScript", "MySQL"],
    contribution: {
      fr: "Développement Full Stack et création des interfaces métier.",
      en: "Full Stack development and business interface creation.",
    },
    status: "Published",
    featured: true,
    displayOrder: 6,
    image: shots[5],
    githubUrl: "#",
  },
  {
    id: 7,
    title: "Verdant Time",
    category: "UI/UX Design",
    description: {
      fr: "Boutique de montres premium à l'interface moderne.",
      en: "Premium watch store with a modern interface.",
    },
    detail: {
      fr: "Un concept e-commerce éditorial mêlant luxe discret et navigation fluide.",
      en: "An editorial e-commerce concept blending understated luxury and fluid navigation.",
    },
    technologies: ["Figma", "Figma Make"],
    contribution: {
      fr: "Direction artistique, wireframes, UI et prototype interactif.",
      en: "Art direction, wireframes, UI, and interactive prototype.",
    },
    status: "Published",
    featured: true,
    displayOrder: 7,
    image: shots[6],
  },
  {
    id: 8,
    title: "Atelier North",
    category: "WordPress",
    description: {
      fr: "Site vitrine professionnel pour une société de conseil.",
      en: "Professional showcase website for a consulting firm.",
    },
    detail: {
      fr: "Un site administrable rapide et élégant orienté conversion.",
      en: "A fast, elegant, and conversion-focused manageable website.",
    },
    technologies: ["WordPress", "Elementor"],
    contribution: {
      fr: "Personnalisation du thème, responsive et optimisation.",
      en: "Theme customization, responsiveness, and optimization.",
    },
    status: "Draft",
    featured: false,
    displayOrder: 8,
    image: shots[7],
  },
]

export const experiences = [
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

export const initialSkills = Object.entries(groups).flatMap(
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

export const messages = [
  {
    id: 1,
    name: "Sophie Martin",
    email: "sophie@novalab.test",
    subject: "Opportunité Front-end Developer",
    date: "12 juin 2026",
    status: "Unread",
    body: "Bonjour Khalil, votre profil a retenu notre attention pour une opportunité au sein de notre équipe produit.",
  },
  {
    id: 2,
    name: "Youssef Ben Ali",
    email: "youssef@studio.test",
    subject: "Refonte d'une plateforme web",
    date: "10 juin 2026",
    status: "Read",
    body: "Nous cherchons un profil Full Stack et UI/UX pour nous accompagner sur une refonte.",
  },
  {
    id: 3,
    name: "Claire Robert",
    email: "claire@talent.test",
    subject: "Échange autour de votre portfolio",
    date: "7 juin 2026",
    status: "Read",
    body: "Seriez-vous disponible cette semaine pour un premier échange ?",
  },
]
