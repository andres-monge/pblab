import { createClient } from '@supabase/supabase-js';
import { Database } from '../lib/db.types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Types for better type safety
type UserInsert = Database['public']['Tables']['users']['Insert'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type TeamInsert = Database['public']['Tables']['teams']['Insert'];
type TeamUserInsert = Database['public']['Tables']['teams_users']['Insert'];
type ProblemInsert = Database['public']['Tables']['problems']['Insert'];
type RubricInsert = Database['public']['Tables']['rubrics']['Insert'];
type RubricCriteriaInsert = Database['public']['Tables']['rubric_criteria']['Insert'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

// Supabase Auth User type
type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    role?: string;
  };
};

// Initialize Supabase client for seeding with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PBLab Database Seeding Script
 * Populates the database with sample data including the two example problems from PRD:
 * - "Outbreak Simulator" (Epidemiology)
 * - "EcoBalance" (Predator-Prey Ecology)
 */
async function seedDatabase() {
  console.log('🌱 Starting PBLab database seeding...');
  
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.');
    }

    console.log('✅ Environment variables loaded');
    console.log('✅ Supabase client initialized');
    
    // Step 1: Create sample users
    const users = await createSampleUsers();
    
    // Step 2: Create course
    const courseId = await createSampleCourse(users);
    
    // Step 3: Create teams
    const teamIds = await createSampleTeams(courseId);
    
    // Step 4: Assign students to teams
    await assignStudentsToTeams(teamIds, users);
    
    // Step 5: Create problems with rubrics
    const problemIds = await createSampleProblems(courseId, users);
    
    // Step 6: Create project instances
    await createSampleProjects(problemIds, teamIds);
    
    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

/**
 * Create sample users: 2 educators and 4 students
 * Uses Supabase Auth Admin API to create authenticated users
 */
async function createSampleUsers() {
  console.log('👥 Creating sample users...');
  
  const usersToCreate = [
    // Educators
    {
      email: 'educator1@university.edu',
      user_metadata: { name: 'Educator 1', role: 'educator' },
      email_confirm: true
    },
    {
      email: 'educator2@university.edu',
      user_metadata: { name: 'Educator 2', role: 'educator' },
      email_confirm: true
    },
    // Students
    {
      email: 'student1@university.edu',
      user_metadata: { name: 'Student 1', role: 'student' },
      email_confirm: true
    },
    {
      email: 'student2@university.edu',
      user_metadata: { name: 'Student 2', role: 'student' },
      email_confirm: true
    },
    {
      email: 'student3@university.edu',
      user_metadata: { name: 'Student 3', role: 'student' },
      email_confirm: true
    },
    {
      email: 'student4@university.edu',
      user_metadata: { name: 'Student 4', role: 'student' },
      email_confirm: true
    }
  ];

  const createdUsers = [];
  
  for (const userData of usersToCreate) {
    // Try to create new user (will fail gracefully if already exists)
    const { data, error } = await supabase.auth.admin.createUser(userData);
    
    if (error) {
      // Check if user already exists
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        console.log(`✓ User ${userData.email} already exists`);
        // Get existing users to find this one
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const existingUser = usersList.users.find(u => u.email === userData.email);
        if (existingUser) {
          createdUsers.push(existingUser);
        }
        continue;
      }
      throw new Error(`Failed to create user ${userData.email}: ${error.message}`);
    }
    
    if (data.user) {
      createdUsers.push(data.user);
      console.log(`✓ Created user: ${userData.email}`);
    }
  }

  // Now create corresponding entries in public.users table
  const publicUsers: UserInsert[] = createdUsers.map(user => ({
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split('@')[0],
    role: user.user_metadata?.role || 'student'
  }));

  const { error: publicUsersError } = await supabase
    .from('users')
    .upsert(publicUsers, { onConflict: 'id' });

  if (publicUsersError) {
    throw new Error(`Failed to create public users: ${publicUsersError.message}`);
  }
  
  console.log('✅ Created 6 sample users (2 educators, 4 students)');
  return createdUsers;
}

/**
 * Create a sample course
 */
