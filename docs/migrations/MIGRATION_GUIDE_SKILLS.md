# Skills Module Migration Guide

## Overview

This guide walks through the complete migration of the Skills module from **localStorage** to **Supabase** with real-time synchronization.

**Timeline**: ~5.5 hours total
**Risk Level**: Medium (with rollback capability)
**Data Loss Risk**: Zero (with backup/restore procedures)

---

## Phase 0: Pre-Migration Checklist

Before starting the migration, verify:

- [ ] Supabase project is active and accessible
- [ ] User has admin role in `admin_users` table
- [ ] All skills data in localStorage is current
- [ ] No active skill editing sessions
- [ ] Browser console is accessible
- [ ] Network connection is stable

---

## Phase 1: Create Supabase Schema (30 min)

### Step 1.1: Apply SQL Migration

1. **Open Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Copy and Run Migration**
   - Open file: `docs/migrations/002_create_skills_table.sql`
   - Copy entire file content
   - Paste into Supabase SQL Editor
   - Click "Run" button

4. **Verify Creation**
   - Go to "Table Editor"
   - Should see new table: `public.skills`
   - Verify columns match schema (10 fields)
   - Verify 5 RLS policies are listed

### Step 1.2: Verify Schema Details

**Expected Columns:**
```
id (BIGSERIAL)
name (TEXT)
category (TEXT)
description_fr (TEXT)
description_en (TEXT)
level (INTEGER)
icon (TEXT)
featured (BOOLEAN)
status (TEXT)
display_order (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
created_by (UUID FK)
```

**Expected RLS Policies:**
- Skills: Public read published
- Skills: Admin read all
- Skills: Admin insert
- Skills: Admin update
- Skills: Admin delete

✅ **Success Criteria**: All columns and policies visible in Supabase dashboard

---

## Phase 2: Backup Current Skills (10 min)

### Step 2.1: Create Backup

1. **Load Application**
   - Start the Vite dev server
   - Open application in browser
   - Go to Admin panel (Skills section)

2. **Open Browser Console**
   - Press `F12` to open DevTools
   - Click "Console" tab

3. **Run Backup Script**
   - Open file: `docs/migrations/backup-skills.js`
   - Copy entire file content
   - Paste into browser console
   - Press Enter to load functions

4. **Execute Backup**
   - In console, type: `backupSkills()`
   - Press Enter
   - Wait for success message (✅)

5. **Verify Backup**
   - In console, type: `showBackupInfo()`
   - Verify backup key is displayed
   - Check skill counts match

### Step 2.2: Optional: Export Backup to File

1. **Export as JSON**
   - In console, type: `exportBackupAsJson()`
   - Browser will download `skills-backup-<timestamp>.json`
   - Save file in safe location

✅ **Success Criteria**: 
- Backup created with all skills
- `showBackupInfo()` shows backup key
- Optional: JSON file downloaded

---

## Phase 3: Analyze Data for Migration (15 min)

### Step 3.1: Check for Duplicates

1. **In App Admin Panel**
   - Click "Compétences" tab
   - Review all published and draft skills
   - Note any duplicate names/categories

2. **Check Consistency**
   - Verify all skills have required fields (name, category, descriptions)
   - Verify proficiency levels are valid
   - Note any missing data

### Step 3.2: Identify Issues

Look for:
- Skills with missing descriptions (FR or EN)
- Duplicate name + category combinations
- Invalid proficiency levels
- Missing categories

✅ **Success Criteria**: 
- Documented all data issues
- Know which skills need cleanup

---

## Phase 4: Prepare for Migration (15 min)

### Step 4.1: Optional Cleanup

If data issues found:

1. **Fix Missing Data**
   - Edit skills with missing descriptions
   - Add missing translations
   - Correct proficiency levels

2. **Handle Duplicates**
   - If duplicates exist, delete older version
   - Keep version with more complete data
   - Backup again after cleanup

3. **Save and Backup Again**
   - After cleanup, run: `backupSkills()` again
   - Create new backup key for reference

### Step 4.2: Verify Ready to Migrate

- [ ] All skills have name and category
- [ ] All skills have FR and EN descriptions
- [ ] No duplicate (name + category) combinations
- [ ] Proficiency levels are valid (1-5)
- [ ] Backup created and verified

