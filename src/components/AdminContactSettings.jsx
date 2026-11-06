/**
 * AdminContactSettings Component
 * Admin panel for managing contact information and settings
 * 
 * Features:
 * - Edit public contact info (email, phone, location)
 * - Edit social links (GitHub, LinkedIn)
 * - Edit contact section content (title, description in FR/EN)
 * - Toggle contact form enabled/disabled
 * - Real-time save with loading state
 * - Success/error feedback
 * - Realtime sync with other admin sessions
 */

import React, { useState, useEffect } from 'react'
import {
  getContactSettings,
  updateContactSettings,
  subscribeToContactSettings,
} from '../services/contactService'

export default function AdminContactSettings({ notify }) {
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const { settings: data, error } = await getContactSettings()
        if (error) {
          notify(`Error loading settings: ${error}`)
          return
        }
        setSettings(data)
        setHasChanges(false)
      } catch (err) {
        notify(`Error: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()

    // Subscribe to realtime changes
    const unsubscribe = subscribeToContactSettings((updatedSettings) => {
      setSettings(updatedSettings)
      notify('Settings updated from another session')
    })

    return () => {
      unsubscribe()
    }
  }, [notify])

  // Handle field change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setHasChanges(true)
  }

  // Save settings
  const handleSave = async (e) => {
    e.preventDefault()

    // Validate email
    if (!settings.email?.trim()) {
      notify('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      notify('Invalid email format')
      return
    }

    // Validate titles not empty
    if (!settings.title_fr?.trim()) {
      notify('French title is required')
      return
    }

    if (!settings.title_en?.trim()) {
      notify('English title is required')
      return
    }

    try {
      setIsSaving(true)
      const { success, error } = await updateContactSettings({
        email: settings.email.trim(),
        phone: settings.phone?.trim() || '',
        location: settings.location?.trim() || '',
        github: settings.github?.trim() || '',
        linkedin: settings.linkedin?.trim() || '',
        title_fr: settings.title_fr.trim(),
        description_fr: settings.description_fr?.trim() || '',
        title_en: settings.title_en.trim(),
        description_en: settings.description_en?.trim() || '',
        contact_form_enabled: settings.contact_form_enabled,
      })

      if (!success) {
        notify(`Error: ${error}`)
        return
      }

      setHasChanges(false)
      notify('Contact settings updated successfully')
    } catch (err) {
      notify(`Error saving settings: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="admin-card">
        <p>Loading contact settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="admin-card">
        <p>Failed to load contact settings</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="admin-card form-card">
      <div className="form-section">
        <h3>Public Contact Information</h3>

        <div className="form-field">
          <label htmlFor="contact-email">
            Email <span className="required">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            value={settings.email || ''}
            onChange={handleChange}
            placeholder="contact@example.com"
            required
            disabled={isSaving}
          />
          <small>Recipients will see and use this email address</small>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contact-phone">Phone</label>
            <input
              id="contact-phone"
              type="tel"
              name="phone"
              value={settings.phone || ''}
              onChange={handleChange}
              placeholder="+216 XX XXX XXX"
              disabled={isSaving}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-location">Location</label>
            <input
              id="contact-location"
              type="text"
              name="location"
              value={settings.location || ''}
              onChange={handleChange}
              placeholder="City, Country"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contact-github">GitHub URL</label>
            <input
              id="contact-github"
              type="url"
              name="github"
              value={settings.github || ''}
              onChange={handleChange}
              placeholder="https://github.com/username"
              disabled={isSaving}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-linkedin">LinkedIn URL</label>
            <input
              id="contact-linkedin"
              type="url"
              name="linkedin"
              value={settings.linkedin || ''}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Contact Section Content (French)</h3>

        <div className="form-field">
          <label htmlFor="contact-title-fr">
            Title <span className="required">*</span>
          </label>
          <input
            id="contact-title-fr"
            type="text"
            name="title_fr"
            value={settings.title_fr || ''}
            onChange={handleChange}
            placeholder="Construisons quelque chose ensemble."
            required
            disabled={isSaving}
          />
        </div>

        <div className="form-field">
          <label htmlFor="contact-desc-fr">Description</label>
          <textarea
            id="contact-desc-fr"
            name="description_fr"
            value={settings.description_fr || ''}
            onChange={handleChange}
            placeholder="Décrivez votre approche en français..."
            rows={4}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Contact Section Content (English)</h3>

        <div className="form-field">
          <label htmlFor="contact-title-en">
            Title <span className="required">*</span>
          </label>
          <input
            id="contact-title-en"
            type="text"
            name="title_en"
            value={settings.title_en || ''}
            onChange={handleChange}
            placeholder="Let's build something together."
            required
            disabled={isSaving}
          />
        </div>

        <div className="form-field">
          <label htmlFor="contact-desc-en">Description</label>
          <textarea
            id="contact-desc-en"
            name="description_en"
            value={settings.description_en || ''}
            onChange={handleChange}
            placeholder="Describe your approach in English..."
            rows={4}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Feature Settings</h3>

        <div className="form-field checkbox-field">
          <label htmlFor="contact-form-enabled" className="checkbox-label">
            <input
              id="contact-form-enabled"
              type="checkbox"
              name="contact_form_enabled"
              checked={settings.contact_form_enabled || false}
              onChange={handleChange}
              disabled={isSaving}
              className="checkbox-input"
            />
            <span className="checkbox-text">Enable contact form on public portfolio</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={!hasChanges || isSaving}
          className="btn btn-primary"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

