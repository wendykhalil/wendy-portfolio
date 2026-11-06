import { supabase } from '../lib/supabaseClient'

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, session, error}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { user: null, session: null, error: error.message }
    }

    return { user: data.user, session: data.session, error: null }
  } catch (err) {
    return { user: null, session: null, error: err.message }
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    return { error: error ? error.message : null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Get the current session
 * @returns {Promise<{session, error}>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      return { session: null, error: error.message }
    }
    return { session: data.session, error: null }
  } catch (err) {
    return { session: null, error: err.message }
  }
}

/**
 * Get the current user
 * @returns {Promise<{user, error}>}
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      return { user: null, error: error.message }
    }
    return { user: data.user, error: null }
  } catch (err) {
    return { user: null, error: err.message }
  }
}

/**
 * Check if a user has admin role
 * Queries the admin_users table to verify authorization
 * @param {string} userId - User ID from auth.users
 * @returns {Promise<{isAdmin, error}>}
 */
export async function checkAdminRole(userId) {
  try {
    if (!userId) {
      return { isAdmin: false, error: null }
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Not found is expected for non-admin users
      if (error.code === 'PGRST116') {
        return { isAdmin: false, error: null }
      }
      return { isAdmin: false, error: error.message }
    }

    return { isAdmin: !!data, error: null }
  } catch (err) {
    return { isAdmin: false, error: err.message }
  }
}

/**
 * Listen to auth state changes
 * @param {function} callback - Callback function (user, session)
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      const user = session?.user || null
      callback(user, session, event)
    }
  )

  return () => {
    data?.subscription?.unsubscribe?.()
  }
}
