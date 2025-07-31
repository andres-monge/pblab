/**
 * Database Testing Helpers
 * 
 * Utilities for setting up and tearing down test database state.
 * Provides authenticated user contexts for testing RLS policies.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db.types';

// Test database configuration - use actual local Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables for testing');
}

/**
 * Service role client for admin operations (bypasses RLS)
 */
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Anonymous client for authenticated user testing (RLS enabled)
 */
export const supabaseAnon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test user credentials (matches seed script)
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@university.edu',
    password: 'password123',
    role: 'admin' as const
  },
  educator1: {
    email: 'educator1@university.edu', 
    password: 'password123',
    role: 'educator' as const
  },
  educator2: {
    email: 'educator2@university.edu',
    password: 'password123', 
    role: 'educator' as const
  },
  student1: {
    email: 'student1@university.edu',
    password: 'password123',
    role: 'student' as const
  },
  student2: {
    email: 'student2@university.edu',
    password: 'password123',
    role: 'student' as const
  },
  student3: {
    email: 'student3@university.edu',
    password: 'password123',
    role: 'student' as const
  },
  student4: {
    email: 'student4@university.edu',
    password: 'password123',
    role: 'student' as const
  }
} as const;

/**
 * Test with authenticated user context
 * 
 * Creates authenticated session and runs test function with authenticated client.
 * Automatically cleans up session after test.
 * 
 * @param userKey - Test user to authenticate as
 * @param testFn - Test function to run with authenticated client
 */
export async function testWithAuthenticatedUser<T>(
  userKey: keyof typeof TEST_USERS,
  testFn: (client: typeof supabaseAnon, user: { id: string; email: string; role: string }) => Promise<T>
): Promise<T> {
  const user = TEST_USERS[userKey];
  
  // Sign in with test user
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  
  if (authError || !authData.user) {
    throw new Error(`Failed to authenticate test user ${userKey}: ${authError?.message}`);
  }
  
  try {
    // Run test function with authenticated client
    return await testFn(supabaseAnon, {
      id: authData.user.id,
      email: authData.user.email!,
      role: user.role
    });
  } finally {
    // Clean up session
    await supabaseAnon.auth.signOut();
  }
}

/**
 * Reset database to clean state for testing
 * 
 * Clears all test data and re-seeds with sample data.
 * Uses admin privileges to bypass RLS.
 */
export async function resetTestDatabase(): Promise<void> {
  console.log('🧹 Resetting test database...');
  
  try {
    // Delete in reverse dependency order to avoid foreign key constraints
    const tables = [
      'assessment_scores',
      'assessments', 
      'ai_usage',
      'notifications',
      'comments',
      'artifacts',
      'projects',
      'rubric_criteria',
      'rubrics',
      'problems',
      'teams_users',
      'teams',
      'courses'
    ];
    
    for (const table of tables) {
      let error;
      if (table === 'teams_users') {
        // Handle composite key table (team_id + user_id)
        const result = await supabaseAdmin.from(table as any).delete().gte('team_id', '');
        error = result.error;
      } else {
        const result = await supabaseAdmin.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        error = result.error;
      }
      if (error) {
        console.warn(`Warning: Failed to clear ${table}:`, error.message);
      }
    }
    
    // Delete auth users (this will cascade to public.users via trigger)
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of users.users) {
      // Keep test users, delete any others created during tests
      if (!Object.values(TEST_USERS).some(testUser => testUser.email === user.email)) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }
    
    console.log('✅ Test database reset complete');
  } catch (error) {
    console.error('❌ Test database reset failed:', error);
    throw error;
  }
}

/**
 * Seed test database with sample data for testing
 * 
 * Simplified version that doesn't call process.exit like the main seed script.
 */
export async function seedTestDatabase(): Promise<void> {
  console.log('🌱 Seeding test database...');
  
  try {
    // Create minimal test data directly instead of using the main seed script
    // to avoid process.exit issues in tests
    
    // Check if data already exists
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id')
      .limit(1)
      .single();
    
    if (existingCourse) {
      console.log('✅ Test database already seeded');
      return;
    }

    // Create basic test data needed for tests
    const { error: courseError } = await supabaseAdmin
      .from('courses')
      .insert({
        id: '00000000-0000-0000-0000-000000000100',
        name: 'Test Course',
        admin_id: null
      })
      .select('id')
      .single();

    if (courseError) throw courseError;

    console.log('✅ Test database seeding complete');
  } catch (error) {
    console.error('❌ Test database seeding failed:', error);
    throw error;
  }
}

