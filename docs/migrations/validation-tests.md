# Skills Migration Validation Tests

Complete test suite for verifying Skills module migration to Supabase with Realtime sync.

**Total Tests**: 8 scenarios
**Duration**: ~1 hour
**Success Criteria**: All tests pass

---

## Test 1: Schema Validation

**Objective**: Verify Supabase schema matches specification

### Setup
1. Open Supabase dashboard
2. Navigate to Table Editor
3. Select `skills` table

### Test Steps

1. **Verify Table Exists**
   - [ ] Table `public.skills` exists
   - [ ] Table is not empty (contains migrated skills)

2. **Verify All Columns Present**
   - [ ] `id` (BIGSERIAL) - Primary key
   - [ ] `name` (TEXT) - Skill name
   - [ ] `category` (TEXT) - Skill category
   - [ ] `description_fr` (TEXT) - French description
   - [ ] `description_en` (TEXT) - English description
   - [ ] `level` (INTEGER) - Proficiency level 1-5
   - [ ] `icon` (TEXT) - Icon identifier
   - [ ] `featured` (BOOLEAN) - Featured flag
   - [ ] `status` (TEXT) - 'Draft', 'Published', or 'Archived'
   - [ ] `display_order` (INTEGER) - Sort order
   - [ ] `created_at` (TIMESTAMP) - Auto-set creation time
   - [ ] `updated_at` (TIMESTAMP) - Auto-updated on change
   - [ ] `created_by` (UUID FK) - Reference to auth.users

3. **Verify Data Types**
   - [ ] `id` is numeric and auto-incrementing
   - [ ] `level` contains integers 1-5
   - [ ] `featured` and status are correct type
   - [ ] `display_order` is integer
   - [ ] Timestamps are in correct format

4. **Verify Row Count**
   - [ ] Row count matches: `prepared.length` from migration

### Expected Result
✅ All columns present with correct types and data

---

## Test 2: RLS Policy Validation

**Objective**: Verify Row Level Security policies work correctly

### Setup
1. Supabase dashboard → Table Editor → skills table
2. Click "RLS" policies
3. Verify 5 policies exist

### Test Steps

1. **Verify Policy Existence**
   - [ ] "Skills: Public read published" exists
   - [ ] "Skills: Admin read all" exists
   - [ ] "Skills: Admin insert" exists
   - [ ] "Skills: Admin update" exists
   - [ ] "Skills: Admin delete" exists

2. **Test Public Read Access**
   - Open app in private/incognito window (not logged in)
   - Open browser console
   - Run: `await fetch('https://your-supabase-url/rest/v1/skills?status=eq.Published', {headers: {'Authorization': 'Bearer anon_key'}})`
   - [ ] Request succeeds and returns published skills
   - [ ] Draft/Archived skills are NOT in response

3. **Test Admin Read Access**
   - Logged in as admin
   - Run: `await fetch('https://your-supabase-url/rest/v1/skills', {headers: {'Authorization': 'Bearer admin_token'}})`
   - [ ] Request succeeds and returns ALL skills (Published + Draft + Archived)

4. **Test Insert Policy**
   - Admin creates new skill in app
   - [ ] Insert succeeds
   - [ ] Non-admin cannot insert (would require auth token)

5. **Test Update Policy**
   - Admin edits existing skill
   - [ ] Update succeeds
   - [ ] Timestamp changes

6. **Test Delete Policy**
   - Admin deletes skill
   - [ ] Delete succeeds
   - [ ] Skill removed from database

### Expected Result
✅ All RLS policies enforce correctly

---

## Test 3: Data Integrity & Migration Verification

**Objective**: Verify all data migrated correctly with no loss

### Setup
1. App loaded in browser
2. Admin panel open
3. Browser console access

### Test Steps

1. **Verify Record Count**
   ```javascript
   const db = await fetch('/rest/v1/skills?select=count()', ...)
   ```
   - [ ] Database count matches: `prepared.length` from migration
   - [ ] No duplicate records

2. **Verify Key Fields**
   - [ ] All skills have: name, category, status
   - [ ] All published skills have descriptions (FR and EN)
   - [ ] Proficiency levels are numeric 1-5

3. **Verify Status Distribution**
   - [ ] Published skills count matches original
   - [ ] Draft skills count matches original
   - [ ] Status values are only: 'Draft', 'Published', 'Archived'

4. **Verify Featured Skills**
   - [ ] Featured flag is boolean (true/false)
   - [ ] Featured count matches original
   - [ ] Featured skills are subset of published

5. **Verify Display Order**
   - [ ] All display_order values are numeric
   - [ ] display_order ranges 0-999 (reasonable)
   - [ ] No negative values

6. **Spot Check Sample Skills**
   - [ ] Pick 3 random skills
   - [ ] Compare with original localStorage
   - [ ] Verify all fields match exactly

