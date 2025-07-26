Here is a step-by-step manual testing plan from a user's perspective for the front-end implementation (Steps 19-26).

This guide assumes you have successfully run the database seeding script (`npm run db:seed`) and the test accounts are available.

---

## 🧪 Frontend Manual Testing Plan

### Step 19 & 22: Main Layout and Role-Based Dashboards

**Objective:** Ensure the main application layout is functional, responsive, and correctly displays role-specific navigation and dashboards after login.

**Credentials to Use:**
* **Admin:** `admin@university.edu` / `password123`
* **Educator:** `educator1@university.edu` / `password123`
* **Student:** `student1@university.edu` / `password123`

**Testing Actions:**

1.  **Test Student Role:**
    * Go to the login page.
    * Log in as **`student1@university.edu`**.
    * **Verify Redirect:** You should be redirected to the student dashboard, and the URL should be `/student/dashboard`.
    * **Verify Header:** The header should display the user's name ("Student 1") or an avatar.
    * **Verify Sidebar:** The sidebar should show student-specific navigation links.
    * **Verify Content:** The dashboard should display the projects assigned to "Team Alpha" ("Outbreak Simulator" and "EcoBalance").

2.  **Test Educator Role:**
    * Log out.
    * Log in as **`educator1@university.edu`**.
    * **Verify Redirect:** You should be redirected to the educator dashboard at `/educator/dashboard`.
    * **Verify Header & Sidebar:** Confirm the header shows "Educator 1" and the sidebar displays educator-specific links (e.g., "Dashboard," "Problems").
    * **Verify Content:** The dashboard should show a view of all teams and projects, including "Team Alpha" and "Team Beta".

3.  **Test Admin Role:**
    * Log out.
    * Log in as **`admin@university.edu`**.
    * **Verify Redirect:** You should be redirected to the admin dashboard at `/admin/dashboard`.
    * **Verify Header & Sidebar:** Confirm the header shows "Admin User" and the sidebar has admin links.

4.  **Test Responsiveness:**
    * While logged in, open your browser's developer tools and switch to a mobile view (e.g., iPhone 12).
    * **Verify Layout:** The sidebar should collapse into a hamburger menu icon. Clicking the icon should open the navigation panel. The layout should be clean and usable.

### Step 20 & 21: Password Authentication and Student Invite Flow

**Objective:** Verify that the password login form works correctly and that the entire student-invite-to-team flow is functional for new users.

**Testing Actions:**

1.  **Test Login Form:**
    * Go to the login page.
    * Confirm the form has fields for **email** and **password**.
    * Enter an incorrect password for `student1@university.edu`. Verify that a clear error message is displayed.
    * Log in successfully with the correct credentials.

2.  **Test Student Invite Flow (The "Happy Path"):**
    * **Generate Invite Link:** As an **Educator**, navigate to the team management page. Select a team (e.g., "Team Beta") and click a "Generate Invite Link" button. Copy the generated URL.
    * **Log Out** of the educator account.
    * **Open Invite Link:** In a new browser tab or an incognito window, paste the invite link.
    * **Verify Signup Context:** The page should show a special signup form indicating "You have been invited to join Team Beta."
    * **Sign Up New User:** Create a *new* student account (e.g., `student5@university.edu`, password `password123`).
    * **Verify Outcome:** After successfully signing up, you should be automatically:
        * Logged in as the new student.
        * Added as a member of "Team Beta".
        * Redirected to the student dashboard, where you can see the team's projects.

### Step 22.1: Admin Dashboard CRUD

**Objective:** Ensure the admin can fully manage users and teams.

**Testing Actions:**

1.  Log in as **`admin@university.edu`**.
2.  Navigate to the user management section of the admin dashboard.
3.  **Read Users:** Verify that a table displays all seeded users (`admin@...`, `educator1@...`, `student1@...`, etc.).
4.  **Create User:**
    * Find and click a "New User" button.
    * Fill out the form to create a new user: `test-student@university.edu`, name "Test Student", role "student".
    * Confirm the new user appears in the user list.
5.  **Update User:**
    * Find the newly created "Test Student" in the list.
    * Click an "Edit" button.
    * Change their role from "student" to "educator".
    * Save the changes and verify the role is updated in the list.
6.  **Delete User:**
    * Find the "Test Student" user again.
    * Click a "Delete" button.
    * Verify that a confirmation modal appears before deletion.
    * Confirm the deletion, and ensure the user is removed from the list.
7.  **Test Team CRUD:** Repeat steps 3-6 for the team management interface.

### Step 24 & 26: Project Workspace (Pre-discussion Phase)

**Objective:** Test the Learning Goal editor and artifact/comment functionality for a project in the 'pre' phase.

**Note:** The seed script sets projects to 'research'. For this test, you may need to manually update a project's `phase` to `'pre'` in your Supabase database.

**Testing Actions:**

1.  Log in as a student (`student1@university.edu`, Team Alpha).
2.  Navigate to the "Outbreak Simulator" project page, which you have set to the **`pre`** phase.
3.  **Test Learning Goal Editor:**
    * Verify the `<LearningGoalEditor />` component is visible.
    * Click the **"AI Suggestions"** button. A list of relevant goals should appear.
    * Type your own goals into the main text area (e.g., "Understand the SIR model").
    * Click **"Save Goals"**.
    * **Reload the page.** Your saved goals should still be present in the editor.

4.  **Test Artifacts and Comments:**
    * Find the `<ArtifactUploader />`.
    * **Add a Link:** Paste a URL (e.g., `https://www.google.com`) and give it a title. Verify it appears as an `<ArtifactCard />`.
    * **Add a File:** Try to upload a `.jpg` or `.png` file. Verify it succeeds.
    * **Test Security:** Try to upload an `.exe` file. Verify you receive an error message and the upload is blocked.
    * In the comment section of an artifact, find the **@mention** feature.
    * Verify the list of mentionable users includes `Student 2` and `Educator 1` but **not** `Student 3` (who is on another team).
    * Post a comment: `Hey @Student 2, check this out.`

### Step 23: Notifications UI

**Objective:** Test that @mentions create notifications that are visible and functional.

**Testing Actions:**

1.  In one browser, be logged in as `student1@university.edu`.
2.  In a **separate browser or incognito window**, log in as `student2@university.edu`.
3.  As **Student 1**, perform the final action from the previous test: post a comment mentioning `@Student 2`.
4.  Switch to **Student 2's** browser.
5.  **Verify Notification:** Look at the header. A notification indicator (e.g., a red dot) should appear on a bell icon.
6.  Click the bell icon. A dropdown should appear showing the notification from Student 1.
7.  Click the notification. You should be taken directly to the artifact and the specific comment.
8.  The notification should now be marked as read, and the indicator dot should disappear.

### Step 25: Shared AI Tutor Chat

**Objective:** Verify the AI Tutor chat history is shared in real-time between team members and maintains conversational context.

**Testing Actions:**

1.  Have `student1@university.edu` and `student2@university.edu` (Team Alpha) logged in on separate browsers and navigated to the same project page (e.g., "EcoBalance").
2.  As **Student 1**, open the `<AiTutorChat />` component.
3.  Ask a question from the PRD: `"Derive Lotka-Volterra from first principles"`
4.  Once the AI replies, switch to **Student 2's** browser.
5.  **Verify Shared History:** The chat window for Student 2 should display the question from Student 1 and the AI's response.
6.  As **Student 2**, ask a contextual follow-up: `"How can I use this to show population collapse?"`
7.  Verify the AI provides a relevant answer that builds on the previous topic.
8.  Switch back to **Student 1's** browser and confirm the entire conversation is visible.