/**
 * Setup database for testing
 * 
 * Ensures test data exists without resetting the database.
 * Works with existing seeded data from npm run db:seed.
 */
export async function setupTestDatabase(): Promise<void> {
  console.log('🔍 Checking test database state...');
  
  // Check if data already exists
  const { data: existingCourse } = await supabaseAdmin
    .from('courses')
    .select('id')
    .limit(1)
    .single();
    
  if (existingCourse) {
    console.log('✅ Test database already has data, ready for testing');
    
    // Ensure test users exist with correct passwords
    for (const [key, user] of Object.entries(TEST_USERS)) {
      // Try to sign in to check if user exists
      const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log(`Creating test user: ${user.email}`);
        await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { role: user.role }
        });
      }
      
      // Sign out to clean up session
      await supabaseAnon.auth.signOut();
    }
    return;
  }
  
  // Only seed if database is truly empty
  console.log('📝 Database is empty, seeding test data...');
  await seedTestDatabase();
}

/**
 * Create or find a test project with team for testing
 * 
 * Prefers to reuse existing data to avoid conflicts.
 */
export async function createTestProject(overrides: {
  teamId?: string;
  problemId?: string;
  phase?: 'pre' | 'research' | 'post' | 'closed';
} = {}): Promise<{ projectId: string; teamId: string; problemId: string }> {
  const requestedPhase = overrides.phase || 'pre';
  
  // First, try to find an existing project that matches our criteria
  let query = supabaseAdmin
    .from('projects')
    .select('id, team_id, problem_id')
    .eq('phase', requestedPhase);
    
  if (overrides.teamId) {
    query = query.eq('team_id', overrides.teamId);
  }
  if (overrides.problemId) {
    query = query.eq('problem_id', overrides.problemId);
  }
  
  const { data: existingProject } = await query.limit(1).single();
  
  if (existingProject) {
    console.log(`📌 Reusing existing ${requestedPhase} phase project: ${existingProject.id}`);
    return {
      projectId: existingProject.id,
      teamId: existingProject.team_id,
      problemId: existingProject.problem_id
    };
  }
  
  // No existing project found, create a new one
  console.log(`🆕 Creating new ${requestedPhase} phase project...`);
  
  // Get existing course and problem from seed data
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('id')
    .limit(1)
    .single();
    
  if (!course) throw new Error('No test course found');
  
  const { data: problem } = await supabaseAdmin
    .from('problems')
    .select('id')
    .limit(1)
    .single();
    
  if (!problem) throw new Error('No test problem found');
  
  // Create test team if not provided
  let teamId = overrides.teamId;
  if (!teamId) {
    // Try to find an existing team first
    const { data: existingTeam } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('course_id', course.id)
      .limit(1)
      .single();
      
    if (existingTeam) {
      teamId = existingTeam.id;
      console.log(`📌 Reusing existing team: ${teamId}`);
    } else {
      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .insert({
          name: `Test Team ${Date.now()}`,
          course_id: course.id
        })
        .select('id')
        .single();
        
      if (teamError || !team) throw new Error('Failed to create test team');
      teamId = team.id;
    }
  }
  
  // Create test project
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .insert({
      problem_id: overrides.problemId || problem.id,
      team_id: teamId,
      phase: requestedPhase
    })
    .select('id')
    .single();
    
  if (projectError || !project) throw new Error(`Failed to create test project: ${projectError?.message}`);
  
  return {
    projectId: project.id,
    teamId,
    problemId: overrides.problemId || problem.id
  };
}

/**
 * Add user to team for testing
 */
export async function addUserToTeam(userId: string, teamId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('teams_users')
    .insert({
      user_id: userId,
      team_id: teamId
    });
    
  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`Failed to add user to team: ${error.message}`);
  }
}