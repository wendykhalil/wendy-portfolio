# Services Layer

This directory contains all service layers for the Wendy Portfolio application.

## profileService.js

Centralized data access layer for profile information.

### Features
- Single source of truth for all profile data
- Easy to replace with API calls later
- Data validation and error handling
- Bilingual content support (FR/EN)
- In-memory storage (future: REST API)

### Data Structure

```javascript
{
  personal: {
    fullName: string,      // User's full name
    email: string,         // Email address
    phone: string,         // Phone number (optional)
    location: string,      // City/country
    photo: string          // Path to profile photo
  },
  
  content: {
    fr: {
      title: string,       // Professional title
      title2: string,      // Secondary title/role
      hero: string,        // Short hero description
      aboutTitle: string,  // "À propos de moi"
      about: string,       // Long bio/about text
      available: string    // Availability message
    },
    en: {
      // Same structure in English
    }
  },
  
  social: {
    github: string,        // GitHub profile URL (optional)
    linkedin: string       // LinkedIn profile URL (optional)
  },
  
  availability: boolean    // Is user available for opportunities?
}
```

### API Functions

#### getProfile()
Returns complete profile data object.

```javascript
const profile = getProfile()
console.log(profile.personal.fullName)  // "Med Khalil Wendy"
```

#### updateProfile(updates)
Updates profile with partial data. Uses deep merge.

```javascript
updateProfile({
  personal: {
    fullName: "New Name"
  },
  content: {
    fr: { title: "New FR Title" }
  }
})
```

#### getDefaultProfile()
Returns default profile state (for reset).

```javascript
const defaults = getDefaultProfile()
```

#### resetProfile()
Resets profile to defaults and returns it.

```javascript
resetProfile()
```

#### getLocalizedContent(locale)
Gets content for specific locale ("fr" or "en").

```javascript
const frContent = getLocalizedContent("fr")
console.log(frContent.title)  // French title
```

#### updateLocalizedContent(locale, updates)
Updates content for specific locale.

```javascript
updateLocalizedContent("en", {
  title: "New English Title"
})
```

#### getPersonalInfo()
Gets only personal information.

```javascript
const personal = getPersonalInfo()
```

#### updatePersonalInfo(updates)
Updates only personal information.

```javascript
updatePersonalInfo({
  email: "new@email.com"
})
```

#### getSocialLinks()
Gets only non-empty social links.

```javascript
const links = getSocialLinks()  // Only { github: "...", linkedin: "..." }
```

#### updateSocialLinks(updates)
Updates social links.

```javascript
updateSocialLinks({
  github: "https://github.com/user"
})
```

#### updateProfilePhoto(path)
Updates profile photo path.

```javascript
updateProfilePhoto("/images/new-photo.jpg")
```

#### getProfilePhoto()
Gets profile photo path.

```javascript
const photo = getProfilePhoto()
```

### Current Implementation (In-Memory)

Data is stored in RAM and persists during the session.

```javascript
let profileData = { ... }

export const getProfile = () => {
  // Deep copy to prevent external modifications
  return JSON.parse(JSON.stringify(profileData))
}

export const updateProfile = (updates) => {
  // Deep merge strategy
  profileData = {
    ...profileData,
    personal: { ...profileData.personal, ...updates.personal },
    // ...
  }
  return JSON.parse(JSON.stringify(profileData))
}
```

### Future Implementation (REST API)

To migrate to a backend API, simply update these functions:

```javascript
export const getProfile = async () => {
  const response = await fetch('/api/profile')
  return response.json()
}

export const updateProfile = async (updates) => {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  return response.json()
}
```

**No changes needed in UI components!**

### Usage in React Components

```javascript
import { getProfile, updateProfile } from "../services/profileService"

function MyComponent() {
  const profile = getProfile()
  
  const handleSave = (formData) => {
    updateProfile(formData)
  }
  
  return (
    <div>
      <h1>{profile.personal.fullName}</h1>
      {/* ... */}
    </div>
  )
}
```

### Data Immutability

All getter functions return deep copies to prevent accidental mutations:

```javascript
const profile1 = getProfile()
profile1.personal.fullName = "Hacked"

const profile2 = getProfile()
console.log(profile2.personal.fullName)  // Still "Med Khalil Wendy"
```

### Error Handling

No try-catch blocks currently (in-memory storage never throws).

When migrating to API, add error handling:

```javascript
export const updateProfile = async (updates) => {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Update failed')
    return response.json()
  } catch (error) {
    console.error('Profile update error:', error)
    throw error  // Propagate to UI
  }
}
```

### Testing

Run the test suite:

```bash
cd src/services
node test-profile.js  # Run from project root
```

Tests validate:
- Default profile loading
- Personal info updates
- Bilingual content updates
- Social links updates
- Email validation
- URL validation
- Availability toggle
- Data immutability
- Empty links handling
- Multilingual consistency

### Design Philosophy

1. **Single Responsibility**: Service handles data access only
2. **Easy to Replace**: Can be swapped for API calls without UI changes
3. **Immutable**: Getters return deep copies
4. **Type-Safe**: Data structure is consistent
5. **Simple**: Junior-friendly, no complex patterns
6. **Testable**: Pure functions, no side effects

### Future Enhancements

- [ ] Add error handling for API calls
- [ ] Add retry logic for failed requests
- [ ] Add caching strategy
- [ ] Add offline mode support
- [ ] Add data validation schema
- [ ] Add data transformation layer
- [ ] Add logging/analytics
- [ ] Add TypeScript types (optional)

### Related Files

- `src/App.jsx` - Main component consuming this service
- `docs/CHANGELOG_DEV.md` - Full implementation details
- `docs/ADMIN_PROFILE_GUIDE.md` - User guide for Admin Profile

---

**Service is in-memory mockup. Production will use REST API backend.**
