/**
 * Admin Dashboard Data Investigation
 * 
 * Investigating why admin sees 0 courses/teams but educator sees data
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testWithAuthenticatedUser(email, password, testFn) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (authError) {
    throw new Error(`Authentication failed for ${email}: ${authError.message}`)
  }
  
  try {
    return await testFn(supabase, data.user)
  } finally {
    await supabase.auth.signOut()
  }
}

async function investigateAdminIssue() {
  console.log('🔍 Investigating Admin Dashboard Data Issue\n')
  
  // Test with service role to see what data actually exists
  console.log('1. Testing with service role (bypasses RLS) to see actual data:')
  const serviceSupabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const [
    { data: allUsers, count: totalUsers },
    { data: allCourses, count: totalCourses },
    { data: allTeams, count: totalTeams },
    { data: allProjects, count: totalProjects }
  ] = await Promise.all([
    serviceSupabase.from('users').select('id, email, role', { count: 'exact' }),
    serviceSupabase.from('courses').select('id, name, admin_id', { count: 'exact' }),
    serviceSupabase.from('teams').select('id, name, course_id', { count: 'exact' }),
    serviceSupabase.from('projects').select('id, phase, team_id', { count: 'exact' })
  ])
  
  console.log(`   Service role sees: ${totalUsers} users, ${totalCourses} courses, ${totalTeams} teams, ${totalProjects} projects`)
  console.log('   Courses:', allCourses?.map(c => `${c.name} (admin: ${c.admin_id})`))
  console.log('   Teams:', allTeams?.map(t => `${t.name} (course: ${t.course_id})`))
  
  // Test with authenticated admin
  console.log('\n2. Testing with authenticated admin:')
  await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
    console.log(`   Admin user ID: ${user.id}`)
    
    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    console.log(`   Admin role in DB: ${userData?.role}`)
    
    // Test each query separately
    const { data: adminCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, admin_id')
    console.log(`   Admin courses query: ${adminCourses?.length || 0} courses${coursesError ? ` (Error: ${coursesError.message})` : ''}`)
    
    const { data: adminTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, course_id')
    console.log(`   Admin teams query: ${adminTeams?.length || 0} teams${teamsError ? ` (Error: ${teamsError.message})` : ''}`)
    
    const { data: adminProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, phase, team_id')
    console.log(`   Admin projects query: ${adminProjects?.length || 0} projects${projectsError ? ` (Error: ${projectsError.message})` : ''}`)
  })
  
  // Test with authenticated educator for comparison
  console.log('\n3. Testing with authenticated educator for comparison:')
  await testWithAuthenticatedUser('educator1@university.edu', 'password123', async (supabase, user) => {
    console.log(`   Educator user ID: ${user.id}`)
    
    const { data: educatorCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, admin_id')
    console.log(`   Educator courses query: ${educatorCourses?.length || 0} courses${coursesError ? ` (Error: ${coursesError.message})` : ''}`)
    
    const { data: educatorTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, course_id')
    console.log(`   Educator teams query: ${educatorTeams?.length || 0} teams${teamsError ? ` (Error: ${teamsError.message})` : ''}`)
    
    if (educatorCourses?.length > 0) {
      console.log(`   Educator manages course: ${educatorCourses[0].name} (ID: ${educatorCourses[0].id})`)
    }
  })
}

if (require.main === module) {
  investigateAdminIssue().catch(console.error)
}

module.exports = { investigateAdminIssue }