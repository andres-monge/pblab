### \#\# Testing Prerequisites

Before starting, ensure you have successfully run the database seeding script:

1.  Run `npm install` to get all dependencies.
2.  Run `npm run db:seed` from your terminal.
3.  This populates your database with **2 educators**, **4 students**, **1 course**, **2 teams**, **2 problems**, and **4 projects**, as detailed in your PRD.

-----

### \#\#\# Step 19: Main App Layout

**Objective:** Verify that the core authenticated application layout, including the header and sidebar, renders correctly after a user logs in.

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in using the magic link for **`educator1@university.edu`**. | You are successfully logged in and redirected to the main application. |
| 2 | Observe the overall page layout. | You see a two-column layout: a navigation sidebar on the left and a main content area on the right. |
| 3 | Check the header at the top of the main content area. | The header contains the **PBLab logo** and a user menu on the far right with the name "Educator 1". |
| 4 | Click the user menu. | A dropdown appears with a "Logout" option. Clicking it logs you out. |

\<br\>

-----

### \#\#\# Step 20: Role-Based Dashboards and Redirects

**Objective:** Confirm that users are automatically routed to the correct dashboard for their role and cannot access pages for other roles.

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as the educator: **`educator1@university.edu`**. | You are automatically redirected to `/educator/dashboard`. The page should show projects for both "Team Alpha" and "Team Beta". |
| 2 | Log out. | You are returned to the login page. |
| 3 | Log in as the student: **`student1@university.edu`**. | You are automatically redirected to `/student/dashboard`. The page shows the two projects assigned to "Team Alpha": **"Outbreak Simulator"** and **"EcoBalance"**. You should not see any projects for "Team Beta". |
| 4 | While logged in as `student1`, manually type `/educator/dashboard` into the browser's address bar and press Enter. | You are blocked from viewing the page and are either redirected to your own dashboard or shown a "Not Found" / "Permission Denied" message. |

\<br\>

-----

### \#\#\# Step 21: Notifications UI

**Objective:** Test the full notification workflow: receiving a notification, viewing it, and marking it as read by interacting with it.

**Prerequisite:** This test is best performed after Step 24 is complete. In Step 24, you will have `student1` mention `student2`. Once that's done, you can proceed with this test.

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as **`student2@university.edu`** (the user who was mentioned). | In the header, the notification bell icon has a **red badge** with the number "1". |
| 2 | Click the notification bell icon. | A dropdown panel appears, listing the notification from "Student 1". |
| 3 | Click on the notification text in the dropdown. | You are navigated to the correct project page, and the comment where you were mentioned should be visible. |
| 4 | After the page loads, look back at the notification bell icon. | The red badge is **gone**. Clicking the bell again shows the notification as read (e.g., grayed out). |

\<br\>

-----

### \#\#\# Step 22: Project Workspace & Learning Goal Editor

**Objective:** Ensure the student project workspace loads and the Learning Goal Editor functions correctly.

**🔴 Important Prerequisite:** The seed script creates all projects in the `'research'` phase. To test the Learning Goal editor, you must first manually change a project's phase to `'pre'`.

  * **Action:** Go to your Supabase Studio -\> SQL Editor and run this command:
    ```sql
    UPDATE public.projects 
    SET phase = 'pre' 
    WHERE id = '00000000-0000-0000-0000-000000000500'; -- Team Alpha's "Outbreak Simulator" project
    ```

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as **`student1@university.edu`**. From the dashboard, click on the **"Outbreak Simulator"** project. | The project page `/p/[projectId]` loads, displaying the detailed problem description from your PRD. |
| 2 | Locate the **"Learning Goals"** section. | Because the phase is now `'pre'`, the `<LearningGoalEditor />` component is visible. |
| 3 | Click the **"AI Suggestions"** button. | A loading indicator appears, followed by 3-5 relevant learning goals based on the Epidemiology problem. |
| 4 | Type a goal into the main text area, e.g., `Understand the SIR model.`. | The text area works as expected. |
| 5 | Click **"Save Goals"**. | A confirmation message (e.g., a toast notification) appears. |
| 6 | **Hard refresh** the browser page. | After reloading, the goal you typed is still in the editor, confirming it was saved. |

\<br\>

-----

### \#\#\# Step 23: AI Tutor with Shared History

**Objective:** Verify that the AI Tutor chat is a shared, persistent resource for all team members within a specific project.

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as **`student1@university.edu`**. Navigate to the **"EcoBalance"** project page. | The project page loads. |
| 2 | Find the **AI Tutor** chat. Ask a question relevant to the problem, e.g., `"Explain the Lotka-Volterra equations"`. | Your question and the AI's response appear in the chat window. |
| 3 | Log out. Now, log in as **`student2@university.edu`** (the other member of Team Alpha). | |
| 4 | Navigate to the **same "EcoBalance"** project page. | The project page loads. |
| 5 | Find the **AI Tutor** chat component. | The chat window displays the **entire conversation**, including the question and answer from Student 1's session, confirming the shared history. |

\<br\>

-----

### \#\#\# Step 24: Artifacts and Comments with @Mentions

**Objective:** Test the artifact uploader and ensure the commenting system allows for user-selection @mentions that trigger notifications.

| \# | User Action | ✅ Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as **`student1@university.edu`** and navigate to the **"Outbreak Simulator"** project. | The project workspace is displayed. |
| 2 | Use the **`<ArtifactUploader />`** to upload a file (e.g., a `.png` chart or a `.txt` note). | The file uploads successfully, and a new "artifact card" appears in the UI. |
| 3 | On the new artifact card, find the comment input field. | A text area for writing comments is visible. |
| 4 | Click the **@mention button** or type "@". | A dropdown list appears, showing "Student 2" and "Educator 1" (and other educators). Your own name, "Student 1", is not in the list. |
| 5 | Select **"Student 2"** from the list, write a message like `"@Student 2, what do you think of this data?"`, and post the comment. | The comment appears under the artifact with the mentioned user's name highlighted. |
| 6 | *(Verification)* Log in as **`student2@university.edu`**. | As per Step 21, the notification indicator in the header now shows a badge. |