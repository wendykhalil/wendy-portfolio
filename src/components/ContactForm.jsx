/**
 * ContactForm Component
 * Functional contact form with validation, loading state, and error/success feedback
 * 
 * Props:
 * - locale: 'fr' or 'en' (language for labels and messages)
 * - onSubmitSuccess: Callback after successful submission
 * - onSubmitError: Callback if submission fails
 * 
 * Features:
 * - Real-time field validation
 * - Loading state during submission
 * - Success/error feedback with auto-reset
 * - Prevents duplicate submissions
 * - Basic spam prevention (debouncing)
 * - Accessible form with proper labels and ARIA attributes
 */

import React, { useState, useRef } from 'react'
import { submitContactMessage } from '../services/contactService'

const LABELS = {
  fr: {
    name: 'Nom complet',
    email: 'Email',
    subject: 'Sujet',
    message: 'Votre message',
    send: 'Envoyer le message',
    sending: 'Envoi en cours...',
    namePlaceholder: 'Votre nom',
    emailPlaceholder: 'vous@email.com',
    subjectPlaceholder: 'Comment puis-je vous aider ?',
    messagePlaceholder: 'Parlez-moi de votre idée, projet ou opportunité...',
    successTitle: 'Merci pour votre message',
    successText: 'Je vous répondrai dans les meilleurs délais.',
    newMessage: 'Nouveau message',
    errorTitle: 'Erreur',
    errorRetry: 'Réessayer',
    validation: {
      nameRequired: 'Le nom est requis',
      emailRequired: 'L\'email est requis',
      emailInvalid: 'Email invalide',
      subjectRequired: 'Le sujet est requis',
      messageRequired: 'Le message est requis',
      messageTooShort: 'Le message doit contenir au moins 10 caractères',
    },
  },
  en: {
    name: 'Full name',
    email: 'Email',
    subject: 'Subject',
    message: 'Your message',
    send: 'Send message',
    sending: 'Sending...',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@email.com',
    subjectPlaceholder: 'How can I help?',
    messagePlaceholder: 'Tell me about your idea, project, or opportunity...',
    successTitle: 'Thank you for your message',
    successText: 'I will get back to you shortly.',
    newMessage: 'New message',
    errorTitle: 'Error',
    errorRetry: 'Retry',
    validation: {
      nameRequired: 'Name is required',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email format',
      subjectRequired: 'Subject is required',
      messageRequired: 'Message is required',
      messageTooShort: 'Message must be at least 10 characters',
    },
  },
}

