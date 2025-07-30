Step 28.1 Complete Problem-to-Project Workflow Testing at localhost:3000

**Testing PRD Requirements**: This test verifies the end-to-end workflow from educator problem creation with team assignment to student project access, addressing PRD User Stories 3.1.1 (student can join team) and 3.2.1 (educator can create PBL problem).

Prerequisites Check

1. ✅ Ensure npm run dev is running at localhost:3000
2. ✅ Confirm database is seeded: `npm run db:seed -- --force`
3. ✅ Verify local Supabase is running: `supabase status`

---
**PART A: Educator Creates Problem with Teams** (PRD 3.2.1)

Step 1: Educator Authentication

1. Navigate to Application
  - Open browser to http://localhost:3000
  - Click "Login" button
  - Enter credentials:
      - Email: educator1@university.edu
      - Password: password123
  - Click "Sign In"
  - Expected: Redirect to /educator/dashboard

Step 2: Access Create Problem Page

1. Dashboard Navigation
  - Expected: See "Educator Dashboard" heading
  - Look for: Blue "Create Problem" button in top-right corner
  - Click the "Create Problem" button
  - Expected: Navigate to /educator/problems/new

Step 3: Fill Problem Basic Information

1. Problem Details
  - Title: "Test PBL Problem - Complete Workflow"
  - Description: "Testing the complete problem-to-project workflow with team creation"
  - Course: Select "Computational Biology 101"
  - Expected: Course selection triggers student loading

Step 4: **NEW - Teams Section Testing**

1. Verify Teams Section Appears
  - After selecting course, scroll down
  - Expected: See "Create Teams (Optional)" section
  - Expected: See "Add Team" button
  - Expected: See message about creating teams and assigning students

2. Create First Team
  - Click "Add Team" button
  - Expected: New team card appears with "Team 1"
  - Expected: Shows "0 students" badge
  - Expected: Shows student selection checkboxes for 4 students

3. Assign Students to Team 1
  - Check boxes for "Student 1" and "Student 2"
  - Expected: Badge updates to "2 students"
  - Expected: Checkboxes show selected state

4. Create Second Team
  - Click "Add Team" button again
  - Expected: New team card appears with "Team 2"
  - Assign "Student 3" and "Student 4" to Team 2
  - Expected: Team 2 shows "2 students"

5. Test Team Management
  - Try removing Team 2 (trash icon)
  - Expected: Team 2 disappears
  - Re-create Team 2 and assign students again

Step 5: Submit Problem with Teams

1. Complete Submission
  - Click "Create Problem" button
  - Expected: Button shows "Creating..." with loading state
  - Expected: Success redirect to /educator/dashboard
  - Expected: No error messages

---
**PART B: Verify Students Can Access Projects** (PRD 3.1.1)

Step 6: Student Authentication & Project Access

1. Login as Student 1
  - Sign out educator (user menu → Sign Out)
  - Login with:
      - Email: student1@university.edu
      - Password: password123
  - Expected: Redirect to /student/dashboard

2. Verify Project Visibility
  - Expected: See "Student Dashboard" heading
  - Look for "Active Projects" section
  - Expected: See the newly created project "Test PBL Problem - Complete Workflow"
  - Expected: Project shows "Phase: pre"
  - Expected: Team name shows "Team 1"

3. Access Project Workspace
  - Click on the project link
  - Expected: Navigate to /p/[projectId]
  - Expected: See project workspace page
  - Expected: See problem title and description
  - Expected: See learning goals editor (pre phase)

Step 7: Verify Second Student Access

1. Login as Student 3
  - Sign out student1
  - Login with student3@university.edu / password123
  - Expected: Navigate to /student/dashboard

2. Check Project Assignment
  - Expected: See the same project
  - Expected: Team name shows "Team 2" (different team)
  - Access project workspace
  - Expected: Same project, different team context

---
**PART C: Verify End-to-End Workflow**

Step 8: Complete Workflow Verification

1. Educator Dashboard Check
  - Login back as educator1@university.edu
  - Navigate to /educator/dashboard
  - Expected: See both projects in "Active Projects" section
  - Expected: One project for Team 1, one for Team 2
  - Expected: Both show "Phase: pre"

2. Data Integrity Check
  - All students can access their assigned projects
  - Projects are properly linked to teams and problem
  - No manual admin intervention was required

---
**Success Criteria Checklist** (PRD Requirements)

**Educator Workflow (PRD 3.2.1):**
- ✅ Can create PBL problem with title, description, and rubric
- ✅ Can create teams during problem creation
- ✅ Can assign students to teams via simple interface
- ✅ Teams and projects auto-created in single transaction

**Student Workflow (PRD 3.1.1):**
- ✅ Students automatically have access to projects
- ✅ Can join team (implicit via educator assignment)
- ✅ Can access project workspace immediately
- ✅ See correct team assignments

**Technical Requirements:**
- ✅ No manual admin intervention required
- ✅ End-to-end workflow from problem → teams → projects
- ✅ RLS policies working correctly
- ✅ Database transactions maintain consistency

**Critical Gap Resolved:**
- ✅ Educators can now create problems AND make them accessible to students
- ✅ Students immediately see projects after educator creates them
- ✅ Complete workflow eliminates broken user experience

If Any Issues Found

- Check browser console for JavaScript errors
- Verify all 4 students are visible in team creation
- Confirm project appears on both students' dashboards
- Ensure no database constraint violations

**Expected Result**: Complete end-to-end workflow from educator problem creation to student project access works seamlessly! 🎉