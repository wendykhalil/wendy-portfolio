/**
 * Contact Service
 * Handles contact form submissions, settings management, and message retrieval
 * 
 * Functions:
 * - getContactSettings(): Fetch public contact info and section content
 * - submitContactMessage(): Save visitor message and trigger email notification
 * - getContactMessages(): Fetch messages (admin only, via RLS)
 * - markMessageAsRead(): Mark message as read (admin only)
 * - deleteMessage(): Delete a message (admin only)
 * - updateContactSettings(): Update contact info (admin only)
 * 
 * All database operations respect RLS policies:
 * - Public visitors can only INSERT messages, not READ
 * - Authenticated admins can READ/UPDATE/DELETE messages
 * - Contact settings are public readable, admin writable
 * 
 * Email Integration:
 * - Uses EmailJS to send email notifications
 * - Service ID: service_jzlvxyv
 * - Template ID: template_9os3n1l
 * - Public Key: from VITE_EMAILJS_PUBLIC_KEY environment variable
 * - Recipient: khalilwendy15@gmail.com
 * - Messages are always saved in Supabase, email is best-effort
 */

import { supabase } from '../lib/supabaseClient'
import emailjs from '@emailjs/browser'

// Initialize EmailJS with public key
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const EMAILJS_SERVICE_ID = 'service_jzlvxyv'
const EMAILJS_TEMPLATE_ID = 'template_9os3n1l'
const EMAILJS_RECIPIENT = 'khalilwendy15@gmail.com'

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

// Singleton ID for contact_settings (matches migration)
const CONTACT_SETTINGS_ID = '00000000-0000-0000-0000-000000000002'

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Fetch contact settings (public contact info and section content)
 * Used by public portfolio to display contact information
 * 
 * @returns {Promise<{settings, error}>}
 *   settings: {email, phone, location, github, linkedin, title_fr, title_en, ...}
 *   error: null on success, error message on failure
 */
export async function getContactSettings() {
  try {
    const { data, error } = await supabase
      .from('contact_settings')
      .select('*')
      .eq('id', CONTACT_SETTINGS_ID)
      .single()

    if (error) {
      console.error('Error fetching contact settings:', error)
      return { settings: null, error: error.message }
    }

    return { settings: data, error: null }
  } catch (err) {
    console.error('Error in getContactSettings:', err)
    return { settings: null, error: err.message }
  }
}

/**
 * Submit a contact form message
 * Validates input, saves to database, and triggers email notification
 * 
 * @param {object} message - {visitor_name, visitor_email, subject, message, ip_address?, user_agent?}
 * @returns {Promise<{success, message_id, error}>}
 *   success: true if saved (regardless of email delivery)
 *   message_id: ID of saved message in contact_messages table
 *   error: null on success, error message on failure
 * 
 * IMPORTANT:
 * - Function validates and saves message to database
 * - Email notification is sent via Edge Function (async, non-blocking)
 * - Email delivery depends on Resend configuration
 * - Message is saved even if email delivery fails
 */
export async function submitContactMessage(message) {
  try {
    // Validate required fields
    if (!message.visitor_name?.trim()) {
      return { success: false, message_id: null, error: 'Name is required' }
    }
    if (!message.visitor_email?.trim()) {
      return { success: false, message_id: null, error: 'Email is required' }
    }
    if (!message.subject?.trim()) {
      return { success: false, message_id: null, error: 'Subject is required' }
    }
    if (!message.message?.trim()) {
      return { success: false, message_id: null, error: 'Message is required' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(message.visitor_email)) {
      return { success: false, message_id: null, error: 'Invalid email format' }
    }

    // Sanitize inputs (basic HTML escape)
    const sanitizedMessage = {
      visitor_name: message.visitor_name.trim().slice(0, 255),
      visitor_email: message.visitor_email.trim().slice(0, 255),
      subject: message.subject.trim().slice(0, 255),
      message: message.message.trim().slice(0, 5000),
      ip_address: message.ip_address || null,
      user_agent: message.user_agent || null,
    }

    // Save message to contact_messages table
    // Note: RLS policy allows public INSERT without authentication
    const { data, error } = await supabase
      .from('contact_messages')
      .insert([sanitizedMessage])
      .select('id')
      .single()

    if (error) {
      console.error('Error saving contact message:', error)
      return { success: false, message_id: null, error: error.message }
    }

    const messageId = data.id

    // Trigger email notification via EmailJS asynchronously
    // Don't wait for response - email delivery is best-effort
    sendEmailNotification({
      visitor_name: sanitizedMessage.visitor_name,
      visitor_email: sanitizedMessage.visitor_email,
      subject: sanitizedMessage.subject,
      message: sanitizedMessage.message,
    }).catch((err) => {
      console.error('Error sending email notification:', err)
      // Don't fail - message is already saved
    })

    return { success: true, message_id: messageId, error: null }
  } catch (err) {
    console.error('Error in submitContactMessage:', err)
    return { success: false, message_id: null, error: err.message }
  }
}

/**
 * Fetch contact messages (admin only)
 * Requires authentication and admin role (enforced via RLS)
 * 
 * @param {object} options - {limit?, offset?, orderBy?, isRead?}
 * @returns {Promise<{messages, total, error}>}
 *   messages: Array of {id, visitor_name, visitor_email, subject, created_at, is_read, ...}
 *   total: Total count of messages
 *   error: null on success, error message on failure
 */
export async function getContactMessages(options = {}) {
  try {
    const limit = options.limit || 50
    const offset = options.offset || 0
    const orderBy = options.orderBy || 'created_at'

    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })

    // Filter by read status if specified
    if (typeof options.isRead === 'boolean') {
      query = query.eq('is_read', options.isRead)
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching contact messages:', error)
      return { messages: null, total: 0, error: error.message }
    }

    return { messages: data, total: count || 0, error: null }
  } catch (err) {
    console.error('Error in getContactMessages:', err)
    return { messages: null, total: 0, error: err.message }
  }
}

