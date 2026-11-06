/**
 * ContactSection Component
 * Public contact information display
 * 
 * Props:
 * - locale: 'fr' or 'en' (language)
 * - settings: Contact settings from Supabase (email, phone, location, social links, etc.)
 * - isLoading: True while fetching settings
 * - profileData: Profile data from Supabase (optional, used to display full name)
 * 
 * Features:
 * - Displays dynamic contact information from Supabase
 * - Shows full name (from profileData), email, phone, location, GitHub, LinkedIn
 * - Accessible links and metadata
 * - Fallback handling if settings not loaded
 */

import React from 'react'

const LABELS = {
  fr: {
    location: 'Localisation',
    phone: 'Téléphone',
    findMe: 'Me retrouver sur',
    loading: 'Chargement des informations...',
  },
  en: {
    location: 'Location',
    phone: 'Phone',
    findMe: 'Find me on',
    loading: 'Loading contact information...',
  },
}

export default function ContactSection({ locale = 'fr', settings, isLoading, profileData }) {
  const t = LABELS[locale] || LABELS.fr

  if (isLoading) {
    return (
      <div className="contact-info" role="status" aria-live="polite">
        <p>{t.loading}</p>
      </div>
    )
  }

  if (!settings) {
    return null
  }

  return (
    <div className="contact-info">
      <div className="contact-list">
        {/* Full Name */}
        {profileData?.personal?.fullName && (
          <div className="contact-link">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              <small>Nom</small>
              <span>{profileData.personal.fullName}</span>
            </span>
          </div>
        )}
        
        {/* Email */}
        {settings?.email && (
          <a
            href={`mailto:${settings.email}`}
            className="contact-link"
            aria-label={`Email: ${settings.email}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>
              <small>Email</small>
              <span>{settings.email}</span>
            </span>
          </a>
        )}

        {/* Phone */}
        {settings?.phone && (
          <a
            href={`tel:${settings.phone.replace(/\s/g, '')}`}
            className="contact-link"
            aria-label={`Phone: ${settings.phone}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>
              <small>{t.phone}</small>
              <span>{settings.phone}</span>
            </span>
          </a>
        )}

        {/* Location */}
        {settings?.location && (
          <div className="contact-link">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>
              <small>{t.location}</small>
              <span>{settings.location}</span>
            </span>
          </div>
        )}
      </div>

      {/* Social Links */}
      {(settings?.github || settings?.linkedin) && (
        <div className="social-line">
          <span>{t.findMe}</span>
          {settings.github && (
            <a
              href={settings.github}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              aria-label="GitHub profile"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {settings.linkedin && (
            <a
              href={settings.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              aria-label="LinkedIn profile"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.047-8.821 0-9.74h3.554v1.378c.43-.664 1.199-1.608 2.926-1.608 2.144 0 3.748 1.4 3.748 4.414v5.556zM5.337 9.432c-1.144 0-1.915-.758-1.915-1.704 0-.955.771-1.703 1.956-1.703 1.184 0 1.915.748 1.94 1.703 0 .946-.756 1.704-1.981 1.704zm1.582 11.02h-3.127V9.712h3.127v10.74zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
          )}
        </div>
      )}
    </div>
  )
}

