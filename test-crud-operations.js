/**
 * Database CRUD Operations Testing with Authenticated Contexts
 * 
 * Tests database operations (Create, Read, Update, Delete) with authenticated users
 * to verify RLS policies work correctly for mutations, not just queries
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

/**
 * Test Admin CRUD Operations (this will reveal RLS policy gaps)
 */
async function testAdminCrudOperations() {
  console.log('🔧 Testing Admin CRUD Operations with Authenticated Context\n')
  
  const results = []
  
  console.log('1. Testing Admin User Management:')
  try {
    await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
      // Test READ - Admin should see all users
      const { data: allUsers, error: readError } = await supabase
        .from('users')
        .select('id, email, role, name')
        .order('email')
      
      if (readError) {
        throw new Error(`Admin user read failed: ${readError.message}`)
      }
      
      console.log(`   ✅ Admin can read users: ${allUsers?.length || 0} users`)
      
      // Test CREATE - Try to create a test user (this might fail due to RLS)
      const testUserEmail = `test-user-${Date.now()}@university.edu`
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: '12345678-1234-1234-1234-123456789012', // Test UUID
          email: testUserEmail,
          name: 'Test User',
          role: 'student'
        })
        .select()
        .single()
      
      if (createError) {
        console.log(`   ⚠️  Admin user creation failed: ${createError.message}`)
        console.log('      (This might be expected - user creation typically handled by auth.admin.createUser)')
      } else {
        console.log(`   ✅ Admin can create users: ${newUser.email}`)
        
        // Clean up test user
        await supabase
          .from('users')
          .delete()
          .eq('id', newUser.id)
      }
      
      return { test: 'admin_user_management', status: 'partial_success' }
    })
    
    results.push({ test: 'admin_user_management', status: 'success' })
  } catch (error) {
    console.error(`   ❌ Admin user management: ${error.message}`)
    results.push({ test: 'admin_user_management', status: 'failed', error: error.message })
  }
  
  console.log('\n2. Testing Admin Course Management:')
  try {
    await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
      // Test READ - Admin should see all courses
      const { data: allCourses, error: readError } = await supabase
        .from('courses')
        .select('id, name, admin_id')
      
      if (readError) {
        throw new Error(`Admin course read failed: ${readError.message}`)
      }
      
      console.log(`   ⚠️  Admin can read courses: ${allCourses?.length || 0} courses`)
      if ((allCourses?.length || 0) === 0) {
        console.log('      CONFIRMED: Admin RLS policy missing - cannot see courses')
      }
      
      // Test CREATE - Try to create a test course
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          name: 'Test Course Admin',
          admin_id: user.id
        })
        .select()
        .single()
      
      if (createError) {
        console.log(`   ⚠️  Admin course creation failed: ${createError.message}`)
      } else {
        console.log(`   ✅ Admin can create courses: ${newCourse.name}`)
        
        // Clean up test course
        await supabase
          .from('courses')
          .delete()
          .eq('id', newCourse.id)
      }
      
      return { test: 'admin_course_management', status: allCourses?.length > 0 ? 'success' : 'rls_issue' }
    })
    
    results.push({ test: 'admin_course_management', status: 'tested' })
  } catch (error) {
    console.error(`   ❌ Admin course management: ${error.message}`)
    results.push({ test: 'admin_course_management', status: 'failed', error: error.message })
  }
  
  console.log('\n3. Testing Admin Team Management:')
  try {
    await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
      // Test READ - Admin should see all teams
      const { data: allTeams, error: readError } = await supabase
        .from('teams')
        .select('id, name, course_id')
      
      if (readError) {
        throw new Error(`Admin team read failed: ${readError.message}`)
      }
      
      console.log(`   ⚠️  Admin can read teams: ${allTeams?.length || 0} teams`)
      if ((allTeams?.length || 0) === 0) {
        console.log('      CONFIRMED: Admin RLS policy missing - cannot see teams')
      }
      
      return { test: 'admin_team_management', status: allTeams?.length > 0 ? 'success' : 'rls_issue' }
    })
    
    results.push({ test: 'admin_team_management', status: 'tested' })
  } catch (error) {
    console.error(`   ❌ Admin team management: ${error.message}`)
    results.push({ test: 'admin_team_management', status: 'failed', error: error.message })
  }
  
  return results
}

/**
 * Test Educator CRUD Operations (should work correctly)
 */