async function createSampleCourse(users: AuthUser[]): Promise<string> {
  console.log('📚 Creating sample course...');
  
  // Find the first educator
  const educator = users.find(u => u.user_metadata?.role === 'educator');
  if (!educator) {
    throw new Error('No educator found to assign as course admin');
  }
  
  const course: CourseInsert = {
    id: '00000000-0000-0000-0000-000000000100',
    name: 'Computational Biology 101',
    admin_id: educator.id
  };

  const { error } = await supabase
    .from('courses')
    .upsert([course], { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`);
  }
  
  console.log('✅ Created course: Computational Biology 101');
  return course.id!;
}

/**
 * Create sample teams
 */
async function createSampleTeams(courseId: string): Promise<string[]> {
  console.log('👥 Creating sample teams...');
  
  const teams: TeamInsert[] = [
    {
      id: '00000000-0000-0000-0000-000000000200',
      name: 'Team Alpha',
      course_id: courseId
    },
    {
      id: '00000000-0000-0000-0000-000000000201',
      name: 'Team Beta',
      course_id: courseId
    }
  ];

  const { error } = await supabase
    .from('teams')
    .upsert(teams, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to create teams: ${error.message}`);
  }
  
  console.log('✅ Created 2 teams: Team Alpha, Team Beta');
  return teams.map(team => team.id!);
}

/**
 * Assign students to teams
 */
async function assignStudentsToTeams(teamIds: string[], users: AuthUser[]) {
  console.log('🔗 Assigning students to teams...');
  
  // Find students
  const students = users.filter(u => u.user_metadata?.role === 'student');
  if (students.length < 4) {
    throw new Error('Need at least 4 students for team assignments');
  }
  
  const teamAssignments: TeamUserInsert[] = [
    // Team Alpha: First 2 students
    { team_id: teamIds[0], user_id: students[0].id },
    { team_id: teamIds[0], user_id: students[1].id },
    // Team Beta: Next 2 students
    { team_id: teamIds[1], user_id: students[2].id },
    { team_id: teamIds[1], user_id: students[3].id }
  ];

  const { error } = await supabase
    .from('teams_users')
    .upsert(teamAssignments, { onConflict: 'team_id,user_id' });

  if (error) {
    throw new Error(`Failed to assign students to teams: ${error.message}`);
  }
  
  console.log('✅ Assigned students to teams (2 students per team)');
}

/**
 * Create sample problems with rubrics based on PRD specifications
 */
async function createSampleProblems(courseId: string, users: AuthUser[]): Promise<string[]> {
  console.log('🧩 Creating sample problems...');
  
  // Problem 1: Outbreak Simulator
  const outbreakProblem: ProblemInsert = {
    id: '00000000-0000-0000-0000-000000000300',
    title: 'Outbreak Simulator',
    description: `# Outbreak Simulator (Epidemiology)

A mysterious pathogen emerges in a city. Model its spread and propose containment strategies.

## Deliverable
A playable web simulation (SIR model) + report comparing R₀ under interventions.

## Learning Goals
• Understand SIR equations
• Implement basic differential equations in JS
• Interpret R₀
• Evaluate vaccination vs. quarantine

## Expected Artifacts
• Google Sheet with data
• Code repository link
• Demo GIF

## AI Coach Guidance
Your AI tutor can help with prompts like:
- "Suggest parameter ranges for an airborne virus"
- "Explain R₀ to a 12-year-old"`,
    creator_id: users.find(u => u.user_metadata?.role === 'educator')?.id,
    course_id: courseId
  };

  // Problem 2: EcoBalance
  const ecoBalanceProblem: ProblemInsert = {
    id: '00000000-0000-0000-0000-000000000301',
    title: 'EcoBalance',
    description: `# EcoBalance (Predator-Prey Ecology)

Design a simple ecosystem where predators and prey reach dynamic equilibrium. Adjust variables to prevent extinction.

## Deliverable
Interactive Lotka-Volterra simulation + reflective essay on sustainability parallels.

## Learning Goals
• Implement predator-prey equations
• Visualize populations over time
• Identify tipping points

## Expected Artifacts
• Time-series charts
• Short explainer video
• Code link

## AI Coach Guidance
Your AI tutor can help with prompts like:
- "Derive Lotka-Volterra from first principles"
- "Suggest UX to show population collapse"`,
    creator_id: users.find(u => u.user_metadata?.role === 'educator')?.id,
    course_id: courseId
  };

  const { error: problemsError } = await supabase
    .from('problems')
    .upsert([outbreakProblem, ecoBalanceProblem], { onConflict: 'id' });

  if (problemsError) {
    throw new Error(`Failed to create problems: ${problemsError.message}`);
  }

  // Create rubrics for both problems
  await createRubrics([outbreakProblem.id!, ecoBalanceProblem.id!]);
  
  console.log('✅ Created 2 problems: Outbreak Simulator, EcoBalance');
  return [outbreakProblem.id!, ecoBalanceProblem.id!];
}

