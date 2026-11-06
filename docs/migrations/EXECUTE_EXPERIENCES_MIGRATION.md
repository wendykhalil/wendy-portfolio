# Execute Experiences Migration (Phase 1: Database Setup)

**Date:** 2026-11-04  
**Status:** Ready for execution  
**Estimated Time:** 10-15 minutes  
**Risk Level:** Low (idempotent, safe to re-run)

---

## Quick Start (3 Steps)

### Step 1: Open Supabase SQL Editor
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select project: **ihogbszoeyrrusbmsgfb**
3. Click **SQL Editor** in left sidebar
4. Click **Create New Query** button

### Step 2: Copy & Paste Migration SQL
1. Open: `docs/migrations/006_create_experiences_table.sql`
2. Copy entire file content (Ctrl+A → Ctrl+C)
3. Paste into Supabase SQL Editor (Ctrl+V)

### Step 3: Execute & Verify
1. Click **Run** button (or Ctrl+Enter)
2. Wait for execution to complete (should be instant)
3. Verify steps below

---

## Verification Checklist

After executing the migration, verify each step:

### ✅ Verify 1: Table Exists

1. Click **Table Editor** in left sidebar
2. Look for **experiences** table in the list
3. Click on **experiences** table
4. Verify it shows **6 rows**:
   - Row 1: Cycle Ingénieur Informatique (id=1)
   - Row 2: Développeur Full Stack (id=2)
   - Row 3: Interface de surveillance industrielle (id=3)
   - Row 4: Licence en Ingénierie des Systèmes Informatiques (id=4)
   - Row 5: Dental Stock Management (id=5)
   - Row 6: Full Stack JavaScript (id=6)

### ✅ Verify 2: Check Columns

In the **experiences** table view, verify columns exist:
- [ ] id (BIGSERIAL)
- [ ] type_fr (TEXT)
- [ ] type_en (TEXT)
- [ ] title_fr (TEXT)
- [ ] title_en (TEXT)
- [ ] organization_fr (TEXT)
- [ ] organization_en (TEXT)
- [ ] place (TEXT)
- [ ] description_fr (TEXT)
- [ ] description_en (TEXT)
- [ ] responsibilities_fr (TEXT)
- [ ] responsibilities_en (TEXT)
- [ ] technologies (TEXT[] array)
- [ ] start_date (TEXT)
- [ ] end_date (TEXT)
- [ ] current_position (BOOLEAN)
- [ ] location (TEXT)
- [ ] status (TEXT: 'Published')
- [ ] display_order (INTEGER)
- [ ] created_at (TIMESTAMP)
- [ ] updated_at (TIMESTAMP)
- [ ] created_by (UUID)

### ✅ Verify 3: RLS Policies

1. Click on **experiences** table
2. Click **RLS Policies** tab
3. Verify 5 policies exist:
   - [ ] Experiences: Public read published
   - [ ] Experiences: Admin read all
   - [ ] Experiences: Admin insert
   - [ ] Experiences: Admin update
   - [ ] Experiences: Admin delete

Expected configuration:
- **Public policy**: Allows SELECT where status = 'Published'
- **Admin policies**: Allow admin users (via admin_users.role='admin') to READ ALL, INSERT, UPDATE, DELETE

### ✅ Verify 4: Indexes

1. Click on **experiences** table
2. Scroll down to **Indexes** section
3. Verify 5 indexes exist:
   - [ ] idx_experiences_status
   - [ ] idx_experiences_display_order
   - [ ] idx_experiences_type
   - [ ] idx_experiences_published_order
   - [ ] idx_experiences_current

### ✅ Verify 5: Realtime

1. Click on **experiences** table
2. Scroll down to **Realtime** section
3. Verify toggle is **ON** (green)

If toggle is OFF:
- Click toggle to turn ON
- System should show: "Experiences has been added to replication"

### ✅ Verify 6: Data Integrity

In SQL Editor, run this query to verify all 6 records with correct data:

```sql
SELECT 
  id,
  title_fr,
  place,
  type_fr,
  status,
  display_order,
  array_length(technologies, 1) as tech_count
FROM public.experiences
ORDER BY display_order;
```

Expected result:
```
 id | title_fr                                      | place                        | type_fr | status    | display_order | tech_count
----+-----------------------------------------------+------------------------------+---------+-----------+---------------+------------
  1 | Cycle Ingénieur Informatique                  | ESPRIT                       | Formation | Published |             1 |          4
  2 | Développeur Full Stack                        | Slikoo / Detectives Connect  | Stage   | Published |             2 |          4
  3 | Interface de surveillance industrielle        | MECAPROTEC AÉRO / STAPLO     | Stage   | Published |             3 |          3
  4 | Licence en Ingénierie des Systèmes Infor...   | Université de Kairouan       | Formation | Published |             4 |          4
  5 | Dental Stock Management                       | Projet de stage              | Stage   | Published |             5 |          3
  6 | Full Stack JavaScript                         | 9antra                       | Formation | Published |             6 |          3
```