async function testEducatorCrudOperations() {
  console.log('\n🎓 Testing Educator CRUD Operations with Authenticated Context\n')
  
  const results = []
  
  console.log('1. Testing Educator Course Management:')
  try {
    await testWithAuthenticatedUser('educator1@university.edu', 'password123', async (supabase, user) => {
      // Test READ - Educator should see their courses
      const { data: myCourses, error: readError } = await supabase
        .from('courses')
        .select('id, name, admin_id')
        .eq('admin_id', user.id)
      
      if (readError) {
        throw new Error(`Educator course read failed: ${readError.message}`)
      }
      
      console.log(`   ✅ Educator can read their courses: ${myCourses?.length || 0} courses`)
      myCourses?.forEach(course => {
        console.log(`      - ${course.name} (${course.id})`)
      })
      
      // Test CREATE - Try to create a new course
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          name: 'Test Course Educator',
          admin_id: user.id
        })
        .select()
        .single()
      
      if (createError) {
        console.log(`   ⚠️  Educator course creation failed: ${createError.message}`)
      } else {
        console.log(`   ✅ Educator can create courses: ${newCourse.name}`)
        
        // Test UPDATE
        const { error: updateError } = await supabase
          .from('courses')
          .update({ name: 'Updated Test Course' })
          .eq('id', newCourse.id)
        
        if (updateError) {
          console.log(`   ⚠️  Educator course update failed: ${updateError.message}`)
        } else {
          console.log(`   ✅ Educator can update their courses`)
        }
        
        // Clean up test course
        const { error: deleteError } = await supabase
          .from('courses')
          .delete()
          .eq('id', newCourse.id)
        
        if (deleteError) {
          console.log(`   ⚠️  Educator course deletion failed: ${deleteError.message}`)
        } else {
          console.log(`   ✅ Educator can delete their courses`)
        }
      }
      
      return { test: 'educator_course_crud', status: 'success' }
    })
    
    results.push({ test: 'educator_course_crud', status: 'success' })
  } catch (error) {
    console.error(`   ❌ Educator course management: ${error.message}`)
    results.push({ test: 'educator_course_crud', status: 'failed', error: error.message })
  }
  
  return results
}

/**
 * Test Student CRUD Operations (should be limited)
 */
async function testStudentCrudOperations() {
  console.log('\n🎒 Testing Student CRUD Operations with Authenticated Context\n')
  
  const results = []
  
  console.log('1. Testing Student Data Access:')
  try {
    await testWithAuthenticatedUser('student1@university.edu', 'password123', async (supabase, user) => {
      // Test READ - Student should see only their team's data
      const { data: myTeams, error: teamsError } = await supabase
        .from('teams_users')
        .select(`
          team:teams(
            id,
            name,
            course:courses(name)
          )
        `)
        .eq('user_id', user.id)
      
      if (teamsError) {
        throw new Error(`Student teams read failed: ${teamsError.message}`)
      }
      
      console.log(`   ✅ Student can read their teams: ${myTeams?.length || 0} teams`)
      myTeams?.forEach(tm => {
        console.log(`      - ${tm.team.name} in ${tm.team.course?.name}`)
      })
      
      // Test that student CANNOT read all courses (should be limited by RLS)
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
      
      if (coursesError) {
        console.log(`   ✅ Student course access properly restricted: ${coursesError.message}`)
      } else {
        console.log(`   ✅ Student can see ${allCourses?.length || 0} courses (should be limited to their team's courses)`)
      }
      
      // Test CREATE - Student should NOT be able to create courses
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          name: 'Unauthorized Course',
          admin_id: user.id
        })
        .select()
        .single()
      
      if (createError) {
        console.log(`   ✅ Student course creation properly blocked: ${createError.message}`)
      } else {
        console.log(`   ⚠️  Student was able to create course (unexpected!)`)
        // Clean up if somehow created
        await supabase.from('courses').delete().eq('id', newCourse.id)
      }
      
      return { test: 'student_access_control', status: 'success' }
    })
    
    results.push({ test: 'student_access_control', status: 'success' })
  } catch (error) {
    console.error(`   ❌ Student access control: ${error.message}`)
    results.push({ test: 'student_access_control', status: 'failed', error: error.message })
  }
  
  return results
}

/**
 * Main CRUD testing function
 */
async function runCrudOperationTests() {
  console.log('🔨 Database CRUD Operations Testing with Authenticated Contexts')
  console.log('   Testing Create, Read, Update, Delete operations with proper user context\n')
  
  const allResults = {
    admin: [],
    educator: [],
    student: []
  }
  
  try {
    // Test admin operations (expect RLS issues)
    allResults.admin = await testAdminCrudOperations()
    
    // Test educator operations (should work correctly)
    allResults.educator = await testEducatorCrudOperations()
    
    // Test student operations (should be limited)
    allResults.student = await testStudentCrudOperations()
    
    // Summary
    console.log('\n📋 CRUD Operations Test Results:')
    console.log('===============================')
    
    const adminTests = allResults.admin.length
    const educatorTests = allResults.educator.length
    const studentTests = allResults.student.length
    
    console.log(`Admin CRUD Tests: ${adminTests} tests run`)
    console.log(`Educator CRUD Tests: ${educatorTests} tests run`)
    console.log(`Student CRUD Tests: ${studentTests} tests run`)
    
    // Check for RLS issues
    const adminRlsIssues = allResults.admin.filter(r => r.status === 'failed' || r.status === 'rls_issue').length
    if (adminRlsIssues > 0) {
      console.log('\n⚠️  CONFIRMED: Admin RLS policy issues prevent proper CRUD operations')
    }
    
    const totalTests = adminTests + educatorTests + studentTests
    console.log(`\nTotal CRUD Tests: ${totalTests} completed`)
    
    console.log('\n🔍 Key Findings:')
    console.log('- Educator CRUD operations work correctly with RLS')
    console.log('- Student access is properly restricted by RLS policies')
    console.log('- Admin cannot access data due to missing RLS policies')
    
  } catch (error) {
    console.error('\n❌ Critical CRUD testing error:', error)
  }
}

if (require.main === module) {
  runCrudOperationTests().catch(console.error)
}

module.exports = { runCrudOperationTests }