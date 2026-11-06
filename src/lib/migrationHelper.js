/**
 * Migration Helper - Browser-Compatible with State Machine
 * 
 * Exposes skillService migration functions for browser-based execution.
 * 
 * DEVELOPMENT ONLY: Functions are exposed to window.__skillService__ only in dev mode.
 * 
 * Uses existing authenticated Supabase session and respects RLS admin policies.
 * 
 * STATE MACHINE SAFETY:
 * - Prevents concurrent/duplicate migrations
 * - Prevents concurrent/duplicate confirmations
 * - Validates operation IDs to prevent cross-confirmation attacks
 * - Blocks new migrations while one is awaiting confirmation or running
 * 
 * Usage in browser console:
 * await window.__skillService__.executeFullMigration()
 */

import * as skillService from "@/services/skillService"
import { supabase } from "@/lib/supabaseClient"
import { checkAdminRole } from "@/services/authService"

/**
 * MIGRATION STATE MACHINE
 * 
 * Prevents concurrent/duplicate migrations and confirmations
 * States: idle → running → awaiting_confirmation → inserting → completed | cancelled | error
 * 
 * SAFETY GUARANTEES:
 * - executeFullMigration() blocked while migration running or awaiting confirmation
 * - __confirmInsertion() blocked after cancellation or completion
 * - __confirmInsertion() validates operation ID to prevent cross-confirmation attacks
 * - No concurrent insertions
 * - Prevents accidental double-confirmation
 */
const migrationState = {
  status: "idle", // idle | running | awaiting_confirmation | inserting | completed | cancelled | error
  operationId: null, // Unique ID for this migration operation
}

/**
 * Generate unique operation ID for this migration run
 * @returns {string} Unique operation ID (timestamp + random string)
 */
