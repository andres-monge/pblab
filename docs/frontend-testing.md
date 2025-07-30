Step 28 Complete User Flow Testing at localhost:3000

  Prerequisites Check

  1. ✅ Ensure npm run dev is running at localhost:3000
  2. ✅ Confirm database is seeded with test accounts

  ---
  Step 1: Authentication & Access

  1. Navigate to Application
    - Open browser to http://localhost:3000
    - Should see PBLab landing page
  2. Login as Educator
    - Click "Login" button
    - Enter credentials:
        - Email: educator1@university.edu
      - Password: password123
    - Click "Sign In"
    - Expected: Redirect to /educator/dashboard

  ---
  Step 2: Dashboard Navigation

  1. Verify Dashboard Layout
    - Should see "Educator Dashboard" heading
    - Should see three cards: "My Courses", "Active Projects", "Pending Assessments"
    - Look for: Blue "Create Problem" button in top-right corner
  2. Access Create Problem Page
    - Click the "Create Problem" button
    - Expected: Navigate to /educator/problems/new
    - Expected: URL shows /educator/problems/new

  ---
  Step 3: Create Problem Page Verification

  1. Page Load Check
    - Expected: Page loads without errors
    - Expected: Breadcrumb shows: "Dashboard → Create New Problem"
    - Expected: Page title "Create New Problem"
  2. Form Pre-population Check
    - Expected: Course dropdown shows "Computational Biology 101"
    - Expected: 5 rubric criteria are pre-loaded with default PBL template
    - Expected: Each criterion has sample text and max score of 5

  ---
  Step 4: Form Functionality Testing

  Basic Form Fields

  1. Title Field
    - Click in "Problem Title" field
    - Type: "Test UI Problem - [Your Name]"
    - Expected: Text appears normally
  2. Description Field
    - Click in "Problem Description" textarea
    - Type: "This is a test problem created through the UI to verify Step 28 functionality."
    - Expected: Textarea expands as needed
  3. Course Selection
    - Click course dropdown
    - Expected: Shows "Computational Biology 101" option
    - Select it
    - Expected: Dropdown shows selected course

  Dynamic Rubric Testing

  4. Edit Existing Criteria
    - Click in first criterion textarea
    - Modify the text (add "MODIFIED: " at the beginning)
    - Expected: Text updates normally
  5. Add New Criterion
    - Scroll down to rubric section
    - Click "Add Criterion" button
    - Expected: New empty criterion appears at bottom
    - Expected: Shows "Criterion 6"
    - Fill in text: "Test Criterion - Added via UI"
  6. Remove Criterion
    - Click trash icon on the newly added criterion
    - Expected: Criterion is removed
    - Try to remove criteria until only 1 remains
    - Expected: Remove button becomes disabled (minimum 1 enforced)
  7. Max Score Testing
    - Change max score on any criterion to 3
    - Expected: Value updates
    - Try entering 15 (invalid)
    - Expected: Should clamp to max value 10

  ---
  Step 5: Form Validation Testing

  Error Cases

  1. Empty Title Test
    - Clear the title field completely
    - Click "Create Problem" button
    - Expected: Red error message appears: "Problem title is required"
  2. Empty Course Test
    - Fill title but clear course selection
    - Click "Create Problem" button
    - Expected: Error message: "Please select a course"
  3. Empty Criterion Test
    - Clear the text of one criterion completely
    - Click "Create Problem" button
    - Expected: Error message: "All rubric criteria must have text"

  Fix and Retry

  4. Fill Valid Data
    - Title: "UI Test Problem"
    - Description: "Created via manual testing"
    - Course: Select "Computational Biology 101"
    - Ensure all criteria have text

  ---
  Step 6: Successful Submission

  1. Submit Form
    - Click "Create Problem" button
    - Expected: Button shows "Creating..." with loading state
    - Expected: Form fields become disabled during submission
  2. Success Verification
    - Expected: Redirect back to /educator/dashboard
    - Expected: No error messages appear
    - Expected: Back on dashboard page

  ---
  Step 7: Navigation Testing

  1. Cancel Button Test
    - Go back to /educator/problems/new
    - Fill in some data
    - Click "Cancel" button
    - Expected: Navigate back to previous page (dashboard)
  2. Breadcrumb Navigation
    - Go to /educator/problems/new again
    - Click "Dashboard" in breadcrumb
    - Expected: Navigate to /educator/dashboard

  ---
  Step 8: Mobile Responsiveness

  1. Resize Browser
    - Make browser window narrow (mobile size)
    - Navigate to create problem page
    - Expected: Form adapts to mobile layout
    - Expected: All buttons and fields remain usable

  ---
  Step 9: Back Button & Browser Navigation

  1. Browser Back Button
    - Navigate to create problem page
    - Use browser back button
    - Expected: Returns to dashboard
    - Use browser forward button
    - Expected: Returns to create problem page

  ---
  Success Criteria Checklist

  - ✅ Authentication works with educator account
  - ✅ Dashboard shows "Create Problem" button
  - ✅ Navigation to /educator/problems/new works
  - ✅ Page loads with pre-populated rubric template
  - ✅ Course dropdown shows available courses
  - ✅ Can add/remove rubric criteria dynamically
  - ✅ Form validation catches errors appropriately
  - ✅ Successful submission redirects to dashboard
  - ✅ No console errors during any step
  - ✅ Mobile responsive design works
  - ✅ Navigation (breadcrumbs, cancel, back) all work

  If Any Issues Found

  - Check browser console for errors
  - Verify database connection is working
  - Confirm you're using the correct test credentials
  - Ensure dev server is running without errors

  Expected Result: All steps should complete successfully, demonstrating that Step 28 is fully functional from the user perspective! 🎉