/**
 * Create rubrics with criteria for problems
 */
async function createRubrics(problemIds: string[]) {
  console.log('📋 Creating rubrics and criteria...');
  
  const rubrics: RubricInsert[] = problemIds.map((problemId, index) => ({
    id: `00000000-0000-0000-0000-00000000040${index}`,
    problem_id: problemId,
    name: index === 0 ? 'Outbreak Simulator Rubric' : 'EcoBalance Rubric'
  }));

  const { error: rubricsError } = await supabase
    .from('rubrics')
    .upsert(rubrics, { onConflict: 'id' });

  if (rubricsError) {
    throw new Error(`Failed to create rubrics: ${rubricsError.message}`);
  }

  // Create criteria for both rubrics
  const criteriaData: RubricCriteriaInsert[] = [];
  const criteriaTexts = [
    'Problem Understanding & Research: Demonstrates clear comprehension of the problem domain and conducts thorough background research',
    'Technical Implementation: Successfully implements required equations and algorithms with appropriate tools and technologies',
    'Data Analysis & Interpretation: Accurately analyzes simulation results and draws meaningful conclusions from the data',
    'Communication & Presentation: Clearly communicates findings through well-structured reports, visualizations, and presentations',
    'Collaboration & Process: Effectively collaborates with team members and follows the PBL methodology throughout the project'
  ];

  rubrics.forEach((rubric) => {
    criteriaTexts.forEach((criterionText, criterionIndex) => {
      criteriaData.push({
        rubric_id: rubric.id!,
        criterion_text: criterionText,
        max_score: 5,
        sort_order: criterionIndex
      });
    });
  });

  const { error: criteriaError } = await supabase
    .from('rubric_criteria')
    .upsert(criteriaData, { onConflict: 'id' });

  if (criteriaError) {
    throw new Error(`Failed to create rubric criteria: ${criteriaError.message}`);
  }
  
  console.log('✅ Created rubrics with 5 criteria each (1-5 point scale)');
}

/**
 * Create sample projects (problem instances assigned to teams)
 */
async function createSampleProjects(problemIds: string[], teamIds: string[]) {
  console.log('🚀 Creating sample projects...');
  
  const projects: ProjectInsert[] = [
    // Team Alpha - Outbreak Simulator
    {
      id: '00000000-0000-0000-0000-000000000500',
      problem_id: problemIds[0],
      team_id: teamIds[0],
      phase: 'research' // As requested, both projects in research phase
    },
    // Team Alpha - EcoBalance
    {
      id: '00000000-0000-0000-0000-000000000501',
      problem_id: problemIds[1],
      team_id: teamIds[0],
      phase: 'research'
    },
    // Team Beta - Outbreak Simulator
    {
      id: '00000000-0000-0000-0000-000000000502',
      problem_id: problemIds[0],
      team_id: teamIds[1],
      phase: 'research'
    },
    // Team Beta - EcoBalance
    {
      id: '00000000-0000-0000-0000-000000000503',
      problem_id: problemIds[1],
      team_id: teamIds[1],
      phase: 'research'
    }
  ];

  const { error } = await supabase
    .from('projects')
    .upsert(projects, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to create projects: ${error.message}`);
  }
  
  console.log('✅ Created 4 projects (both teams working on both problems)');
}

// Run the seeding script
if (require.main === module) {
  seedDatabase();
} 