function generateOperationId() {
  return `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate that we can start a new migration
 * @throws {Error} If migration already running or awaiting confirmation
 */
function validateMigrationNotRunning() {
  if (migrationState.status === "running") {
    throw new Error(
      "❌ Migration already running. Cannot start another migration while one is in progress."
    )
  }
  if (migrationState.status === "awaiting_confirmation") {
    throw new Error(
      "❌ Migration awaiting confirmation. Call window.__skillService__.__confirmInsertion(true/false, operationId) first."
    )
  }
  if (migrationState.status === "inserting") {
    throw new Error(
      "❌ Migration is inserting data. Cannot start another migration during insertion."
    )
  }
}

/**
 * Validate that confirmation is being called for the correct operation
 * @param {string} expectedOperationId - Expected operation ID
 * @throws {Error} If confirmation state is invalid or operation ID mismatch
 */
function validateConfirmationState(expectedOperationId) {
  if (migrationState.status !== "awaiting_confirmation") {
    throw new Error(
      `❌ No migration awaiting confirmation. Current state: ${migrationState.status}`
    )
  }
  if (migrationState.operationId !== expectedOperationId) {
    throw new Error(
      "❌ Confirmation ID mismatch. This confirmation is not for the current migration."
    )
  }
}

/**
 * Main migration executor function
 * Runs all migration steps: Backup → Analyze → Prepare → Insert → Verify
 * 
 * SAFETY: Validates admin role before creating backup, blocks concurrent migrations
 */
async function executeFullMigration() {
  // SAFETY CHECK 1: Prevent concurrent migrations
  try {
    validateMigrationNotRunning()
  } catch (error) {
    console.error(error.message)
    return {
      success: false,
      reason: "MIGRATION_ALREADY_RUNNING",
      message: error.message,
    }
  }

  // Generate unique operation ID for this migration
  const operationId = generateOperationId()
  migrationState.status = "running"
  migrationState.operationId = operationId

  const startTime = Date.now()

  console.log("=".repeat(70))
  console.log("🚀 SKILLS MIGRATION EXECUTOR (Browser-Based)")
  console.log("=".repeat(70))
  console.log(`\n📋 Operation ID: ${operationId}`)
  console.log(`   (Use this ID in confirmation: __confirmInsertion(true/false, "${operationId}"))\n`)

  try {
    // ========================================================================
    // PRE-FLIGHT: Verify environment
    // ========================================================================
    console.log("🔧 PRE-FLIGHT CHECK")
    console.log("-".repeat(70))

    // Verify we have the authenticated session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw new Error(
        "No authenticated session found. Please log in first and ensure you are an admin user."
      )
    }

    console.log("✓ Authenticated session verified")
    console.log(`✓ User: ${session.user.email}`)

    // Verify admin role before backup
    console.log("\nVerifying admin role...")
    const { isAdmin, error: adminError } = await checkAdminRole(session.user.id)

    if (adminError) {
      throw new Error(
        `Failed to verify admin role: ${adminError}`
      )
    }

    if (!isAdmin) {
      throw new Error(
        "You do not have admin privileges. Only admin users can execute migrations."
      )
    }

    console.log("✓ Admin role verified")

    // Verify all required functions exist
    const requiredFunctions = [
      "backupLocalStorage",
      "verifyBackup",
      "analyzeMigrationData",
      "prepareMigrationData",
      "insertSkillsBatch",
      "verifyMigration",
    ]

    const missingFunctions = requiredFunctions.filter(
      (fn) => typeof skillService[fn] !== "function"
    )

    if (missingFunctions.length > 0) {
      throw new Error(`Missing functions: ${missingFunctions.join(", ")}`)
    }
    console.log("✓ All required migration functions available")

    // ========================================================================
    // STEP 0: BACKUP & VERIFY
    // ========================================================================
    console.log("\n💾 STEP 0: CREATING & VERIFYING BACKUP")
    console.log("-".repeat(70))

    console.log("Creating backup of localStorage before any changes...")
    const backup = skillService.backupLocalStorage()

    if (!backup) {
      throw new Error(
        "Failed to create backup. Migration cancelled to prevent data loss."
      )
    }

    console.log(`✅ Backup created: ${backup.backupKey}`)
    console.log(`   • Skills backed up: ${backup.count}`)
    console.log(`   • Timestamp: ${backup.timestamp}`)

    // Verify backup is valid before proceeding
    console.log("\nVerifying backup integrity...")
    const backupVerification = skillService.verifyBackup(backup.backupKey)

    if (!backupVerification.valid) {
      throw new Error(
        `Backup verification failed: ${backupVerification.message}\n` +
        `Migration cancelled to prevent data loss. Backup is unreliable.`
      )
    }

    console.log(`✅ Backup verified: ${backupVerification.message}`)

    // ========================================================================
    // STEP 1: ANALYZE
    // ========================================================================
    console.log("\n📊 STEP 1: ANALYZING DATA")
    console.log("-".repeat(70))

    console.log("Analyzing localStorage vs Supabase...")
    const analysis = await skillService.analyzeMigrationData()

    console.log(`\n📈 Analysis Results:`)
    console.log(`   Local Skills: ${analysis.localCount}`)
    console.log(`   Database Skills: ${analysis.dbCount}`)
    console.log(`   New Skills (missing): ${analysis.missing.length}`)
    console.log(`   Invalid Levels: ${analysis.invalidLevels?.length || 0}`)
    console.log(`   Conflicts: ${analysis.conflicts?.length || 0}`)
    console.log(`   Duplicates Found: ${analysis.duplicates?.length || 0}`)

    // ========================================================================
    // SAFETY CHECK: Stop if issues detected
    // ========================================================================

    // Check 1: Invalid proficiency levels
    if (analysis.invalidLevels && analysis.invalidLevels.length > 0) {
      console.error(
        `\n❌ MIGRATION BLOCKED: Invalid proficiency levels found`
      )
      console.error(
        `\n   ${analysis.invalidLevels.length} skills have levels outside 1-5 range:`
      )
      analysis.invalidLevels.forEach((skill, idx) => {
        console.error(
          `   ${idx + 1}. "${skill.name}" (${skill.category}) → Level: ${skill.level}`
        )
      })
      console.error(`\n   Fix these skills manually before retrying migration.`)

      migrationState.status = "error"
      return {
        success: false,
        reason: "ANALYSIS_FAILED_INVALID_LEVELS",
        message: `${analysis.invalidLevels.length} skills have invalid proficiency levels (must be 1-5)`,
        analysis,
        duration: Date.now() - startTime,
      }
    }

    // Check 2: Conflicts detected
    if (analysis.conflicts && analysis.conflicts.length > 0) {
      console.error(`\n❌ MIGRATION BLOCKED: Conflicts detected`)
      console.error(
        `\n   ${analysis.conflicts.length} skills have conflicts between localStorage and database:`
      )
      analysis.conflicts.forEach((conflict, idx) => {
        console.error(
          `   ${idx + 1}. "${conflict.local.name}" (${conflict.local.category})`
        )
      })
      console.error(`\n   Conflicts must be resolved manually before migration.`)

      migrationState.status = "error"
      return {
        success: false,
        reason: "ANALYSIS_FAILED_CONFLICTS",
        message: `${analysis.conflicts.length} conflicts detected between localStorage and database`,
        analysis,
        duration: Date.now() - startTime,
      }
    }

    if (analysis.missing.length === 0) {
      console.warn(
        "\n⚠️  No skills to migrate. All skills already in database."
      )
      migrationState.status = "completed"
      return {
        success: true,
        reason: "NO_MIGRATION_NEEDED",
        message: "No skills to migrate - database is current",
        analysis,
        duration: Date.now() - startTime,
      }
    }

    if (analysis.duplicates && analysis.duplicates.length > 0) {
      console.log(`\n⚠️  Found ${analysis.duplicates.length} duplicate skills:`)
      analysis.duplicates.forEach((dup, idx) => {
        console.log(`   ${idx + 1}. "${dup.local.name}" (${dup.local.category})`)
      })
      console.log("   → These will be skipped (database version kept)")
    }

    // ========================================================================
    // STEP 2: PREPARE
    // ========================================================================
    console.log("\n🔧 STEP 2: PREPARING DATA")
    console.log("-".repeat(70))

    console.log("Preparing skills for insertion...")
    let prepared
    try {
      prepared = skillService.prepareMigrationData(analysis)
    } catch (prepareError) {
      console.error(`\n❌ PREPARATION FAILED`)
      console.error(`   ${prepareError.message}`)

      migrationState.status = "error"
      return {
        success: false,
        reason: "PREPARE_FAILED",
        message: prepareError.message,
        analysis,
        duration: Date.now() - startTime,
      }
    }

    console.log(`\n📦 Prepared Skills:`)
    console.log(`   Ready to Insert: ${prepared.length}`)

    if (prepared.length > 0) {
      const first = prepared[0]
      console.log(`\n   Sample skill to insert:`)
      console.log(`   • Name: ${first.name}`)
      console.log(`   • Category: ${first.category}`)
      console.log(`   • Status: ${first.status}`)
      console.log(`   • Featured: ${first.featured}`)
    }

    // ========================================================================
    // EXPLICIT CONFIRMATION BEFORE INSERT
    // ========================================================================
    if (prepared.length > 0) {
      console.log("\n" + "=".repeat(70))
      console.log("⚠️  CONFIRMATION REQUIRED BEFORE INSERTION")
      console.log("=".repeat(70))
      console.log(`\nReady to insert ${prepared.length} skill(s) into Supabase.`)
      console.log(`\nThis action CANNOT be automatically undone. Inserted records will be`)
      console.log(`permanent in the database until manually deleted.`)
      console.log(`\n❓ Do you want to proceed with insertion?`)
      console.log(`\nEnter in console: await window.__skillService__.__confirmInsertion(true, "${operationId}")`)
      console.log(`Or cancel: await window.__skillService__.__confirmInsertion(false, "${operationId}")`)
      
      // Store prepared data for confirmation flow (with operation ID)
      window.__skillService__.__insertionInProgress = {
        operationId,
        analysis,
        backup,
        prepared,
        startTime,
      }

      // Change state to awaiting confirmation
      migrationState.status = "awaiting_confirmation"

      // Return control to user
      return {
        success: false,
        reason: "AWAITING_USER_CONFIRMATION",
        message: `Ready to insert ${prepared.length} skills - awaiting user confirmation`,
        prepared: prepared.length,
        operationId,
        instructions: `Call window.__skillService__.__confirmInsertion(true, "${operationId}") to proceed or (false, "${operationId}") to cancel`,
      }
    }

    // ========================================================================
    // STEP 3: No prepared skills
    // ========================================================================
    console.log("\n⬆️  STEP 3: INSERTING INTO SUPABASE")
    console.log("-".repeat(70))
    console.warn("\n⚠️  No skills to insert (all matched or duplicated).")
    
    migrationState.status = "completed"
    return {
      success: true,
      reason: "NO_SKILLS_TO_INSERT",
      message: "No new skills to insert",
      analysis,
      insertResult: { inserted: 0, failed: 0, errors: [] },
      duration: Date.now() - startTime,
    }
  } catch (error) {
    console.error("\n" + "=".repeat(70))
    console.error("❌ MIGRATION FAILED")
    console.error("=".repeat(70))
    console.error(`\nError: ${error.message}`)
    console.error(`Stack: ${error.stack}`)

    console.log(`\n💡 Troubleshooting:`)
    console.log(`   1. Verify you are logged in as an admin user`)
    console.log(`   2. Check Supabase connection and credentials`)
    console.log(`   3. Verify admin RLS policies are enabled in Supabase`)
    console.log(`   4. Check browser console for detailed error messages`)
    console.log(
      `   5. If some skills were inserted, manual cleanup in Supabase may be needed`
    )

    // Reset state on error
    migrationState.status = "error"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "MIGRATION_ERROR",
      message: error.message,
      error: error.toString(),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Handle user confirmation for insertion
 * Called from browser console after receiving AWAITING_USER_CONFIRMATION
 * 
 * SAFETY: Includes operation ID verification to prevent cross-confirmation attacks
 * and duplicate confirmations. State machine prevents concurrent operations.
 * 
 * @param {boolean} confirmed - true to proceed, false to cancel
 * @param {string} operationId - Operation ID returned by executeFullMigration() (REQUIRED)
 * @returns {Promise<Object>} Result of confirmation
 */
async function __confirmInsertion(confirmed, operationId) {
  // SAFETY CHECK 1: Validate confirmation parameters
  if (!operationId) {
    console.error(
      "❌ Operation ID required. Call with: __confirmInsertion(true/false, operationId)"
    )
    return {
      success: false,
      reason: "MISSING_OPERATION_ID",
      message: "Operation ID is required for confirmation",
    }
  }

  // SAFETY CHECK 2: Validate state machine
  try {
    validateConfirmationState(operationId)
  } catch (error) {
    console.error(error.message)
    // FIX #1: Do NOT modify state or delete pending migration
    // Keep the valid pending migration available for correct confirmation
    return {
      success: false,
      reason: "INVALID_CONFIRMATION_STATE",
      message: error.message,
    }
  }

  if (!window.__skillService__.__insertionInProgress) {
    console.error("❌ No insertion in progress. Run executeFullMigration() first.")
    // FIX #1: Only set error state if no valid pending migration exists
    return {
      success: false,
      reason: "NO_INSERTION_IN_PROGRESS",
      message: "No insertion in progress",
    }
  }

  const { operationId: stateOperationId, analysis, backup, prepared, startTime } = window.__skillService__.__insertionInProgress

  // SAFETY CHECK 3: Verify operation ID matches pending migration
  if (operationId !== stateOperationId) {
    console.error("❌ Operation ID mismatch - possible cross-confirmation attack")
    // FIX #1: Do NOT modify state or delete pending migration
    // Keep the valid pending migration available for correct confirmation
    return {
      success: false,
      reason: "OPERATION_ID_MISMATCH",
      message: "Operation ID does not match current migration",
    }
  }

  // SAFETY CHECK 4: Verify state is awaiting confirmation (final safety gate)
  if (migrationState.status !== "awaiting_confirmation") {
    console.error("❌ Migration state changed. Current state: " + migrationState.status)
    // FIX #3: Do NOT modify state or delete pending migration
    return {
      success: false,
      reason: "INVALID_STATE",
      message: `Cannot confirm: current state is ${migrationState.status}`,
    }
  }

  // FIX #3: Validate double-confirmation prevention
  // At this point: state is awaiting_confirmation AND operationId matches
  // This ensures only ONE confirmation can proceed

  if (!confirmed) {
    console.log("❌ Migration cancelled by user.")
    console.log(`\n💾 Backup has been preserved for safety:`)
    console.log(`   Key: ${backup.backupKey}`)
    console.log(`   Restore: window.__skillService__.rollbackMigration("${backup.backupKey}")`)

    // FIX #3: Ensure cancellation never inserts data
    // Verify state is still awaiting_confirmation (double-check)
    if (migrationState.status !== "awaiting_confirmation") {
      console.error("❌ ERROR: State changed during cancellation check")
      return {
        success: false,
        reason: "STATE_CHANGED",
        message: "Cannot cancel: state has changed",
      }
    }

    // Reset state on cancellation
    migrationState.status = "cancelled"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "USER_CANCELLED",
      message: "Migration cancelled by user - no data inserted",
      backupKey: backup.backupKey,
    }
  }

  // User confirmed - proceed with insertion
  console.log(`\n⬆️  STEP 3: INSERTING INTO SUPABASE (CONFIRMED)`)
  console.log("-".repeat(70))

  // Update state to inserting
  migrationState.status = "inserting"

  console.log(`Inserting ${prepared.length} skills into Supabase...`)
  let insertResult
  try {
    insertResult = await skillService.insertSkillsBatch(prepared)
  } catch (insertError) {
    console.error(`\n❌ INSERTION ERROR`)
    console.error(`   ${insertError.message}`)

    migrationState.status = "error"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "INSERT_FAILED",
      message: insertError.message,
      analysis,
      duration: Date.now() - startTime,
    }
  }

  console.log(`\n✅ Insertion Complete:`)
  console.log(`   Inserted: ${insertResult.inserted}/${prepared.length}`)
  console.log(`   Failed: ${insertResult.failed}/${prepared.length}`)

  // Report partial insertion failures
  if (insertResult.failed > 0) {
    console.error(
      `\n⚠️  PARTIAL FAILURE: ${insertResult.failed} skill(s) failed to insert`
    )

    if (insertResult.errors && insertResult.errors.length > 0) {
      console.error(`\n   Failed skills (${insertResult.errors.length}):`)
      insertResult.errors.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err}`)
      })
    }

    console.error(`\n   ⚠️  IMPORTANT:`)
    console.error(
      `   • ${insertResult.inserted} skill(s) WERE successfully inserted into Supabase`
    )
    console.error(`   • These inserted records are now in the database permanently`)
    console.error(`   • Partial insertions CANNOT be automatically undone`)
    console.error(
      `   • You may need to manually delete the inserted skills from Supabase`
    )
    console.error(`   • Fix the failing skills and retry the migration`)

    migrationState.status = "error"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "INSERT_PARTIAL_FAILURE",
      message: `${insertResult.failed} skills failed to insert (${insertResult.inserted} inserted)`,
      analysis,
      insertResult,
      duration: Date.now() - startTime,
    }
  }

  if (insertResult.inserted === 0) {
    console.warn("\n⚠️  No skills were inserted (0 attempted).")

    migrationState.status = "completed"
    delete window.__skillService__.__insertionInProgress

    return {
      success: true,
      reason: "NO_INSERTION_NEEDED",
      message: "No skills inserted",
      analysis,
      insertResult,
      duration: Date.now() - startTime,
    }
  }

  // ========================================================================
  // STEP 4: VERIFY
  // ========================================================================
  console.log("\n✔️  STEP 4: VERIFYING MIGRATION")
  console.log("-".repeat(70))

  console.log("Verifying all skills exist in database...")
  let verifyResult
  try {
    verifyResult = await skillService.verifyMigration()
  } catch (verifyError) {
    console.error(`\n❌ VERIFICATION ERROR`)
    console.error(`   ${verifyError.message}`)

    console.error(`\n⚠️  CRITICAL: This error means verification could not complete.`)
    console.error(`   The database state is UNCERTAIN. Do NOT proceed further.`)
    console.error(
      `   ${insertResult.inserted} skill(s) may have been inserted already.`
    )

    migrationState.status = "error"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "VERIFY_ERROR",
      message: verifyError.message,
      insertResult,
      verifyResult: null,
      duration: Date.now() - startTime,
    }
  }

  // ========================================================================
  // STRICT VERIFICATION CHECK
  // ========================================================================
  if (!verifyResult.passed || (verifyResult.extra && verifyResult.extra.length > 0)) {
    console.error(`\n❌ VERIFICATION FAILED!`)
    console.error(`   ${verifyResult.summary || "Data mismatch detected"}`)

    if (verifyResult.missing && verifyResult.missing.length > 0) {
      console.error(
        `\n   Missing from database (${verifyResult.missing.length}):`
      )
      verifyResult.missing.forEach((skill, idx) => {
        console.error(`     ${idx + 1}. "${skill.name}" (${skill.category})`)
      })
    }

    if (verifyResult.mismatches && verifyResult.mismatches.length > 0) {
      console.error(`\n   Mismatched fields (${verifyResult.mismatches.length} skills):`)
      verifyResult.mismatches.forEach((skill, idx) => {
        const diffs = Object.keys(skill.differences).join(", ")
        console.error(`     ${idx + 1}. "${skill.name}": ${diffs}`)
      })
    }

    if (verifyResult.extra && verifyResult.extra.length > 0) {
      console.error(`\n   Extra records in database (${verifyResult.extra.length}):`)
      verifyResult.extra.forEach((skill, idx) => {
        console.error(
          `     ${idx + 1}. "${skill.name}" (not in migration data)`
        )
      })
    }

    console.error(`\n⚠️  IMPORTANT CLARIFICATION:`)
    console.error(
      `   • Verification failure does NOT automatically undo Supabase inserts`
    )
    console.error(
      `   • ${insertResult.inserted} skill(s) were already inserted into Supabase`
    )
    console.error(
      `   • Restoring localStorage backup does NOT remove Supabase records`
    )
    console.error(`   • localStorage and Supabase are separate systems`)
    console.error(`   • Manual cleanup in Supabase may be needed before retry`)

    migrationState.status = "error"
    delete window.__skillService__.__insertionInProgress

    return {
      success: false,
      reason: "VERIFY_FAILED",
      message: "Verification failed - data mismatch detected or extra records found",
      analysis,
      insertResult,
      verifyResult,
      duration: Date.now() - startTime,
    }
  }

  console.log(`\n✅ Verification Passed:`)
  console.log(`   ${verifyResult.summary}`)

  // ========================================================================
  // SUCCESS
  // ========================================================================
  const duration = Date.now() - startTime

  console.log("\n" + "=".repeat(70))
  console.log("✅ MIGRATION SUCCESSFUL")
  console.log("=".repeat(70))

  console.log(`\n📊 Final Summary:`)
  console.log(`   Skills Analyzed: ${analysis.localCount}`)
  console.log(`   Skills to Migrate: ${prepared.length}`)
  console.log(`   Skills Inserted: ${insertResult.inserted}`)
  console.log(`   Duplicates Skipped: ${analysis.duplicates?.length || 0}`)
  console.log(`   Verification: ✅ PASSED`)
  console.log(`   Duration: ${(duration / 1000).toFixed(2)} seconds`)

  console.log(`\n📝 Backup Reference (for rollback if needed):`)
  console.log(`   Key: ${backup.backupKey}`)
  console.log(
    `   Restore: window.__skillService__.rollbackMigration("${backup.backupKey}")`
  )

  console.log(
    `\n⏭️  NEXT STEPS (Manual testing required before clearing localStorage):`
  )
  console.log(`   1. ✅ Review console output above - any errors?`)
  console.log(
    `   2. 🔄 Test Realtime Sync (open public portfolio in another window)`
  )
  console.log(`   3. 📊 Verify published skills appear on public site`)
  console.log(`   4. 🧪 Test CRUD: create, edit, delete skills in admin panel`)
  console.log(`   5. ✅ Verify changes sync to public site in real-time`)
  console.log(
    `   6. 🧹 ONLY AFTER all tests pass, delete localStorage manually:`
  )
  console.log(`      → window.localStorage.removeItem("mk-skills")`)

  console.log(`\n⚠️  DO NOT:`)
  console.log(`   • Skip manual testing (steps 2-5 are required)`)
  console.log(`   • Delete localStorage before testing is complete`)
  console.log(
    `   • Assume "verified" means the features work (automatic verification ≠ manual testing)`
  )

  migrationState.status = "completed"
  delete window.__skillService__.__insertionInProgress

  return {
    success: true,
    reason: "MIGRATION_COMPLETE",
    message: "Migration completed successfully",
    analysis,
    insertResult,
    verifyResult,
    backupKey: backup.backupKey,
    duration,
  }
}

