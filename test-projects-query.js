// Test script to verify Supabase projects query
import { supabase } from "./src/lib/supabaseClient.js"

async function testProjectsQuery() {
  console.log("Testing projects query from Supabase...")

  try {
    // Test 1: Get all projects (no filter)
    console.log("\n1. Getting ALL projects (no RLS filter):")
    const { data: allData, error: allError } = await supabase
      .from('projects')
      .select('id, title, status')
      .order('display_order', { ascending: true })

    if (allError) {
      console.error("ERROR getting all projects:", allError)
    } else {
      console.log(`✓ All projects: ${allData?.length} records`)
      console.log("Sample:", allData?.slice(0, 3))
    }

    // Test 2: Get published projects (with filter)
    console.log("\n2. Getting PUBLISHED projects only:")
    const { data: pubData, error: pubError } = await supabase
      .from('projects')
      .select('id, title, status')
      .eq('status', 'Published')
      .order('display_order', { ascending: true })

    if (pubError) {
      console.error("ERROR getting published projects:", pubError)
    } else {
      console.log(`✓ Published projects: ${pubData?.length} records`)
      console.log("Sample:", pubData?.slice(0, 3))
    }

    // Test 3: Check status values
    console.log("\n3. Checking all status values in database:")
    const { data: statusData, error: statusError } = await supabase
      .from('projects')
      .select('id, status')

    if (statusError) {
      console.error("ERROR getting status values:", statusError)
    } else {
      const statuses = [...new Set(statusData?.map(p => p.status))]
      console.log("Unique status values:", statuses)
      statusData?.forEach(p => {
        console.log(`  ID ${p.id}: status="${p.status}" (typeof: ${typeof p.status})`)
      })
    }

    // Test 4: Check RLS policies
    console.log("\n4. Checking RLS policies on projects table:")
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('pg_policies')
      .eq('tablename', 'projects')

    if (policiesError) {
      console.log("(Could not query policies directly - this is normal)")
    } else {
      console.log("Policies found:", policiesData)
    }

  } catch (error) {
    console.error("Test error:", error)
  }
}

testProjectsQuery()