### Expected Result
✅ All data integrity checks pass, no data loss

---

## Test 4: Realtime Synchronization

**Objective**: Verify real-time updates sync across browsers

### Setup
1. **Open Two Browser Windows**
   - Window A: Admin panel (Skills tab)
   - Window B: Public portfolio (Skills section)
   - Both windows side-by-side

2. **Verify Connection**
   - In both windows, check console: `navigator.onLine` returns `true`
   - Both windows fully loaded

### Test Steps

1. **Test: Publish Skill**
   - Window A: Unpublish a draft skill
   - [ ] Status changes to "Draft" in admin
   - Window B: Refresh (or watch in realtime)
   - [ ] Skill disappears from public skills grid
   - [ ] Marquee updates if featured

2. **Test: Create New Skill**
   - Window A: Create new skill, set as Published
   - [ ] Modal closes, appears in admin list
   - Window B: Wait 1-2 seconds
   - [ ] New skill appears in grid automatically
   - [ ] Correct category/order

3. **Test: Edit Skill**
   - Window A: Edit published skill name
   - [ ] Changes saved
   - Window B: Verify name updates
   - [ ] Changes appear within 2 seconds

4. **Test: Toggle Featured**
   - Window A: Toggle featured flag on published skill
   - [ ] Admin updates
   - Window B: Check marquee section
   - [ ] Skill appears/disappears from marquee
   - [ ] Marquee scrolls smoothly

5. **Test: Delete Skill**
   - Window A: Delete a published skill
   - [ ] Confirm delete
   - [ ] Skill removed from admin list
   - Window B: Verify deletion
   - [ ] Skill disappears from public grid
   - [ ] Marquee updates if featured

6. **Test: Multiple Changes**
   - Window A: Make 5 quick changes (publish/unpublish/edit)
   - Window B: Monitor updates
   - [ ] All changes appear
   - [ ] No skipped updates
   - [ ] Order is correct

### Expected Result
✅ All changes sync to public site within 1-2 seconds

---

## Test 5: Network Resilience

**Objective**: Verify app handles network disruptions gracefully

### Setup
1. App loaded in admin panel
2. DevTools Network tab open
3. Initial state: all skills loaded

### Test Steps

1. **Test: Simulate Network Disconnect**
   - DevTools Network tab: Set throttle to "Offline"
   - [ ] Console shows connection lost
   - [ ] Admin can still view cached skills
   - [ ] "Loading..." states show briefly

2. **Test: Attempt Operations Offline**
   - Try to create new skill
   - [ ] Operation queued or shows error
   - [ ] App doesn't crash
   - [ ] Can cancel operation

3. **Test: Reconnect**
   - DevTools Network: Set throttle back to "Online"
   - [ ] Console shows "reconnected"
   - [ ] Skills list refreshes automatically
   - [ ] No duplicate data

4. **Test: Offline Changes**
   - Go offline, make skill edit
   - Reconnect
   - [ ] Edit sent to server
   - OR: Edit rejected with clear error
   - [ ] No data corruption

5. **Test: Multiple Reconnects**
   - Disconnect/reconnect 3 times quickly
   - [ ] App handles gracefully
   - [ ] Data stays in sync
   - [ ] No console errors

### Expected Result
✅ App handles network issues gracefully, auto-recovers

---

## Test 6: Cross-Browser Synchronization

**Objective**: Verify real-time sync works across different browsers/tabs

### Setup
1. **Open Multiple Tabs/Windows**
   - Tab A: Admin panel logged in
   - Tab B: Public portfolio (different browser if possible)
   - Tab C: Admin panel on mobile (optional)

### Test Steps

1. **Test: Tab A Makes Changes**
   - Tab A: Publish a draft skill
   - [ ] Tab A updates immediately
   - Wait 1-2 seconds
   - [ ] Tab B refreshes automatically (or within 2 sec)
   - [ ] Skill appears on public site

2. **Test: Tab B Perception**
   - Refresh Tab B manually
   - [ ] Skill appears
   - Verify skill has all correct attributes

3. **Test: Mobile Sync** (if available)
   - Tab C on phone: Open public portfolio
   - [ ] Shows correct published skills
   - Tab A: Publish new skill
   - Tab C: Check after 2 seconds
   - [ ] New skill appears on mobile

4. **Test: Simultaneous Edits**
   - Tab A: Start editing skill 1
   - Tab B: Simultaneously edit skill 2
   - [ ] Both edits save
   - [ ] No conflicts
   - [ ] Both tabs reflect changes

5. **Test: Same Skill Edits**
   - Tab A: Edit skill name
   - Tab B: (quickly) edit same skill description
   - [ ] First edit wins (or last edit wins consistently)
   - [ ] No data loss
   - [ ] Consistent state