export default function ContactForm({ locale = 'fr', onSubmitSuccess, onSubmitError }) {
  const t = LABELS[locale] || LABELS.fr
  const formRef = useRef(null)
  const submitTimeoutRef = useRef(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)

  // Handle input change with real-time validation
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Validate form fields
  const validateForm = () => {
    const newErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t.validation.nameRequired
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t.validation.emailRequired
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = t.validation.emailInvalid
    } else if (formData.email.length > 255) {
      newErrors.email = 'Email must be less than 255 characters'
    }

    // Subject validation
    if (!formData.subject.trim()) {
      newErrors.subject = t.validation.subjectRequired
    } else if (formData.subject.length > 255) {
      newErrors.subject = 'Subject must be less than 255 characters'
    }

    // Message validation
    if (!formData.message.trim()) {
      newErrors.message = t.validation.messageRequired
    } else if (formData.message.length < 10) {
      newErrors.message = t.validation.messageTooShort
    } else if (formData.message.length > 5000) {
      newErrors.message = 'Message must be less than 5000 characters'
    }

    return newErrors
  }

  // Check if email format is valid (basic regex)
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // Collect visitor metadata (IP, user agent)
  const getVisitorMetadata = () => {
    return {
      user_agent: navigator.userAgent || '',
      // Note: IP address cannot be reliably obtained from frontend
      // Server/Edge Function can determine this from request headers
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    // Spam prevention: Check if too many submissions in short time
    const now = Date.now()
    if (now - lastSubmitTime < 3000) {
      setSubmitError('Please wait a few seconds before submitting again')
      return
    }
    setLastSubmitTime(now)

    // Validate form
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clear errors and start loading
    setErrors({})
    setIsLoading(true)
    setSubmitError(null)

    try {
      // Submit message to contactService
      const { success, message_id, error } = await submitContactMessage({
        visitor_name: formData.name.trim(),
        visitor_email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        ...getVisitorMetadata(),
      })

      if (!success) {
        throw new Error(error || 'Failed to submit message')
      }

      // Success state
      setFormData({ name: '', email: '', subject: '', message: '' })
      setIsSubmitted(true)

      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess({ message_id })
      }

      // Auto-reset form after 5 seconds
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current)
      }
      submitTimeoutRef.current = setTimeout(() => {
        setIsSubmitted(false)
      }, 5000)
    } catch (err) {
      console.error('Error submitting contact form:', err)
      setSubmitError(err.message || 'An error occurred. Please try again.')

      // Call error callback if provided
      if (onSubmitError) {
        onSubmitError({ error: err.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current)
      }
    }
  }, [])

  return (
    <form
      className="contact-form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-label={locale === 'fr' ? 'Formulaire de contact' : 'Contact form'}
    >
      <div className="form-heading">
        <div>
          <small>
            {locale === 'fr' ? 'FORMULAIRE DE CONTACT' : 'CONTACT FORM'}
          </small>
          <h3>
            {locale === 'fr'
              ? 'Parlez-moi de votre projet'
              : 'Tell me about your project'}
          </h3>
        </div>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>

      {isSubmitted ? (
        <div className="success-state" role="alert">
          <span>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <h3>{t.successTitle}</h3>
          <p>{t.successText}</p>
          <button
            type="button"
            className="btn-reset"
            onClick={() => setIsSubmitted(false)}
            aria-label={t.newMessage}
          >
            {t.newMessage}
          </button>
        </div>
      ) : (
        <>
          {submitError && (
            <div className="form-error-alert" role="alert">
              <strong>{t.errorTitle}:</strong> {submitError}
            </div>
          )}

          <div className="field-row">
            <label htmlFor="contact-name">
              <span>{t.name}</span>
              <input
                id="contact-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t.namePlaceholder}
                required
                disabled={isLoading}
                className={errors.name ? 'has-error' : ''}
                maxLength="255"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <span className="field-error" id="name-error">
                  {errors.name}
                </span>
              )}
            </label>
            <label htmlFor="contact-email">
              <span>{t.email}</span>
              <input
                id="contact-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t.emailPlaceholder}
                required
                disabled={isLoading}
                className={errors.email ? 'has-error' : ''}
                maxLength="255"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <span className="field-error" id="email-error">
                  {errors.email}
                </span>
              )}
            </label>
          </div>

          <label htmlFor="contact-subject">
            <span>{t.subject}</span>
            <input
              id="contact-subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder={t.subjectPlaceholder}
              required
              disabled={isLoading}
              className={errors.subject ? 'has-error' : ''}
              maxLength="255"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'subject-error' : undefined}
            />
            {errors.subject && (
              <span className="field-error" id="subject-error">
                {errors.subject}
              </span>
            )}
          </label>

          <label htmlFor="contact-message">
            <span>{t.message}</span>
            <textarea
              id="contact-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder={t.messagePlaceholder}
              required
              disabled={isLoading}
              className={errors.message ? 'has-error' : ''}
              maxLength="5000"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
            />
            {errors.message && (
              <span className="field-error" id="message-error">
                {errors.message}
              </span>
            )}
            <small className="field-hint">
              {formData.message.length} / 5000
            </small>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            aria-busy={isLoading}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>{isLoading ? t.sending : t.send}</span>
          </button>
        </>
      )}
    </form>
  )
}

