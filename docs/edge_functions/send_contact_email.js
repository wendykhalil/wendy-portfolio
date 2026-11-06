/**
 * Supabase Edge Function: send_contact_email
 * Purpose: Send email notification when contact form is submitted
 * Trigger: Called from contactService.js after message is saved to contact_messages table
 * 
 * Environment Variables (set in Supabase Secrets):
 * - RESEND_API_KEY: Your Resend API key for email delivery
 * 
 * Database:
 * - Reads from: contact_messages (the submitted message)
 * - No direct database modifications (caller handles that)
 * 
 * IMPORTANT:
 * - Email delivery is NOT operational until Resend is properly configured
 * - Requires valid Resend API key in Supabase Secrets
 * - Requires verified sender domain in Resend
 * - Private recipient email (khalilwendy15@gmail.com) is hardcoded, NOT exposed to frontend
 * 
 * CORS:
 * - Handles both OPTIONS (preflight) and POST requests
 * - Returns appropriate CORS headers for cross-origin requests
 * - Compatible with frontend calls from contactService.js
 * 
 * Security:
 * - All user input (visitor_name, visitor_email, subject, message) is HTML-escaped
 * - Input validation on required fields and email format
 * - RESEND_API_KEY never exposed in responses
 * - Sensitive details not logged to user responses
 * 
 * Implementation:
 * - Uses native fetch() to Resend API (no external SDK dependency)
 * - Eliminates startup time from external ESM module imports
 * - Reduces cold start latency and timeout risk
 * 
 * Deployment:
 * 1. Create this function in Supabase:
 *    - Go to Edge Functions in Supabase dashboard
 *    - Create new function: "send_contact_email"
 *    - Copy this file content
 *    - Deploy
 * 2. Set Resend API key in Supabase Secrets:
 *    - Go to Settings > Secrets
 *    - Add RESEND_API_KEY with your Resend API key
 * 3. Update contactService.js with the Edge Function URL
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RECIPIENT_EMAIL = 'khalilwendy15@gmail.com'
const SENDER_EMAIL = 'onboarding@resend.dev'
const RESEND_API_URL = 'https://api.resend.com/emails'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
}

/**
 * Validate email format using regex
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Main Edge Function Handler
 * Receives contact form submission and sends email notification
 * 
 * Request body:
 * {
 *   visitor_name: string (max 255 chars),
 *   visitor_email: string (max 255 chars, valid email format),
 *   subject: string (max 255 chars),
 *   message: string (10-5000 chars),
 *   message_id: number (from contact_messages table)
 * }
 */
export default async (req) => {
  try {
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Parse request body
    const { visitor_name, visitor_email, subject, message, message_id } = await req.json()

    // Validate that all required fields are strings
    if (typeof visitor_name !== 'string' || typeof visitor_email !== 'string' || 
        typeof subject !== 'string' || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'All required fields must be strings' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate required fields (check for empty strings)
    if (!visitor_name || !visitor_email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate field lengths
    const errors = []
    if (visitor_name.length > 255) errors.push('Name must be 255 characters or less')
    if (visitor_email.length > 255) errors.push('Email must be 255 characters or less')
    if (subject.length > 255) errors.push('Subject must be 255 characters or less')
    if (message.length < 10 || message.length > 5000) errors.push('Message must be between 10 and 5000 characters')

    // Validate email format
    if (!isValidEmail(visitor_email)) {
      errors.push('Invalid email format')
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured in Supabase Secrets')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured. Contact system administrator.'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Build email HTML content
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <h2 style="color: #2c3e50; margin-top: 0;">New Contact Form Submission</h2>
              
              <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #8b5cf6; border-radius: 4px;">
                <p style="margin: 0;"><strong>From:</strong> ${escapeHtml(visitor_name)}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(visitor_email)}">${escapeHtml(visitor_email)}</a></p>
                <p style="margin: 8px 0;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Message:</h3>
                <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;">
                  ${escapeHtml(message)}
                </div>
              </div>
              
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p style="margin: 5px 0;">Message ID: ${message_id || 'N/A'}</p>
                <p style="margin: 5px 0;">Submitted: ${new Date().toISOString()}</p>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p style="font-size: 12px; color: #999;">
                  Reply to this email to respond to ${escapeHtml(visitor_name)} at ${escapeHtml(visitor_email)}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend API using native fetch
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: RECIPIENT_EMAIL,
        reply_to: visitor_email,
        subject: `[Contact Form] ${subject}`,
        html: emailHtml,
      }),
    })

    // Parse Resend response
    const resendData = await resendResponse.json()

    // Check for API errors
    if (!resendResponse.ok) {
      console.error('Resend API error:', {
        status: resendResponse.status,
        error: resendData.error || resendData.message,
      })
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email notification'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        email_id: resendData.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