### Expected Result
✅ Changes sync across all tabs/browsers, no conflicts

---

## Test 7: Full CRUD Workflow

**Objective**: Verify complete Create/Read/Update/Delete workflow

### Setup
1. Admin panel open
2. Public portfolio open
3. All previous tests passed

### Test Steps

1. **CREATE: Add New Skill**
   - Admin: Click "Ajouter une compétence"
   - [ ] Form opens
   - Fill: Name: "Test Skill", Category: "Frontend"
   - Fill: Descriptions, level
   - Save
   - [ ] Success message
   - [ ] Appears in admin list
   - [ ] Supabase has new record

2. **READ: View in Multiple Contexts**
   - Admin: View in Skills list
   - [ ] Shows correctly with all fields
   - [ ] Correct status/featured flags
   - Set to "Published"
   - [ ] Appears on public portfolio
   - [ ] Appears in marquee if featured

3. **UPDATE: Edit Skill**
   - Admin: Click edit on "Test Skill"
   - [ ] Form fills with existing data
   - Change: Name to "Test Skill Updated"
   - Save
   - [ ] Success message
   - [ ] List updates
   - [ ] Public site updates in real-time
   - [ ] Supabase has `updated_at` timestamp

4. **DELETE: Remove Skill**
   - Admin: Click delete on "Test Skill Updated"
   - [ ] Confirmation dialog shows
   - Confirm
   - [ ] Success message
   - [ ] Removed from admin list
   - [ ] Removed from public site
   - [ ] Removed from Supabase

5. **Verify Cascade**
   - No orphaned records
   - No references broken
   - No console errors

### Expected Result
✅ Full CRUD workflow functions flawlessly

---

## Test 8: localStorage Migration & Cleanup

**Objective**: Verify localStorage cleared and app uses only Supabase

### Setup
1. Migration complete and verified
2. All other tests passed
3. Backups created

### Test Steps

1. **Before Cleanup: Verify Backup**
   - Browser console: `showBackupInfo()`
   - [ ] Backup exists in localStorage
   - [ ] Backup key displayed
   - [ ] Skill count matches

2. **Clear localStorage**
   - Browser console: `await clearLocalStorageAfterMigration()`
   - [ ] Confirmation dialog
   - Confirm deletion
   - [ ] localStorage cleared
   - [ ] App reloads

3. **After Reload: Verify Supabase Only**
   - [ ] App still loads
   - [ ] Skills appear in admin list
   - [ ] Public site shows skills
   - [ ] All skills loaded (not empty)
   - [ ] No "loading..." indefinitely

4. **Verify localStorage Empty**
   - Browser console: `localStorage.getItem('mk-skills')`
   - [ ] Returns `null`
   - Check backup still exists: `showBackupInfo()`
   - [ ] Backups still available if rollback needed

5. **Test CRUD After Cleanup**
   - Create new skill
   - [ ] Saves to Supabase (not localStorage)
   - Edit skill
   - [ ] Updates in Supabase
   - Delete skill
   - [ ] Removed from Supabase
   - [ ] No localStorage calls

6. **Verify Performance**
   - [ ] App loads quickly (no localStorage check)
   - [ ] Real-time updates fast
   - [ ] No console errors
   - [ ] Console.log shows Supabase calls

### Expected Result
✅ App fully migrated to Supabase, no localStorage dependency

---

## Test Results Summary

| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Schema Validation | ⏳ | All columns and types present |
| 2 | RLS Policy Validation | ⏳ | Public/admin access correct |
| 3 | Data Integrity | ⏳ | No data loss, all fields valid |
| 4 | Realtime Sync | ⏳ | Changes sync <2 sec across windows |
| 5 | Network Resilience | ⏳ | Handles offline/reconnect |
| 6 | Cross-Browser Sync | ⏳ | Multi-tab/browser sync correct |
| 7 | Full CRUD Workflow | ⏳ | Create/read/update/delete works |
| 8 | localStorage Cleanup | ⏳ | Fully migrated to Supabase |

---

## Failure Recovery

If any test fails:

1. **Identify Root Cause**
   - Check browser console for errors
   - Review Supabase dashboard for issues
   - Verify RLS policies

2. **Document Issue**
   - Record test number
   - Note error message
   - Screenshot if applicable

3. **Attempt Fix**
   - Check troubleshooting guide
   - Adjust code if needed
   - Rerun test

4. **Escalate if Needed**
   - If unable to fix, consider rollback
   - Restore from backup
   - Plan alternative approach

---

## Sign-Off

**Tester**: _________________
**Date**: _________________
**All Tests Passed**: ☐ Yes ☐ No

**Notes**:
```
[Add any observations, issues, or recommendations]


```

---

**Last Updated**: 2026-11-04
**Version**: 1.0
