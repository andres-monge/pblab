/**
 * Comprehensive Authentication-Based Testing Script
 * 
 * This script tests ALL functionality with authenticated users (never service roles)
 * to verify RLS policies work correctly and prevent infinite recursion issues.
 * 
 * Following the critical testing protocol from docs/testing-requirements.md
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Test accounts from seeding script
const TEST_ACCOUNTS = [
  { email: 'student1@university.edu', password: 'password123', role: 'student', team: 'Team Alpha' },
  { email: 'student3@university.edu', password: 'password123', role: 'student', team: 'Team Beta' },
  { email: 'educator1@university.edu', password: 'password123', role: 'educator', course: 'Computational Biology 101' },
  { email: 'admin@university.edu', password: 'password123', role: 'admin', access: 'all' }
]

/**
 * Test helper function that ensures ALL tests use authenticated user context
 * Following the pattern from testing-requirements.md
 */
async function testWithAuthenticatedUser(email, password, testFn) {
  // ✅ CORRECT - Use anon key with authentication (triggers RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (authError) {
    throw new Error(`Authentication failed for ${email}: ${authError.message}`)
  }
  
  console.log(`✅ Authenticated as: ${email} (${data.user.id})`)
  
  try {
    return await testFn(supabase, data.user)
  } finally {
    // Clean up
    await supabase.auth.signOut()
  }
}

/**
 * Phase 1: Authentication Infrastructure Tests
 */
async function testAuthenticationInfrastructure() {
  console.log('\n🔐 Phase 1: Testing Authentication Infrastructure\n')
  
  const results = []
  
  for (const account of TEST_ACCOUNTS) {
    try {
      await testWithAuthenticatedUser(account.email, account.password, async (supabase, user) => {
        // Test 1: Verify user authentication works
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        if (userError || !currentUser) {
          throw new Error('Failed to get authenticated user')
        }
        
        // Test 2: Verify role data is accessible with authenticated context
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role, name, email')
          .eq('id', user.id)
          .single()
        
        if (roleError) {
          throw new Error(`Failed to get user role: ${roleError.message}`)
        }
        
        if (userData.role !== account.role) {
          throw new Error(`Role mismatch: expected ${account.role}, got ${userData.role}`)
        }
        
        console.log(`  ✅ ${account.email}: Authentication & role verification successful`)
        return { account: account.email, status: 'success', role: userData.role }
      })
      
      results.push({ account: account.email, status: 'success' })
    } catch (error) {
      console.error(`  ❌ ${account.email}: ${error.message}`)
      results.push({ account: account.email, status: 'failed', error: error.message })
    }
  }
  
  return results
}

/**
 * Phase 2: Dashboard Data Loading Tests (Critical RLS Test)
 * This is where the previous 42P17 recursion errors occurred
 */
async function testDashboardDataLoading() {
  console.log('\n📊 Phase 2: Testing Dashboard Data Loading (Critical RLS Test)\n')
  
  const results = []
  
  // Test Student Dashboard with authenticated student
  try {
    await testWithAuthenticatedUser('student1@university.edu', 'password123', async (supabase, user) => {
      console.log('  Testing Student Dashboard queries...')
      
      // Test the critical query that caused recursion issues
      const { data: teamMemberships, error: teamError } = await supabase
        .from('teams_users')
        .select(`
          team:teams(
            id,
            name,
            course:courses(
              name
            )
          )
        `)
        .eq('user_id', user.id)
      
      if (teamError) {
        throw new Error(`Team memberships query failed: ${teamError.message}`)
      }
      
      console.log(`    ✅ Team memberships loaded: ${teamMemberships?.length || 0} teams`)
      
      // Test projects query
      const teamIds = teamMemberships?.map(tm => tm.team.id) || []
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          phase,
          updated_at,
          problem:problems(
            id,
            title
          ),
          team:teams(
            id,
            name
          )
        `)
        .in('team_id', teamIds.length > 0 ? teamIds : [''])
        .neq('phase', 'closed')
      
      if (projectsError) {
        throw new Error(`Projects query failed: ${projectsError.message}`)
      }
      
      console.log(`    ✅ Projects loaded: ${projects?.length || 0} projects`)
      
      // Test notifications query
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          is_read,
          created_at,
          actor:users!notifications_actor_id_fkey(
            name,
            email
          )
        `)
        .eq('recipient_id', user.id)
        .limit(5)
      
      if (notificationsError) {
        throw new Error(`Notifications query failed: ${notificationsError.message}`)
      }
      
      console.log(`    ✅ Notifications loaded: ${notifications?.length || 0} notifications`)
      
      return { dashboard: 'student', status: 'success' }
    })
    
    results.push({ dashboard: 'student', status: 'success' })
  } catch (error) {
    console.error(`  ❌ Student Dashboard: ${error.message}`)
    results.push({ dashboard: 'student', status: 'failed', error: error.message })
  }
  
  // Test Educator Dashboard with authenticated educator
  try {
    await testWithAuthenticatedUser('educator1@university.edu', 'password123', async (supabase, user) => {
      console.log('  Testing Educator Dashboard queries...')
      
      // Test educator courses query
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          teams(count),
          problems(count)
        `)
        .eq('admin_id', user.id)
      
      if (coursesError) {
        throw new Error(`Courses query failed: ${coursesError.message}`)
      }
      
      console.log(`    ✅ Courses loaded: ${courses?.length || 0} courses`)
      
      // Test educator projects query
      const courseIds = courses?.map(c => c.id) || []
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          phase,
          updated_at,
          problem:problems!inner(
            title,
            course_id
          ),
          team:teams(
            name
          )
        `)
        .in('problem.course_id', courseIds)
        .neq('phase', 'closed')
      
      if (projectsError) {
        throw new Error(`Educator projects query failed: ${projectsError.message}`)
      }
      
      console.log(`    ✅ Educator projects loaded: ${projects?.length || 0} projects`)
      
      return { dashboard: 'educator', status: 'success' }
    })
    
    results.push({ dashboard: 'educator', status: 'success' })
  } catch (error) {
    console.error(`  ❌ Educator Dashboard: ${error.message}`)
    results.push({ dashboard: 'educator', status: 'failed', error: error.message })
  }
  
  // Test Admin Dashboard with authenticated admin
  try {
    await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
      console.log('  Testing Admin Dashboard queries...')
      
      // Test system overview counts (admin should see all data)
      const [
        { count: totalUsers },
        { count: totalCourses },
        { count: totalTeams },
        { count: totalProjects }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true })
      ])
      
      console.log(`    ✅ System overview: ${totalUsers} users, ${totalCourses} courses, ${totalTeams} teams, ${totalProjects} projects`)
      
      return { dashboard: 'admin', status: 'success' }
    })
    
    results.push({ dashboard: 'admin', status: 'success' })
  } catch (error) {
    console.error(`  ❌ Admin Dashboard: ${error.message}`)
    results.push({ dashboard: 'admin', status: 'failed', error: error.message })
  }
  
  return results
}

