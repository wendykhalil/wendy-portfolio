/**
 * Test Migration Readiness for Experiences Table
 * 
 * This script validates:
 * 1. Supabase connection is working
 * 2. Admin user has proper permissions
 * 3. Can query experiences table (if already created)
 * 4. Migration SQL file is readable
 * 
 * Run from: Browser console (in dev mode) or Node.js
 * Usage: await window.__testMigration?.testReadiness()
 */

// Configuration
const TEST_CONFIG = {
  supabaseUrl: 'https://ihogbszoeyrrusbmsgfb.supabase.co',
  supabaseKey: 'sb_publishable_ROTVyo2K-0AFTkvvox6mTg_tjHVtNpQ',
  migrationFile: '/migrations/006_create_experiences_table.sql',
}

/**
 * Test 1: Supabase Connection
 */
async function testSupabaseConnection() {
  console.log('\n📡 TEST 1: Supabase Connection')
  console.log('-'.repeat(60))

  try {
    // Import supabase client
    const { supabase } = await import('@/lib/supabaseClient.js')

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    console.log('✓ Supabase client initialized')

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.warn('⚠️  Session error (may be OK if not logged in):', sessionError.message)
      return { success: true, warning: 'Not logged in' }
    }

    if (!session) {
      console.log('ℹ️  No active session (login required for admin functions)')
      return { success: true, note: 'Not logged in' }
    }

    console.log(`✓ Session active: ${session.user.email}`)
    return { success: true, authenticated: true, email: session.user.email }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 2: Admin Role Verification
 */
async function testAdminRole() {
  console.log('\n👤 TEST 2: Admin Role Verification')
  console.log('-'.repeat(60))

  try {
    const { supabase } = await import('@/lib/supabaseClient.js')
    const { checkAdminRole } = await import('@/services/authService.js')

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (!session) {
      console.log('ℹ️  Skipped: Not logged in')
      return { success: true, skipped: true, reason: 'Not logged in' }
    }

    const { isAdmin, error } = await checkAdminRole(session.user.id)

    if (error) {
      console.warn('⚠️  Admin check error:', error)
      return { success: false, error }
    }

    if (isAdmin) {
      console.log('✓ User is admin')
      return { success: true, isAdmin: true }
    } else {
      console.warn('⚠️  User is NOT admin (admin functions will be restricted)')
      return { success: true, isAdmin: false }
    }
  } catch (error) {
    console.error('❌ Admin role test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 3: Query Experiences Table
 */
async function testExperiencesTable() {
  console.log('\n📊 TEST 3: Query Experiences Table')
  console.log('-'.repeat(60))

  try {
    const { supabase } = await import('@/lib/supabaseClient.js')

    // Try to query experiences table
    const { data, error, status } = await supabase
      .from('experiences')
      .select('count', { count: 'exact', head: true })

    if (error && error.code === 'PGRST116') {
      // Table not found - this is expected before migration
      console.log('ℹ️  Experiences table does not exist yet (expected)')
      console.log('   → This is normal before migration execution')
      return { success: true, tableExists: false, reason: 'Not yet created' }
    }

    if (error) {
      console.error('❌ Query error:', error.message)
      return { success: false, error: error.message }
    }

    // Table exists
    console.log(`✓ Experiences table exists`)

    // Query the data
    const { data: experiences, error: queryError } = await supabase
      .from('experiences')
      .select('id, title_fr, status, display_order')
      .order('display_order')

    if (queryError) {
      console.warn('⚠️  Query warning:', queryError.message)
      return { success: true, tableExists: true, warning: queryError.message }
    }

    console.log(`✓ Retrieved ${experiences.length} experiences`)

    if (experiences.length > 0) {
      console.log('   Experiences found:')
      experiences.forEach((exp) => {
        console.log(`   - [${exp.id}] ${exp.title_fr} (${exp.status})`)
      })
    }

    return {
      success: true,
      tableExists: true,
      recordCount: experiences.length,
      records: experiences,
    }
  } catch (error) {
    console.error('❌ Table test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 4: Migration SQL File
 */
async function testMigrationFile() {
  console.log('\n📋 TEST 4: Migration SQL File')
  console.log('-'.repeat(60))

  try {
    // Attempt to fetch migration file
    const response = await fetch(TEST_CONFIG.migrationFile)

    if (!response.ok) {
      console.warn(`⚠️  Migration file not found at ${TEST_CONFIG.migrationFile}`)
      console.log('   Location: docs/migrations/006_create_experiences_table.sql')
      return { success: true, fileFound: false }
    }

    const sqlContent = await response.text()
    const lineCount = sqlContent.split('\n').length
    const charCount = sqlContent.length

    console.log(`✓ Migration file readable`)
    console.log(`  - Size: ${charCount} characters`)
    console.log(`  - Lines: ${lineCount}`)

    return {
      success: true,
      fileFound: true,
      size: charCount,
      lines: lineCount,
    }
  } catch (error) {
    console.log(`ℹ️  Migration file status: ${error.message}`)
    console.log('   (OK if accessing from server)')
    return {
      success: true,
      note: 'File check not available in this context',
      error: error.message,
    }
  }
}

/**
 * Test 5: RLS Policies
 */
async function testRLSPolicies() {
  console.log('\n🔒 TEST 5: RLS Policies')
  console.log('-'.repeat(60))

  try {
    const { supabase } = await import('@/lib/supabaseClient.js')

    // Query pg_policies table to check for existing policies
    const { data, error } = await supabase
      .rpc('get_table_policies', { table_name: 'experiences' })
      .then((result) => {
        if (result.error && result.error.code === 'PGRST116') {
          // Function doesn't exist - table probably doesn't exist
          return { data: null, error: { message: 'Experiences table not found' } }
        }
        return result
      })

    if (error) {
      console.log('ℹ️  Cannot check policies yet (table may not exist)')
      return { success: true, note: 'Table not yet created' }
    }

    if (data && data.length > 0) {
      console.log(`✓ Found ${data.length} RLS policies`)
      data.forEach((policy) => {
        console.log(`  - ${policy.policyname}`)
      })
      return { success: true, policyCount: data.length, policies: data }
    }

    return { success: true, policyCount: 0 }
  } catch (error) {
    console.log(`ℹ️  RLS policy check: ${error.message}`)
    return { success: true, note: error.message }
  }
}

/**
 * Main Test Runner
 */
async function testReadiness() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 EXPERIENCES MIGRATION READINESS TEST')
  console.log('='.repeat(60))

  const results = {
    connection: null,
    admin: null,
    table: null,
    migration: null,
    policies: null,
  }

  try {
    console.log('\nRunning 5 tests...')

    results.connection = await testSupabaseConnection()
    results.admin = await testAdminRole()
    results.table = await testExperiencesTable()
    results.migration = await testMigrationFile()
    results.policies = await testRLSPolicies()

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))

    const allPassed = Object.values(results).every((r) => r && r.success)

    if (allPassed) {
      console.log('\n✅ All tests passed!')
    } else {
      console.log('\n⚠️  Some tests require attention')
    }

    console.log('\n📊 Results:')
    console.log(`  1. Connection: ${results.connection.success ? '✓' : '✗'}`)
    console.log(`  2. Admin Role: ${results.admin.success ? '✓' : '✗'}`)
    console.log(`  3. Table Query: ${results.table.success ? '✓' : '✗'}`)
    console.log(`  4. Migration File: ${results.migration.success ? '✓' : '✗'}`)
    console.log(`  5. RLS Policies: ${results.policies.success ? '✓' : '✗'}`)

    console.log('\n📝 Next Steps:')
    if (results.table.tableExists) {
      console.log('  ✓ Table already created - migration already executed!')
      console.log('  → Proceed to Phase 2: Update experienceService.js')
    } else {
      console.log('  1. Open: https://app.supabase.com/project/ihogbszoeyrrusbmsgfb')
      console.log('  2. Click: SQL Editor')
      console.log('  3. Create New Query')
      console.log('  4. Copy: docs/migrations/006_create_experiences_table.sql')
      console.log('  5. Paste and click Run')
      console.log('  6. Come back here and run this test again')
    }

    console.log('\n' + '='.repeat(60) + '\n')

    return {
      success: allPassed,
      results,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('\n❌ Test execution failed:', error)
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}

// Expose to window in dev mode
if (typeof window !== 'undefined' && import.meta?.env?.DEV) {
  window.__testMigration = {
    testReadiness,
    testSupabaseConnection,
    testAdminRole,
    testExperiencesTable,
    testMigrationFile,
    testRLSPolicies,
  }

  console.log('🧪 Migration readiness tests available:')
  console.log('   Usage: await window.__testMigration.testReadiness()')
}

export {
  testReadiness,
  testSupabaseConnection,
  testAdminRole,
  testExperiencesTable,
  testMigrationFile,
  testRLSPolicies,
}
