/**
 * Skill Data Backup & Migration Helper
 * 
 * This script backs up current localStorage skills before migration to Supabase.
 * Run this in the browser console before executing migration tasks.
 * 
 * Usage in browser console:
 * 1. Copy entire file content
 * 2. Paste into browser console
 * 3. Run: backupSkills() to create backup
 * 4. Run: showBackupInfo() to verify backup created
 */

// ============================================================================
// BACKUP FUNCTION
// ============================================================================

function backupSkills() {
  const STORAGE_KEY = "mk-skills"
  const BACKUP_PREFIX = "mk-skills-backup"
  
  try {
    // Get current skills from localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    
    if (!stored) {
      console.warn("⚠️  No skills data found in localStorage. Nothing to backup.")
      return {
        success: false,
        message: "No skills data to backup",
        timestamp: new Date().toISOString(),
      }
    }
    
    // Parse and validate
    const skillsData = JSON.parse(stored)
    
    if (!Array.isArray(skillsData) || skillsData.length === 0) {
      console.warn("⚠️  Skills data is empty or invalid.")
      return {
        success: false,
        message: "Skills data is empty or invalid",
        count: skillsData.length || 0,
        timestamp: new Date().toISOString(),
      }
    }
    
    // Create backup with timestamp
    const timestamp = new Date().toISOString()
    const backupKey = `${BACKUP_PREFIX}-${Date.now()}`
    
    const backup = {
      timestamp,
      sourceKey: STORAGE_KEY,
      count: skillsData.length,
      data: skillsData,
      // Store metadata for verification
      metadata: {
        totalSkills: skillsData.length,
        published: skillsData.filter(s => s.status === "Published").length,
        draft: skillsData.filter(s => s.status === "Draft").length,
        featured: skillsData.filter(s => s.featured).length,
        categories: [...new Set(skillsData.map(s => s.category))],
      }
    }
    
    // Store backup in localStorage
    localStorage.setItem(backupKey, JSON.stringify(backup))
    
    // Also store reference to latest backup
    localStorage.setItem(`${BACKUP_PREFIX}-latest`, backupKey)
    
    // Log results
    console.log(
      `✅ Backup created successfully!\n` +
      `   Backup Key: ${backupKey}\n` +
      `   Skills Count: ${backup.count}\n` +
      `   Published: ${backup.metadata.published}\n` +
      `   Draft: ${backup.metadata.draft}\n` +
      `   Timestamp: ${timestamp}`
    )
    
    return {
      success: true,
      message: "Backup created successfully",
      backupKey,
      count: backup.count,
      metadata: backup.metadata,
      timestamp,
    }
  } catch (error) {
    console.error("❌ Error creating backup:", error)
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.toString(),
      timestamp: new Date().toISOString(),
    }
  }
}

// ============================================================================
// VERIFICATION FUNCTION
// ============================================================================

function showBackupInfo() {
  const BACKUP_PREFIX = "mk-skills-backup"
  const STORAGE_KEY = "mk-skills"
  
  try {
    console.log("=" .repeat(60))
    console.log("BACKUP INFORMATION")
    console.log("=" .repeat(60))
    
    // Show current skills
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const skillsData = JSON.parse(stored)
      console.log(`\n📊 CURRENT SKILLS (${skillsData.length} total):`)
      console.log(`   Published: ${skillsData.filter(s => s.status === "Published").length}`)
      console.log(`   Draft: ${skillsData.filter(s => s.status === "Draft").length}`)
      console.log(`   Featured: ${skillsData.filter(s => s.featured).length}`)
    } else {
      console.log("\n⚠️  No current skills in localStorage")
    }
    
    // List all backups
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(BACKUP_PREFIX) && key !== `${BACKUP_PREFIX}-latest`)
      .sort()
      .reverse()
    
    console.log(`\n💾 AVAILABLE BACKUPS (${backupKeys.length} total):`)
    
    backupKeys.forEach((key, idx) => {
      try {
        const backup = JSON.parse(localStorage.getItem(key))
        console.log(`   ${idx + 1}. ${key}`)
        console.log(`      • Created: ${backup.timestamp}`)
        console.log(`      • Skills: ${backup.count}`)
        console.log(`      • Published: ${backup.metadata.published}`)
        console.log(`      • Draft: ${backup.metadata.draft}`)
      } catch (e) {
        console.log(`   ${idx + 1}. ${key} (corrupted)`)
      }
    })
    
    if (backupKeys.length === 0) {
      console.log("   No backups found. Run backupSkills() to create one.")
    }
    
    console.log("\n" + "=" .repeat(60))
    
  } catch (error) {
    console.error("Error displaying backup info:", error)
  }
}

// ============================================================================
// RESTORE FUNCTION (FOR ROLLBACK)
// ============================================================================

function restoreFromBackup(backupKey) {
  const STORAGE_KEY = "mk-skills"
  
  try {
    const backup = localStorage.getItem(backupKey)
    
    if (!backup) {
      console.error(`❌ Backup not found: ${backupKey}`)
      return { success: false, message: "Backup not found" }
    }
    
    const backupData = JSON.parse(backup)
    
    // Restore to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backupData.data))
    
    console.log(
      `✅ Restored from backup!\n` +
      `   Backup: ${backupKey}\n` +
      `   Skills Restored: ${backupData.count}\n` +
      `   Original Timestamp: ${backupData.timestamp}`
    )
    
    return {
      success: true,
      message: "Restored successfully",
      count: backupData.count,
      timestamp: backupData.timestamp,
    }
  } catch (error) {
    console.error("❌ Error restoring backup:", error)
    return { success: false, message: `Error: ${error.message}` }
  }
}

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

function exportBackupAsJson() {
  const STORAGE_KEY = "mk-skills"
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      console.warn("No skills data to export")
      return
    }
    
    const skillsData = JSON.parse(stored)
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSkills: skillsData.length,
      skills: skillsData,
    }
    
    // Create downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `skills-backup-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    console.log(`✅ Exported ${skillsData.length} skills to JSON file`)
    return true
  } catch (error) {
    console.error("Error exporting backup:", error)
    return false
  }
}

// ============================================================================
// QUICK START
// ============================================================================

console.log("🚀 Skills Backup Helper loaded!")
console.log("")
console.log("Available functions:")
console.log("  • backupSkills()           → Create a backup of current skills")
console.log("  • showBackupInfo()         → Show all backups and current status")
console.log("  • restoreFromBackup(key)   → Restore skills from a backup")
console.log("  • exportBackupAsJson()     → Export skills as downloadable JSON")
console.log("")
console.log("Example workflow:")
console.log("  1. backupSkills()          → Creates backup")
console.log("  2. showBackupInfo()        → Verify backup created")
console.log("  3. exportBackupAsJson()    → Optional: download as JSON")
console.log("")