✅ **Success Criteria**: Data ready for migration

---

## Phase 5: Execute Migration (2 hours)

### Step 5.1: Analyze Migration Data

1. **In Browser Console**
   - Import skillService: `import * as skillService from './src/services/skillService.js'`
   - Run analysis: `const analysis = await skillService.analyzeMigrationData()`
   - Check results: `console.log(analysis)`

2. **Review Analysis**
   - `localCount`: Number of skills in localStorage
   - `dbCount`: Number of skills already in database (should be 0)
   - `missing`: Skills that need to be inserted
   - `duplicates`: Skills already in database
   - `conflicts`: Any data conflicts

### Step 5.2: Prepare Migration Data

1. **Prepare for Insert**
   ```javascript
   const prepared = skillService.prepareMigrationData(analysis)
   console.log(`Ready to insert ${prepared.length} skills`)
   ```

2. **Review Prepared Data**
   - Check that only `missing` skills are in prepared list
   - Verify data transformation looks correct

### Step 5.3: Insert Skills into Supabase

1. **Execute Batch Insert**
   ```javascript
   const result = await skillService.insertSkillsBatch(prepared)
   console.log(`Inserted: ${result.inserted}, Failed: ${result.failed}`)
   ```

2. **Monitor Progress**
   - Watch for success/error messages
   - Check Supabase Table Editor to see new rows

3. **Verify in Supabase**
   - Go to Supabase dashboard
   - Open Table Editor
   - Select `skills` table
   - Should see all skills with correct data

### Step 5.4: Verify Migration

1. **Run Verification**
   ```javascript
   const verified = await skillService.verifyMigration()
   console.log(`Migration verified: ${verified ? '✅' : '❌'}`)
   ```

2. **Check Results**
   - Verify all local skills exist in database
   - Compare counts match
   - Check status/featured flags are correct

✅ **Success Criteria**:
- All skills inserted into Supabase
- Verification passes
- Counts match between local and database

---

## Phase 6: Test Realtime Sync (1 hour)

### Step 6.1: Setup Realtime Monitoring

1. **Open Two Browser Windows**
   - Window A: Admin panel on main machine
   - Window B: Public portfolio on different machine (or incognito)

2. **Subscribe to Changes**
   - In console (both windows): Load skillService
   - In Window A: Make a skill change (publish/unpublish)
   - In Window B: Check if changes appear instantly

### Step 6.2: Test All Operations

**Test Publishing/Unpublishing:**
1. Admin (A): Unpublish a skill
2. Public (B): Verify skill disappears from marquee/grid
3. Admin (A): Publish skill
4. Public (B): Verify skill reappears

**Test Featured Toggle:**
1. Admin (A): Toggle featured flag on a skill
2. Public (B): Verify marquee updates

**Test Creating New Skill:**
1. Admin (A): Create new skill
2. Public (B): Verify appears immediately if published

**Test Editing:**
1. Admin (A): Edit skill description/name
2. Public (B): Verify changes appear instantly

### Step 6.3: Network Resilience

1. **Simulate Network Disconnect**
   - In DevTools Network tab: Set throttle to "Offline"
   - Make changes in admin
   - Check console for reconnection attempts

2. **Restore Network**
   - Set throttle back to "Online"
   - Verify automatic sync resumes

✅ **Success Criteria**:
- Changes appear in real-time across windows
- Marquee/grid updates instantly
- Network disconnect/reconnect handled gracefully

---

## Phase 7: Cleanup & Finalization (30 min)

### Step 7.1: Clear localStorage

⚠️ **CRITICAL**: Only do this after:
1. Migration complete and verified
2. Realtime sync tested and working
3. Backup created and tested

1. **In Browser Console**
   ```javascript
   localStorage.removeItem('mk-skills')
   console.log("localStorage cleared")
   ```

2. **Verify Cleared**
   ```javascript
   console.log(localStorage.getItem('mk-skills')) // Should be null
   ```

3. **Verify App Still Works**
   - Refresh page
   - Check Admin panel - skills should load from Supabase
   - Check Public portfolio - published skills should display
   - Check Marquee - featured published skills should display

### Step 7.2: Update Documentation