### ✅ Verify 7: RLS Policies Work

In SQL Editor, run these queries to verify policies:

**Query 1: Public can read published experiences**
```sql
-- This query simulates public user access
-- Set auth as anonymous (no user)
SELECT title_fr, status FROM public.experiences WHERE status = 'Published';
```
Expected: Returns 6 records (all published)

**Query 2: Verify current_position field**
```sql
SELECT 
  title_fr,
  current_position,
  start_date,
  end_date
FROM public.experiences
WHERE current_position = true;
```
Expected: Returns 1 record (Cycle Ingénieur Informatique) with current_position=true and no end_date

**Query 3: Verify technologies array**
```sql
SELECT 
  title_fr,
  technologies,
  array_length(technologies, 1) as tech_count
FROM public.experiences
WHERE id = 1;
```
Expected: Returns 1 record with technologies=['React', 'Node.js', 'Java', 'DevOps']

---

## Troubleshooting

### Issue: "Table already exists" error
**Solution:** This is normal if migration was already run. The migration is idempotent (safe to re-run).
- Click **Run** again - it will skip existing table and policies
- Verify in Table Editor that experiences table is there with 6 records

### Issue: "experiences table not found" after execution
**Cause:** Migration didn't execute properly
**Solution:**
1. Check SQL Editor output for error messages
2. Copy the SQL again from `006_create_experiences_table.sql`
3. Paste and click **Run** again

### Issue: Less than 6 records in experiences table
**Cause:** Possible conflict if records already existed
**Solution:**
1. Note how many records are there
2. Run verification Query 1 above to see which records exist
3. Add missing records manually via Table Editor or SQL INSERT

### Issue: Realtime toggle is OFF
**Solution:**
1. Click toggle to turn ON
2. Wait for confirmation message
3. Verify it shows green toggle and message

### Issue: RLS Policies not showing
**Solution:**
1. Refresh browser (F5)
2. Click on experiences table again
3. Click **RLS Policies** tab again
4. If still not showing, policies may have failed to create

---

## After Migration: Next Steps

Once all verification steps pass:

1. **Update experienceService.js**
   - Add Supabase CRUD functions
   - Replace localStorage with database queries
   - Keep same public API for components

2. **Update Admin Form (CollectionAdmin)**
   - Extend form with all required fields
   - Add validations for required fields
   - Support bilingual input (FR/EN)

3. **Update Frontoffice**
   - Replace seedExperiences import with service call
   - Use service to fetch published experiences
   - Maintain exact same timeline design

4. **Test**
   - Verify admin can create new experience
   - Verify admin can edit experience
   - Verify admin can delete experience
   - Verify frontoffice shows correct data
   - Verify timeline order is correct

---

## Safety Notes

✅ **This migration is safe because:**
- Uses `IF NOT EXISTS` to prevent errors if already applied
- Uses `DROP POLICY IF EXISTS` to safely replace policies
- Uses `INSERT ... ON CONFLICT (id) DO NOTHING` to prevent duplicate records
- Can be safely re-run multiple times
- Does not modify existing data
- Does not require authentication bypass or service-role keys
- Respects existing RLS structure

❌ **Do NOT:**
- Use service-role key (we only use anon key)
- Run administrative queries manually (use migration file)
- Modify RLS policies without understanding security implications
- Delete experiences records (use Draft status instead)
- Run migration from production environment first (test in dev first)

---

## Migration File Reference

**Location:** `docs/migrations/006_create_experiences_table.sql`

**What it creates:**
1. Experiences table with all required fields
2. 5 database indexes for performance
3. 5 RLS policies for security
4. Realtime support (REPLICA IDENTITY FULL)
5. Auto-timestamp trigger (updated_at)
6. Backfill data: All 6 existing experiences from src/data.ts

**Size:** ~500 lines of SQL
**Execution time:** <5 seconds
**Data safety:** All data preserved, nothing deleted

---

## Status Tracking

| Step | Task | Status | Time |
|------|------|--------|------|
| 1 | Execute migration SQL | ⏳ | - |
| 2 | Verify table exists with 6 records | ⏳ | - |
| 3 | Verify columns and types | ⏳ | - |
| 4 | Verify RLS policies (5 policies) | ⏳ | - |
| 5 | Verify indexes (5 indexes) | ⏳ | - |
| 6 | Verify Realtime enabled | ⏳ | - |
| 7 | Verify data integrity (Query test) | ⏳ | - |
| **TOTAL** | **Phase 1 Complete** | ⏳ | ~15 min |

---

## Questions?

Refer to:
- Migration file: `docs/migrations/006_create_experiences_table.sql`
- Schema documentation: See "SCHEMA COMPATIBILITY VERIFICATION" section in migration file
- Data preservation: See "DATA PRESERVATION & BACKFILL" section in migration file
- RLS policies: See "RLS POLICY BEHAVIOR & ADMIN_USERS COMPATIBILITY" section in migration file

---

**Last Updated:** 2026-11-04  
**Version:** 1.0 - Initial Release  
**Status:** Ready for execution

