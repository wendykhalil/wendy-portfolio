# Applying Projects Migration (007) to Supabase

**Status**: Ready for Execution  
**Migration File**: `007_create_projects_table.sql`  
**Date**: 2026-11-04  
**Estimated Duration**: 5 minutes

---

## What This Migration Does

The Projects migration (007) creates:

- **projects** table with 26 columns (bilingual, images, metadata)
- **6 indexes** for performance (status, category, featured, created_by, created_at, title)
- **5 RLS policies** for security (public read published, admin full CRUD)
- **Updated trigger** for automatic `updated_at` timestamps
- **8 seed projects** backfilled with all original data (IDs 1-8)
- **Sequence reset** to ID 8 (prevents duplicate key errors)

---

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open `docs/migrations/007_create_projects_table.sql`
   - Select ALL content (Ctrl+A)
   - Copy (Ctrl+C)

4. **Paste into Query Editor**
   - Click in Supabase SQL editor
   - Paste (Ctrl+V)

5. **Review Before Executing**
   - Scan for syntax errors
   - Verify table names are correct
   - Check that seed data looks right

6. **Execute**
   - Click "Run" button (or Ctrl+Enter)
   - Wait for completion (should see "Success" message)

7. **Verify**
   - Go to "Table Editor" in left sidebar
   - Confirm "projects" table appears in list
   - Click on it, verify 8 rows visible with project data
   - Check that columns match schema (26 total)

---

### Option 2: SQL File Direct Import (If Available)

Some Supabase versions support direct SQL file upload:

1. Open Supabase Dashboard → SQL Editor
2. Look for "Upload" or "Import SQL" button
3. Select `docs/migrations/007_create_projects_table.sql`
4. Review and execute

---

## Verification Checklist

After applying migration, verify:

- [ ] Table exists: `SELECT COUNT(*) FROM projects;` → Should return `8`
- [ ] Columns exist: Run `\d projects` → Should show 26 columns
- [ ] Indexes created: `SELECT * FROM pg_indexes WHERE tablename = 'projects';` → Should return 6 rows
- [ ] RLS enabled: `SELECT relname, rowsecurity FROM pg_class WHERE relname = 'projects';` → Should show `t` (true)
- [ ] Sequence exists: `SELECT * FROM information_schema.sequences WHERE sequence_name = 'projects_id_seq';`
- [ ] Seed data: `SELECT id, title_en, status FROM projects ORDER BY id;` → Should show all 8 projects
- [ ] Data integrity:
  - `SELECT COUNT(*) FROM projects WHERE status = 'Published';` → Should return `7`
  - `SELECT COUNT(*) FROM projects WHERE featured = true;` → Should return `4`
  - `SELECT COUNT(*) FROM projects WHERE status = 'Draft';` → Should return `1`

---

## Test Queries

Run these in Supabase SQL Editor to verify functionality:

```sql
-- Count all projects
SELECT COUNT(*) as total_projects FROM projects;

-- List all projects with key fields
SELECT id, title_en, category, status, featured 
FROM projects 
ORDER BY id;

-- Test RLS - Published projects (public read)
SELECT id, title_en 
FROM projects 
WHERE status = 'Published' 
ORDER BY display_order;

-- Test indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'projects' 
ORDER BY indexname;

-- Check sequence value
SELECT last_value FROM projects_id_seq;

-- Verify bilingual content
SELECT id, title_en, title 
FROM projects 
WHERE id = 1;
```

---

## Troubleshooting

### Issue: "Table already exists"
**Solution**: Drop the table first (if safe) or choose different table name

### Issue: "Sequence error"
**Solution**: Sequence was already created - safe to ignore

### Issue: "RLS policy error: profiles table not found"
**Solution**: The RLS policies reference `profiles` table (for admin role checking)
- Verify `profiles` table exists and has `role` column
- If missing, update RLS policy WHERE clause or create profiles first

### Issue: "Foreign key error"
**Solution**: Some seed data might reference missing users
- Comment out problematic INSERT rows
- Apply migration, then add data manually

### Issue: "Permission denied"
**Solution**: Ensure authenticated user has admin role in admin_users or profiles table

---

## Next Steps After Migration

1. **✅ Verify schema** (checklist above)

2. **Phase 3: Update projectService.js**
   - Convert localStorage CRUD to async Supabase calls
   - Use supabase client for database operations
   - Keep imageService.js for image uploads

3. **Phase 3: Add image upload UI**
   - Add file input to ProjectEditor for cover image
   - Add screenshot file inputs
   - Connect to imageService.uploadProjectCoverImage()

4. **Phase 4: Update PublicPortfolio**
   - Fetch published projects from Supabase instead of localStorage
   - Display real images from Supabase storage

5. **Phase 5-7: Testing & Cleanup**
   - Test all CRUD operations
   - Verify Realtime sync (optional enhancement)
   - Clear localStorage when ready

---

## Rollback (If Needed)

If something goes wrong, restore from backup:

```sql
-- Drop the projects table and sequence
DROP TABLE IF EXISTS projects CASCADE;
DROP SEQUENCE IF EXISTS projects_id_seq;

-- Restore from backup (manual steps in admin UI)
```

Then restart the migration process.

---

## Support

- See `PHASE1_AUDIT.md` for system overview
- See `MIGRATION_GUIDE_SKILLS.md` for general migration patterns
- See `007_create_projects_table.sql` for schema details
- Check Supabase documentation for RLS policy troubleshooting

---

**Status**: Ready for Application  
**Time Estimate**: 5 minutes execution + 10 minutes verification  
**Risk Level**: Low (new table, no dependencies yet)

When complete, proceed with Phase 3: Update projectService.js to Supabase async CRUD.