1. **Mark Migration Complete**
   - Update `CHANGELOG_DEV.md`
   - Add completion timestamp
   - Note any issues/learnings

2. **Document Backup Location**
   - List backup key used
   - Location in localStorage
   - Date/time of migration

### Step 7.3: Test Full Workflow

1. **Create New Skill**
   - In Admin: Create new skill
   - Verify it appears in Supabase
   - Verify it appears on public site if published

2. **Edit Existing Skill**
   - In Admin: Edit skill description
   - Verify changes appear in real-time
   - Check Supabase has updated timestamp

3. **Delete Skill**
   - In Admin: Delete a skill
   - Verify it disappears from public site
   - Verify it's removed from Supabase

✅ **Success Criteria**:
- localStorage is cleared
- All CRUD operations work via Supabase
- Realtime sync functioning
- Public site displays correct data

---

## Rollback Procedure

If anything goes wrong during migration:

### Rollback Steps

1. **Stop Migration Process**
   - Don't clear localStorage yet

2. **Restore from Backup**
   ```javascript
   const backupKey = "mk-skills-backup-<timestamp>"
   restoreFromBackup(backupKey)
   ```

3. **Clear Supabase Data** (if needed)
   - Go to Supabase SQL Editor
   - Run: `DELETE FROM public.skills;`
   - This resets for another attempt

4. **Reload Application**
   - Refresh page
   - Verify skills load from localStorage
   - Check admin panel shows all skills

### Rollback Verification

- [ ] localStorage restored with all skills
- [ ] Admin panel shows correct skill count
- [ ] No data loss
- [ ] Can retry migration

---

## Troubleshooting

### Issue: "Database connection failed"
**Solution:**
1. Check Supabase dashboard is accessible
2. Verify internet connection
3. Check RLS policies are enabled
4. Clear browser cache and retry

### Issue: "Skills inserted but realtime not updating"
**Solution:**
1. Check REPLICA IDENTITY FULL is set
2. Verify RLS policies allow reads
3. Restart application
4. Check browser console for errors

### Issue: "Duplicate key violation during insert"
**Solution:**
1. This means skills already exist in Supabase
2. Run `analyzeMigrationData()` to identify duplicates
3. Either delete existing data or skip duplicates
4. Retry insert with cleaned data

### Issue: "Proficiency level showing as wrong type"
**Solution:**
1. Database has numeric levels (1-5)
2. Levels should be integers, not strings
3. Edit skill and re-save to correct type
4. Check transformation function in skillService

### Issue: "Public portfolio not showing skills"
**Solution:**
1. Verify skills have `status = 'Published'`
2. Check RLS policy "Public read published"
3. Verify proficiency levels are numeric
4. Check browser console for fetch errors

---

## Success Checklist

✅ All tasks completed successfully when:

- [ ] Supabase schema created with all columns and RLS policies
- [ ] Current skills backed up to localStorage
- [ ] All skills migrated from localStorage to Supabase
- [ ] Migration verified - all skills in database
- [ ] Realtime subscriptions working - changes sync across browsers
- [ ] Public site displays correct skills from Supabase
- [ ] Admin panel works with Supabase data
- [ ] Marquee section displays featured published skills
- [ ] localStorage cleared (after backup and verification)
- [ ] Full workflow tested (CRUD operations work)
- [ ] Rollback procedure tested and verified
- [ ] Documentation updated

---

## Timeline Summary

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 0 | Pre-flight checklist | 5 min | ✅ |
| 1 | Create Supabase schema | 30 min | ⏳ |
| 2 | Backup localStorage | 10 min | ⏳ |
| 3 | Analyze data | 15 min | ⏳ |
| 4 | Prepare for migration | 15 min | ⏳ |
| 5 | Execute migration | 2 hours | ⏳ |
| 6 | Test Realtime sync | 1 hour | ⏳ |
| 7 | Cleanup & finalize | 30 min | ⏳ |
| **Total** | | **~5.5 hours** | ⏳ |

---

## Contact & Support

If issues arise:
1. Check this guide's Troubleshooting section
2. Review browser console for error messages
3. Check Supabase dashboard for data integrity
4. Verify RLS policies and schema
5. Attempt rollback if needed

---

**Last Updated**: 2026-11-04
**Migration Version**: v2.0 (Supabase + Realtime)