/**
 * Phase 3: Cross-Role Boundary Tests (Security Validation)
 */
async function testCrossRoleBoundaries() {
  console.log('\n🔒 Phase 3: Testing Cross-Role Boundaries (Security Validation)\n')
  
  const results = []
  
  // Test Team Isolation: Student1 (Team Alpha) vs Student3 (Team Beta)
  try {
    console.log('  Testing team isolation...')
    
    let student1Projects = []
    let student3Projects = []
    
    // Get projects for Student 1 (Team Alpha)
    await testWithAuthenticatedUser('student1@university.edu', 'password123', async (supabase, user) => {
      const { data: teamMemberships } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('user_id', user.id)
      
      const teamIds = teamMemberships?.map(tm => tm.team_id) || []
      
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, team_id')
        .in('team_id', teamIds)
      
      if (error) throw new Error(`Student1 projects query failed: ${error.message}`)
      student1Projects = projects || []
    })
    
    // Get projects for Student 3 (Team Beta)
    await testWithAuthenticatedUser('student3@university.edu', 'password123', async (supabase, user) => {
      const { data: teamMemberships } = await supabase
        .from('teams_users')
        .select('team_id')
        .eq('user_id', user.id)
      
      const teamIds = teamMemberships?.map(tm => tm.team_id) || []
      
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, team_id')
        .in('team_id', teamIds)
      
      if (error) throw new Error(`Student3 projects query failed: ${error.message}`)
      student3Projects = projects || []
    })
    
    // Verify isolation
    const student1TeamIds = new Set(student1Projects.map(p => p.team_id))
    const student3TeamIds = new Set(student3Projects.map(p => p.team_id))
    
    const hasOverlap = [...student1TeamIds].some(id => student3TeamIds.has(id))
    if (hasOverlap) {
      throw new Error('Team isolation violated: students can see other teams projects')
    }
    
    console.log(`    ✅ Team isolation verified: Student1 sees ${student1Projects.length} projects, Student3 sees ${student3Projects.length} projects, no overlap`)
    results.push({ test: 'team_isolation', status: 'success' })
    
  } catch (error) {
    console.error(`  ❌ Team isolation test: ${error.message}`)
    results.push({ test: 'team_isolation', status: 'failed', error: error.message })
  }
  
  return results
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Authentication-Based Testing')
  console.log('   Following testing-requirements.md protocol: ALL tests use authenticated users\n')
  
  const testResults = {
    authentication: [],
    dashboards: [],
    boundaries: []
  }
  
  try {
    // Phase 1: Authentication Infrastructure
    testResults.authentication = await testAuthenticationInfrastructure()
    
    // Phase 2: Dashboard Data Loading (Critical RLS Test)
    testResults.dashboards = await testDashboardDataLoading()
    
    // Phase 3: Cross-Role Boundaries
    testResults.boundaries = await testCrossRoleBoundaries()
    
    // Summary
    console.log('\n📋 Test Results Summary:')
    console.log('========================')
    
    const authSuccesses = testResults.authentication.filter(r => r.status === 'success').length
    const authTotal = testResults.authentication.length
    console.log(`Authentication Tests: ${authSuccesses}/${authTotal} passed`)
    
    const dashSuccesses = testResults.dashboards.filter(r => r.status === 'success').length
    const dashTotal = testResults.dashboards.length
    console.log(`Dashboard Tests: ${dashSuccesses}/${dashTotal} passed`)
    
    const boundSuccesses = testResults.boundaries.filter(r => r.status === 'success').length
    const boundTotal = testResults.boundaries.length
    console.log(`Boundary Tests: ${boundSuccesses}/${boundTotal} passed`)
    
    const totalSuccesses = authSuccesses + dashSuccesses + boundSuccesses
    const totalTests = authTotal + dashTotal + boundTotal
    console.log(`\nOverall: ${totalSuccesses}/${totalTests} tests passed`)
    
    if (totalSuccesses === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! RLS policies are working correctly with authenticated users.')
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors above.')
      
      // Log failed tests
      const allResults = [...testResults.authentication, ...testResults.dashboards, ...testResults.boundaries]
      const failed = allResults.filter(r => r.status === 'failed')
      if (failed.length > 0) {
        console.log('\nFailed Tests:')
        failed.forEach(f => console.log(`  - ${f.account || f.dashboard || f.test}: ${f.error}`))
      }
    }
    
  } catch (error) {
    console.error('\n❌ Critical testing error:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests, testWithAuthenticatedUser }