/**
 * Get current migration state (for debugging)
 * @returns {Object} Current migration state
 */
function getMigrationState() {
  return {
    status: migrationState.status,
    operationId: migrationState.operationId,
    hasInsertionInProgress: !!window.__skillService__?.__insertionInProgress,
  }
}

/**
 * Force reset migration state (DANGEROUS - manual recovery only)
 * Use ONLY if migration is stuck and cannot proceed
 * 
 * FIX #2: Never allow reset while status is running or inserting
 * This prevents interrupting an active Supabase insertion
 * 
 * WARNING: Do NOT use this unless you understand the risks
 * This bypasses all safety checks
 * 
 * @returns {Object} State before reset, or error if reset blocked
 */
function __resetMigrationState() {
  // FIX #2: Block reset during active operations
  if (migrationState.status === "running") {
    console.error("❌ Cannot reset: migration is running. Wait for completion or error.")
    return {
      success: false,
      reason: "CANNOT_RESET_DURING_RUNNING",
      message: "Cannot reset migration state while running",
      currentState: migrationState.status,
    }
  }

  if (migrationState.status === "inserting") {
    console.error("❌ Cannot reset: Supabase insertion in progress. Do NOT interrupt.")
    return {
      success: false,
      reason: "CANNOT_RESET_DURING_INSERTING",
      message: "Cannot reset migration state while inserting data",
      currentState: migrationState.status,
    }
  }

  // FIX #2: Allow reset for genuinely stuck states (completed, cancelled, error, awaiting_confirmation)
  if (!["idle", "completed", "cancelled", "error", "awaiting_confirmation"].includes(migrationState.status)) {
    console.error(`❌ Cannot reset: unknown state "${migrationState.status}". This should not happen.`)
    return {
      success: false,
      reason: "UNKNOWN_STATE",
      message: `Cannot reset: unknown state "${migrationState.status}"`,
      currentState: migrationState.status,
    }
  }

  console.warn("⚠️  RESETTING MIGRATION STATE (manual recovery)")
  const before = { ...migrationState }
  
  migrationState.status = "idle"
  migrationState.operationId = null
  if (window.__skillService__) {
    delete window.__skillService__.__insertionInProgress
  }
  
  console.log("Migration state reset. Before:", before)
  console.log("Migration state after reset:", migrationState)
  
  return {
    success: true,
    message: "Migration state reset",
    before,
  }
}

/**
 * Expose to window in development mode only
 */
if (import.meta.env.DEV) {
  window.__skillService__ = {
    executeFullMigration,
    __confirmInsertion,
    getMigrationState,
    __resetMigrationState,
    rollbackMigration: skillService.rollbackMigration,
    backupLocalStorage: skillService.backupLocalStorage,
    getAvailableBackups: skillService.getAvailableBackups,
    verifyBackup: skillService.verifyBackup,
  }

  console.log(
    "✅ Migration functions available in development mode:"
  )
  console.log(
    "   → await window.__skillService__.executeFullMigration()"
  )
  console.log(
    "   → window.__skillService__.getMigrationState()"
  )
  console.log(
    "   → window.__skillService__.rollbackMigration(backupKey)"
  )
}

export { executeFullMigration }
