## DESCRIPTION

Welcome to the PBLab Challenge! Your mission is to build a lightweight, AI-augmented Learning Management System (LMS) designed for **Problem-Based Learning (PBL)**. This project replaces a typical CRUD app with something more mission-driven and modern, focusing on helping student teams collaborate and allowing educators to facilitate their progress.

You will be building a multi-user, full-stack application with a rich relational data model, role-based access, and meaningful AI integrations. Think of it as a tool you would have loved to use in university.

This challenge is part of the Videcoding Sidequest.

PRDs and Guides: [https://github.com/NiLaScience/Vibecoding-Sidequest-Starterpack](https://github.com/NiLaScience/Vibecoding-Sidequest-Starterpack) Discord: [https://discord.gg/4ymrJF7z](https://discord.gg/4ymrJF7z)

## COMPETITION TERMS

### **Competition Guidelines**

## Core Requirements (MVP)

To qualify for the final evaluation, your submission **must** implement all the following MVP features as defined in the PRD:

- **[ ] User & Team Management:** Full CRUD for users (Students, Educators, Admins) and teams.
    
- **[ ] Problem Lifecycle:** A state machine (Pre-discussion → Research → Post-discussion → Closed) must manage the project's progress.
    
- **[ ] Learning Goal Editor with AI:** A simple editor for students to define learning goals, enhanced with an "AI Suggestion" button that calls an external LLM.
    
- **[ ] Artifacts & Comments:** Users must be able to upload or link to artifacts (e.g., Google Docs, code repos) and discuss them in comment threads with mentions.
    
- **[ ] Educator Dashboard:** A dashboard (table or Kanban view) for educators to monitor the progress of all teams.
    
- **[ ] Feedback System:** Educators must be able to leave rubric-based feedback (e.g., a 1-5 rating per criterion) on a final report, which locks the project from further edits.
    

Submissions that do not meet these core requirements will be disqualified.

## How to Win: Go Beyond the MVP

Meeting the MVP requirements gets you into the Arena, but creativity and polish will make you a winner. We're looking for submissions that impress us. Here are some ideas for plus points:

- **Superior UX/UI:** Is your application a joy to use? Is the design clean, intuitive, and responsive?
    
- **Innovative Features:** Did you implement any "stretch goals" from the PRD, like real-time presence indicators or a particularly clever AI Coach feature?
    
- **Technical Excellence:** Is your code clean, well-documented, and efficient?
    

Show us something special in your demo video!

## Deliverables

Your final submission must include three items:

1. **Live Application URL:** A publicly accessible, deployed version of your application (e.g., on Vercel).
    
2. **GitHub Repository URL:** A link to a public GitHub repository containing your complete source code.
    
3. **90-Second Demo Video:** A concise video that:
    
    - Presents the core user journey for a student team.
        
    - Highlights the most impressive feature you built.
        
    - Briefly explains the technical stack you used.
        
4. **Learning in Public Post:** A link to a public post on a platform like Twitter/X or LinkedIn, where you present your final product and reflect on your journey.
    

## Evaluation Process

This challenge uses a two-phase hybrid evaluation model:

1. **Phase 1: Technical Qualification:** Our team will manually review each submission to ensure it meets all **Core MVP Requirements** and passes the key acceptance criteria from the PRD.
    
2. **Phase 2: The Arena:** The **demo videos** of all qualified submissions will enter the Sidequests Arena. Here, the community will vote in head-to-head matchups to determine the best project based on innovation, user experience, and overall presentation. The submission with the highest ELO score at the end of the voting period wins.
    

## Technical Stack

- **Framework:** Next.js (App Router)
    
- **Database:** Supabase (Postgres)
    
- **Authentication:** Supabase Auth (Email-Link or OAuth)
    
- **AI Integration:** API of your choice
    
- **Hosting:** Vercel & Supabase Cloud