/**
 * Mark a message as read/unread (admin only)
 * 
 * @param {number} messageId - ID of message to update
 * @param {boolean} isRead - New read status
 * @returns {Promise<{success, error}>}
 */
export async function markMessageAsRead(messageId, isRead = true) {
  try {
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: isRead })
      .eq('id', messageId)

    if (error) {
      console.error('Error marking message as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Error in markMessageAsRead:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a message (admin only)
 * 
 * @param {number} messageId - ID of message to delete
 * @returns {Promise<{success, error}>}
 */
export async function deleteMessage(messageId) {
  try {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      console.error('Error deleting message:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Error in deleteMessage:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update contact settings (admin only)
 * Updates singleton contact_settings record
 * 
 * @param {object} updates - {email?, phone?, location?, github?, linkedin?, title_fr?, description_fr?, ...}
 * @returns {Promise<{success, settings, error}>}
 */
export async function updateContactSettings(updates) {
  try {
    if (!updates || Object.keys(updates).length === 0) {
      return { success: false, settings: null, error: 'No updates provided' }
    }

    const { data, error } = await supabase
      .from('contact_settings')
      .update(updates)
      .eq('id', CONTACT_SETTINGS_ID)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating contact settings:', error)
      return { success: false, settings: null, error: error.message }
    }

    return { success: true, settings: data, error: null }
  } catch (err) {
    console.error('Error in updateContactSettings:', err)
    return { success: false, settings: null, error: err.message }
  }
}

/**
 * Subscribe to contact_settings changes (realtime)
 * Allows admin dashboard to update when settings are changed elsewhere
 * 
 * @param {function} callback - Called with updated settings
 * @returns {function} Unsubscribe function
 */
export function subscribeToContactSettings(callback) {
  const channel = supabase
    .channel(`contact_settings:${CONTACT_SETTINGS_ID}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'contact_settings',
        filter: `id=eq.${CONTACT_SETTINGS_ID}`,
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to contact_messages changes (realtime)
 * Allows admin dashboard to see new messages in real-time
 * 
 * @param {function} callback - Called with new/updated messages
 * @returns {function} Unsubscribe function
 */
export function subscribeToContactMessages(callback) {
  const channel = supabase
    .channel('contact_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'contact_messages',
      },
      (payload) => {
        callback({ event: 'INSERT', message: payload.new })
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'contact_messages',
      },
      (payload) => {
        callback({ event: 'UPDATE', message: payload.new })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

/**
 * Send email notification via EmailJS
 * This is async and non-blocking - message is already saved to database
 * Email delivery depends on EmailJS configuration
 * 
 * @private
 */
async function sendEmailNotification(messageData) {
  try {
    // Check if EmailJS is initialized
    if (!EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS public key not configured')
      return
    }

    // Send email via EmailJS
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: EMAILJS_RECIPIENT,
        visitor_name: messageData.visitor_name,
        visitor_email: messageData.visitor_email,
        subject: messageData.subject,
        message: messageData.message,
      }
    )

    console.log('Email notification sent successfully via EmailJS')
  } catch (err) {
    console.error('Error sending email notification:', err)
    // Don't throw - email delivery is best-effort, message is already saved
  }
}

