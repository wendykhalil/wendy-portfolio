/**
 * Profile Service
 * 
 * Centralizes access to profile data for the portfolio.
 * Persists data to Supabase for multi-device sync.
 * 
 * Features:
 * - Load profile from Supabase on app start
 * - Save changes to Supabase
 * - Fall back to defaults if database unavailable
 */

// Default profile data structure
// All profile information is stored here
const defaultProfile = {
  // Personal information
  personal: {
    fullName: "Med Khalil Wendy",
    email: "khalil.wendy@example.com",
    phone: "+216 XX XXX XXX",
    location: "Tunisie",
    photo: "/images/profile.jpg", // Path to static photo asset
  },

  // Bilingual content (Hero, About sections)
  content: {
    fr: {
      label: "PORTFOLIO 2026",
      greeting: "Bonjour, je suis",
      title: "Future Ingénieur Informatique",
      title2: "Full Stack Developer",
      hero: "Passionné par le développement web et la conception d'interfaces modernes, je transforme les idées en applications performantes, intuitives et scalables.",
      aboutTitle: "À propos de moi",
      about: "Je suis Med Khalil Wendy, étudiant en cycle ingénieur en informatique à ESPRIT, spécialisé en Web et Internet. Passionné par la création d'applications web et les nouvelles technologies, j'aime concevoir des interfaces modernes et développer des solutions complètes répondant à des besoins réels.",
      available: "À la recherche d'opportunités professionnelles",
    },
    en: {
      label: "PORTFOLIO 2026",
      greeting: "Hello, I am",
      title: "Future Software Engineer",
      title2: "Full Stack Developer",
      hero: "Passionate about web development and modern interface design, I turn ideas into high-performance, intuitive, and scalable applications.",
      aboutTitle: "About me",
      about: "I am Med Khalil Wendy, a computer engineering student at ESPRIT specializing in Web and Internet technologies. Passionate about web applications and emerging technologies, I enjoy crafting modern interfaces and building complete solutions for real needs.",
      available: "Open to professional opportunities",
    },
  },

  // Social media links
  social: {
    github: "",
    linkedin: "",
  },

  // Availability status
  availability: true,
};

// In-memory cache for profile data
// Syncs with Supabase for persistence
let profileData = JSON.parse(JSON.stringify(defaultProfile));

/**
 * Get the current profile data
 * @returns {Object} Profile data object
 */
export const getProfile = () => {
  return JSON.parse(JSON.stringify(profileData));
};

/**
 * Update profile data
 * Merges updates with existing profile, preserving unchanged fields
 * @param {Object} updates - Partial profile object to update
 * @returns {Object} Updated profile data
 */
export const updateProfile = (updates) => {
  profileData = {
    ...profileData,
    personal: { ...profileData.personal, ...updates.personal },
    content: {
      fr: { ...profileData.content.fr, ...updates.content?.fr },
      en: { ...profileData.content.en, ...updates.content?.en },
    },
    social: { ...profileData.social, ...updates.social },
    availability: updates.availability ?? profileData.availability,
  };
  return JSON.parse(JSON.stringify(profileData));
};

/**
 * Load profile from Supabase and cache it in memory
 * Called on app initialization to sync with cloud
 * @returns {Promise<{profile: Object, error: string}>}
 */
export const loadProfileFromDatabase = async () => {
  try {
    const { loadProfileFromSupabase } = await import('./heroService.js')
    const { profile, error } = await loadProfileFromSupabase()

    if (error) {
      console.warn('Failed to load from Supabase, using defaults:', error)
      return { profile: getProfile(), error }
    }

    if (profile) {
      profileData = profile
    }

    return { profile: getProfile(), error: null }
  } catch (err) {
    console.warn('Exception loading profile:', err.message)
    return { profile: getProfile(), error: err.message }
  }
};

/**
 * Save profile to Supabase
 * Called after admin updates to persist changes
 * @returns {Promise<{success: boolean, error: string}>}
 */
export const saveProfileToDatabase = async () => {
  try {
    const { saveProfileToSupabase } = await import('./heroService.js')
    const { success, error } = await saveProfileToSupabase(profileData)

    if (!success) {
      console.error('Failed to save to Supabase:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Exception saving profile:', err)
    return { success: false, error: err.message }
  }
};

/**
 * Get default profile (used to reset or initialize)
 * @returns {Object} Default profile data
 */
export const getDefaultProfile = () => {
  return JSON.parse(JSON.stringify(defaultProfile));
};

/**
 * Reset profile to default state
 * @returns {Object} Reset profile data
 */
export const resetProfile = () => {
  profileData = JSON.parse(JSON.stringify(defaultProfile));
  return JSON.parse(JSON.stringify(profileData));
};

/**
 * Get content for a specific locale
 * @param {String} locale - "fr" or "en"
 * @returns {Object} Localized content object
 */
export const getLocalizedContent = (locale) => {
  return profileData.content[locale] || profileData.content.fr;
};

/**
 * Update content for a specific locale
 * @param {String} locale - "fr" or "en"
 * @param {Object} contentUpdates - Object with fields to update
 * @returns {Object} Updated content
 */
export const updateLocalizedContent = (locale, contentUpdates) => {
  profileData.content[locale] = {
    ...profileData.content[locale],
    ...contentUpdates,
  };
  return JSON.parse(JSON.stringify(profileData));
};

/**
 * Get personal information
 * @returns {Object} Personal info object
 */
export const getPersonalInfo = () => {
  return JSON.parse(JSON.stringify(profileData.personal));
};

/**
 * Update personal information
 * @param {Object} personalUpdates - Object with fields to update
 * @returns {Object} Updated personal info
 */
export const updatePersonalInfo = (personalUpdates) => {
  profileData.personal = {
    ...profileData.personal,
    ...personalUpdates,
  };
  return JSON.parse(JSON.stringify(profileData.personal));
};

/**
 * Get social media links
 * @returns {Object} Social links object (only non-empty links)
 */
export const getSocialLinks = () => {
  // Return only non-empty links
  return Object.entries(profileData.social)
    .filter(([, url]) => url && url.trim() !== "")
    .reduce((acc, [key, url]) => {
      acc[key] = url;
      return acc;
    }, {});
};

/**
 * Update social media links
 * @param {Object} socialUpdates - Object with social links to update
 * @returns {Object} Updated social links
 */
export const updateSocialLinks = (socialUpdates) => {
  profileData.social = {
    ...profileData.social,
    ...socialUpdates,
  };
  return JSON.parse(JSON.stringify(profileData.social));
};

/**
 * Update profile photo path
 * @param {String} photoPath - Path to photo (relative to public folder)
 * @returns {Object} Updated personal info
 */
export const updateProfilePhoto = (photoPath) => {
  profileData.personal.photo = photoPath;
  return JSON.parse(JSON.stringify(profileData.personal));
};

/**
 * Get profile photo path
 * @returns {String} Photo path
 */
export const getProfilePhoto = () => {
  return profileData.personal.photo;
};
