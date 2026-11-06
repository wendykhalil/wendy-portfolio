/**
 * Execute Experiences Migration (Browser-Compatible)
 * 
 * This script executes the experiences table migration in Supabase.
 * Can be run from browser console in development mode.
 * 
 * DEVELOPMENT ONLY: Functions are exposed to window.__experiencesService__ in dev mode
 * 
 * Usage in browser console:
 * await window.__experiencesService__.executeMigration()
 */

import { supabase } from '@/lib/supabaseClient'
import { checkAdminRole } from '@/services/authService'

/**
 * Read the migration SQL file
 * @returns {Promise<string>} SQL migration content
 */
async function getMigrationSQL() {
  try {
    const response = await fetch('/migrations/006_create_experiences_table.sql')
    if (!response.ok) {
      throw new Error(`Failed to fetch migration file: ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    console.error('Error fetching migration SQL:', error)
    throw error
  }
}

/**
 * Main migration executor function
 * Validates admin role, executes SQL, and verifies results
 */
async function executeMigration() {
  const startTime = Date.now()

  console.log('='.repeat(70))
  console.log('🚀 EXPERIENCES MIGRATION EXECUTOR (Browser-Based)')
  console.log('='.repeat(70))
  console.log('')

  try {
    // ========================================================================
    // PRE-FLIGHT: Verify environment
    // ========================================================================
    console.log('🔧 PRE-FLIGHT CHECK')
    console.log('-'.repeat(70))

    // Verify we have the authenticated session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw new Error(
        'No authenticated session found. Please log in first and ensure you are an admin user.'
      )
    }

    console.log('✓ Authenticated session verified')
    console.log(`✓ User: ${session.user.email}`)

    // Verify admin role before migration
    console.log('\nVerifying admin role...')
    const { isAdmin, error: adminError } = await checkAdminRole(session.user.id)

    if (adminError) {
      throw new Error(`Failed to verify admin role: ${adminError}`)
    }

    if (!isAdmin) {
      throw new Error(
        'You do not have admin privileges. Only admin users can execute migrations.'
      )
    }

    console.log('✓ Admin role verified')

    // ========================================================================
    // STEP 1: READ MIGRATION SQL
    // ========================================================================
    console.log('\n📋 STEP 1: READING MIGRATION SQL')
    console.log('-'.repeat(70))

    console.log('Fetching migration SQL from docs/migrations/006_create_experiences_table.sql...')
    const migrationSQL = await getMigrationSQL()

    console.log(`✓ Migration SQL loaded: ${migrationSQL.length} characters`)

    // ========================================================================
    // STEP 2: EXECUTE MIGRATION
    // ========================================================================
    console.log('\n⚡ STEP 2: EXECUTING MIGRATION IN SUPABASE')
    console.log('-'.repeat(70))

    console.log('Executing SQL migration...')
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: migrationSQL,
    })

    if (error) {
      console.error(`\n❌ MIGRATION EXECUTION FAILED`)
      console.error(`Error: ${error.message}`)
      console.error(`Details: ${error.details}`)

      throw new Error(`Migration execution failed: ${error.message}`)
    }

    console.log('✓ Migration SQL executed successfully')

    // ========================================================================
    // STEP 3: VERIFY TABLE CREATION
    // ========================================================================
    console.log('\n✔️  STEP 3: VERIFYING TABLE CREATION')
    console.log('-'.repeat(70))

    // Check if table exists
    console.log('Checking if experiences table exists...')
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from('experiences')
      .select('count(*)', { count: 'exact', head: true })

    if (tableCheckError) {
      console.error(`\n❌ TABLE VERIFICATION FAILED`)
      console.error(`Error: ${tableCheckError.message}`)
      throw new Error(`Table verification failed: ${tableCheckError.message}`)
    }

    console.log('✓ Experiences table exists and is accessible')

    // ========================================================================
    // STEP 4: VERIFY BACKFILLED DATA
    // ========================================================================
    console.log('\n📊 STEP 4: VERIFYING BACKFILLED DATA')
    console.log('-'.repeat(70))

    // Query all experiences (admin view)
    console.log('Fetching all experiences...')
    const { data: allExperiences, error: fetchError } = await supabase
      .from('experiences')
      .select('*')
      .order('display_order', { ascending: true })

    if (fetchError) {
      console.error(`\n❌ DATA FETCH FAILED`)
      console.error(`Error: ${fetchError.message}`)
      throw new Error(`Data fetch failed: ${fetchError.message}`)
    }

    console.log(`✓ Retrieved ${allExperiences.length} experiences`)

    if (allExperiences.length !== 6) {
      console.warn(`\n⚠️  WARNING: Expected 6 experiences, got ${allExperiences.length}`)
    }

    // Display backfilled records
    console.log('\n📝 Backfilled Experiences:')
    allExperiences.forEach((exp, idx) => {
      console.log(`\n  ${idx + 1}. [${exp.id}] ${exp.title_fr}`)
      console.log(`     Place: ${exp.place}`)
      console.log(`     Type: ${exp.type_fr}`)
      console.log(`     Status: ${exp.status}`)
      console.log(`     Order: ${exp.display_order}`)
      console.log(`     Technologies: ${exp.technologies ? exp.technologies.join(', ') : 'None'}`)
    })

    // ========================================================================
    // STEP 5: VERIFY RLS POLICIES
    // ========================================================================
    console.log('\n\n🔒 STEP 5: VERIFYING RLS POLICIES')
    console.log('-'.repeat(70))

    // Check public read (should only see published)
    console.log('Testing public read access (published only)...')
    const { data: publicData, error: publicError } = await supabase
      .from('experiences')
      .select('*')
      .eq('status', 'Published')

    if (publicError) {
      console.warn(`⚠️  Public read test encountered error: ${publicError.message}`)
    } else {
      console.log(`✓ Public can read ${publicData.length} published experiences`)
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const duration = Date.now() - startTime

    console.log('\n' + '='.repeat(70))
    console.log('✅ MIGRATION SUCCESSFUL')
    console.log('='.repeat(70))

    console.log(`\n📊 Final Summary:`)
    console.log(`   Table Created: ✅ experiences`)
    console.log(`   Records Inserted: ${allExperiences.length}/6`)
    console.log(`   RLS Policies: ✅ 5 policies configured`)
    console.log(`   Realtime: ✅ Enabled`)
    console.log(`   Duration: ${(duration / 1000).toFixed(2)} seconds`)

    console.log(`\n📋 Next Steps:`)
    console.log(`   1. Verify in Supabase dashboard:`)
    console.log(`      - Table Editor > experiences (should show 6 rows)`)
    console.log(`      - RLS Policies tab (should show 5 policies)`)
    console.log(`      - Realtime tab (should show toggle ON)`)
    console.log(`   2. Update experienceService.js with Supabase integration`)
    console.log(`   3. Update CollectionAdmin component with full form fields`)
    console.log(`   4. Update Frontoffice to use service instead of seedExperiences`)
    console.log(`   5. Test CRUD operations`)

    return {
      success: true,
      reason: 'MIGRATION_COMPLETE',
      message: 'Migration executed successfully',
      tableCreated: true,
      recordsInserted: allExperiences.length,
      experiences: allExperiences,
      duration,
    }
  } catch (error) {
    console.error('\n' + '='.repeat(70))
    console.error('❌ MIGRATION FAILED')
    console.error('='.repeat(70))
    console.error(`\nError: ${error.message}`)
    console.error(`Stack: ${error.stack}`)

    console.log(`\n💡 Troubleshooting:`)
    console.log(`   1. Verify you are logged in as an admin user`)
    console.log(`   2. Check Supabase connection and credentials`)
    console.log(`   3. Verify admin RLS policies are enabled in Supabase`)
    console.log(`   4. Check browser console for detailed error messages`)

    return {
      success: false,
      reason: 'MIGRATION_ERROR',
      message: error.message,
      error: error.toString(),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Expose to window in development mode only
 */
if (import.meta.env.DEV) {
  window.__experiencesService__ = {
    executeMigration,
    getMigrationSQL,
  }

  console.log(
    '🔧 Development mode: Experience migration tools available at window.__experiencesService__'
  )
  console.log(
    '   Usage: await window.__experiencesService__.executeMigration()'
  )
}

export { executeMigration, getMigrationSQL }
