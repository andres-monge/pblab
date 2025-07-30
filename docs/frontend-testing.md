# Frontend Testing Guide

This document provides step-by-step testing instructions for each implemented feature in PBLab.

## Step 29: Student Final Report Submission

### Overview
Step 29 implements the final report submission feature where students can submit a URL to their final report during the research phase, which automatically transitions the project to the post phase.

### Test Requirements (from PRD & Competition Criteria)
- **PRD Section 3.1, User Story 6**: "I can submit the final report link and mark the project 'Ready for review'"
- **Core Requirement**: Students must be able to complete the problem-solving workflow

### Prerequisites
1. Development server running (`npm run dev`)
2. Database seeded with test accounts (`npm run db:seed`)
3. At least one project in the "research" phase with a student team member

### Test Accounts (from seed script)
- **Student**: `student1@example.com` / `password123`
- **Student**: `student2@example.com` / `password123`
- **Educator**: `educator1@example.com` / `password123`

### Test Scenarios

#### Scenario 1: Student Can Submit Final Report URL
1. **Login as Student**
   - Navigate to `http://localhost:3000`
   - Login with `student1@example.com` / `password123`

2. **Navigate to Research Phase Project**
   - Go to dashboard (`/student/dashboard`)
   - Click on a project that shows "Research" phase
   - Should be redirected to `/p/[projectId]`

3. **Verify Final Report Form Visibility**
   - Scroll down to find "Final Report Submission" section
   - Form should only be visible when project is in "research" phase
   - Form should contain:
     - URL input field with placeholder
     - "Submit Final Report" button
     - Helper text about Google Docs sharing settings

4. **Submit Valid Google Docs URL**
   - Enter a Google Docs URL (e.g., `https://docs.google.com/document/d/1234567890/edit`)
   - Click "Submit Final Report"
   - Should see success message
   - Project phase should automatically change from "research" to "post"

5. **Verify Phase Transition**
   - Page should refresh/update
   - Project phase indicator should show "Post"
   - Final report form should no longer be visible
   - Submitted report URL should be displayed in read-only format

#### Scenario 2: Form Validation Works
1. **Test Empty URL**
   - Try submitting with empty URL field
   - Should show validation error

2. **Test Invalid URL**
   - Enter invalid URL (e.g., "not-a-url")
   - Should show validation error

#### Scenario 3: Educator Can View Submitted Report
1. **Login as Educator**
   - Logout and login with `educator1@example.com` / `password123`

2. **Navigate to Post Phase Project**
   - Go to educator dashboard
   - Find the project that was just submitted (should be in "Post" phase)
   - Click to view project

3. **Verify Report Display**
   - Should see submitted final report URL displayed
   - URL should be clickable link
   - Should see read-only view of submission

#### Scenario 4: Wrong Phase Behavior
1. **Test Pre Phase Project**
   - Navigate to a project in "pre" phase
   - Final report form should NOT be visible

2. **Test Closed Phase Project**
   - Navigate to a project in "closed" phase  
   - Final report form should NOT be visible
   - Report should be displayed in read-only format

### Expected Behaviors

#### Success Criteria
-  Form only appears for students in research phase projects
-  URL validation prevents invalid submissions
-  Successful submission automatically transitions project to post phase
-  Submitted report displays correctly for both students and educators
-  Form disappears after successful submission
-  Educators can view submitted reports in post phase

#### Error Scenarios
- L Form should not appear in pre/post/closed phases
- L Non-students should not see the submission form
- L Invalid URLs should be rejected
- L Empty submissions should be prevented

### Technical Validation

#### Database Changes
After successful submission, verify in database:
```sql
-- Check project phase changed to 'post'
SELECT phase FROM projects WHERE id = '[project-id]';

-- Check final_report_url was saved
SELECT final_report_url FROM projects WHERE id = '[project-id]';
```

#### Network Requests
In browser dev tools, verify:
- POST request to server action succeeds
- Response indicates successful phase transition
- Page updates reflect new state

### Troubleshooting

#### Common Issues
1. **Form not visible**: Check project phase and user role
2. **Submission fails**: Check URL format and network connectivity
3. **Phase doesn't transition**: Check server action implementation
4. **Permission denied**: Verify user is team member of the project

#### Debug Steps
1. Check browser console for errors
2. Verify user authentication status
3. Confirm project exists and user has access
4. Check database RLS policies are working

### Related Features
This test connects to:
- Project phase management (Step 21-22)
- Student dashboard (Step 22)
- Project workspace layout (Step 27)
- Future educator assessment (Step 31)