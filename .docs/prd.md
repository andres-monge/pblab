# 02_PBLab – Problem-Based Learning LMS  
_Product-Requirements Document (PRD)_

## 1. Vision & Overview
PBLab is a lightweight, AI-augmented Learning-Management System that helps **students work in small teams on problem-based learning (PBL) projects** and lets **educators facilitate, observe, and assess** their progress.  
Instead of static assignments, PBLab structures work into the classic PBL cycle:

1. Pre-discussion → Problem statement & learning goals  
2. Self-directed research & artifact creation  
3. Post-discussion → Findings, reflection & report  

PBLab stores all metadata, workflow states and comments in a relational database (Supabase/Postgres) while **leveraging Google Docs/Slides/Sheets links for rich artifacts**. LLM tools are embedded as first-class citizens (e.g. "deep research", "PBL tutor") to encourage *responsible* AI use.

It is highly recommeneded to conduct some research on the PBL process and how it can be best supported by software. You want to make something users would actually want to use and that provides value to them. We have included many suggestions, but doing this work is part of your development into an AI-first developer.

---

## 2. Personas
| Persona | Goals | Pain Points |
|---------|-------|-------------|
| **Student** | Understand the problem, split tasks, document findings, create cool deliverables | Disjoint tools, unclear expectations, fear of "AI = cheating" |
| **Educator / Facilitator** | Monitor teams, give feedback, grade fairly, promote critical thinking | No visibility into team process, enforce PBL process, grading workload |
| **Course Admin** | Manage problems, cohorts, permissions | Manual setup each term |

---

## 3. User Stories (Happy-Path)
### 3.1 Students
1. _As a student_ I can **join a team** via invite link so that I can collaborate on a PBL problem.  
2. I can **read the official problem description** and **propose a problem statement** with learning goals (Markdown or Google Doc link).  
3. I can **upload or link artifacts** (images, videos, docs, code repos) under a research phase.  
4. I can **tag teammates on comments** to discuss artifacts asynchronously.  
5. I can **use the "AI PBL tutor"** to brainstorm learning goals or get critique on my reflection, with usage logged for transparency.  
6. I can **submit the final report link** and mark the project "Ready for review".

### 3.2 Educators
1. _As an educator_ I can **create a new PBL problem**, defining title, description, and rubric.  
2. I can **view dashboards** of teams, their current phase, and pending questions.  
3. _As an educator_, I can **trigger an AI-powered rubric assessment** on the final report, **review and edit** the AI-generated scores, or **provide feedback to the AI to regenerate the assessment**, and then lock the project.

### 3.3 Course Admin
1. _As an admin_ I can **add/remove users, create cohorts**, and assign educators to problems.

---

## 4. Key Features & MVP Cut-Lines
| Feature                                                   | MVP?        | Notes                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team & Role management                                    | ✅           | Students, Educators, Admins                                                                                                                                                                                                                          |
| Problem lifecycle states (Pre / Research / Post / Closed) | ✅           | State machine in DB                                                                                                                                                                                                                                  |
| AI PBL tutor with contextual memory                       | ✅           | Maintains conversation history per project to provide relevant, ongoing guidance. Calls Gemini / Gemini function.                                                                                                                                    |
| Artifact upload & metadata                                | ✅           | File to Supabase Storage OR external URL                                                                                                                                                                                                             |
| Comment threads & mentions                                | ✅           | Simple per-artifact thread                                                                                                                                                                                                                           |
| Google Docs/Slides/Sheets link handling                   | ✅           | Detect & embed previews                                                                                                                                                                                                                              |
| Dashboard for educators                                   | ✅           | Table / Kanban view                                                                                                                                                                                                                                  |
| AI-assisted feedback & rubric                             | ✅           | AI generates initial 1-5 rating + comment per criterion. Educator can directly edit, approve, or **provide feedback (e.g., "focus more on X") to the AI for regeneration** before approving. Interface designed for this rapid review-feedback loop. |


---

## 5. Technical Decisions
| Area | Decision | Rationale |
|------|----------|-----------|
| **Stack** | Next.js (App Router) scaffolded by **V0** → edited in **Cursor** | Consistent with course workflow |
| **DB** | **Supabase Postgres** with Prisma (optional) | SQL clarity; built-in auth & storage |
| **Local Dev** | Supabase in **Docker Compose**; `npm run dev` for Next.js | One-command setup |
| **Auth** | Supabase email-link auth; RBAC via RLS policies | Fast, secure |
| **Hosting** | Vercel (app) + Supabase cloud |Minimal infrastructure complexity |
| **AI** | Gemini functions via serverless route `/api/ai/*`; usage logged in `ai_usage` table. Conversation history linked to projects for context. | Simple, auditable, contextual |
| **Integrations** | Google OAuth scopes limited to Drive read-only for file metadata | Avoids storing large files |

---

## 6. Data Model (simplified)
```mermaid
erDiagram
  users ||--o{ teams_users : membership
  teams ||--o{ projects : has
  projects ||--o{ learning_goals : contains
  projects ||--o{ artifacts : upload
  projects ||--o{ reports : write
  artifacts ||--o{ comments : discuss
  projects ||--o{ ai_usage : logs

  users {
    uuid id PK
    text name
    text email
    text role -- 'student' | 'educator' | 'admin'
  }

  teams {
    uuid id PK
    text name
    uuid course_id
  }

  projects {
    uuid id PK
    uuid team_id FK
    text title
    text subject_area
    text phase -- 'pre'|'research'|'post'|'closed'
    timestamptz created_at
  }

  learning_goals {
    uuid id PK
    uuid project_id FK
    text description
    uuid assigned_user
  }

  artifacts {
    uuid id PK
    uuid project_id FK
    text title
    text type -- 'doc'|'image'|'video'|'link'
    text url
    uuid uploaded_by
  }

  reports {
    uuid id PK
    uuid project_id FK
    uuid author_id
    text doc_url
    text summary
  }

  comments {
    uuid id PK
    uuid artifact_id FK
    uuid author_id
    text body
    timestamptz created_at
  }

  ai_usage {
    uuid id PK
    uuid project_id FK
    uuid user_id FK
    json prompt
    json response
    timestamptz created_at
  }
```

---

## 7. Built-In AI-First Example Problems. 

Pre-populated your app with two example problems. If you want to impress the reviewers, think about how you can improve the app to fascilitate students to get the most out of the PBL process. It's not about making everything easier for the students, but increasing motivation to engage in the PBL process and making them creators of their own learning instead of just consumers.

### 7.1 "Outbreak Simulator" (Epidemiology)
| Item | Description |
|------|-------------|
| **Problem Desc.** | A mysterious pathogen emerges in a city. Model its spread and propose containment strategies. |
| **Deliverable** | A playable web simulation (SIR model) + report comparing R₀ under interventions. |
| **Learning Goals** (sample) | • Understand SIR equations • Implement basic differential equations in JS • Interpret R₀ • Evaluate vaccination vs. quarantine |
| **Artifacts** | Google Sheet with data, code repo link, demo GIF |
| **AI Coach Prompts** | "Suggest parameter ranges for an airborne virus", "Explain R₀ to a 12-year-old" |

### 7.2 "EcoBalance" (Predator-Prey Ecology)
| Item | Description |
|------|-------------|
| **Problem Desc.** | Design a simple ecosystem where predators and prey reach dynamic equilibrium. Adjust variables to prevent extinction. |
| **Deliverable** | Interactive Lotka-Volterra simulation + reflective essay on sustainability parallels. |
| **Learning Goals** | • Implement predator-prey equations • Visualize populations over time • Identify tipping points |
| **Artifacts** | Time-series charts, short explainer video, code link |
| **AI Coach Prompts** | "Derive Lotka-Volterra from first principles", "Suggest UX to show population collapse" |

---

## 8. Tests-to-Pass (Sample Acceptance Criteria)
| ID | Test | How to Verify |
|----|------|---------------|
| **T-01** | Student can create team via UI and invite peer via email. | E2E test: create → invite → peer accepts → team appears in dashboard. |
| **T-02** | PBL AI helper returns feedback but doesn't do the work for the student; logs usage. | Jest unit: mock Gemini → assert DB `ai_usage` row. |
| **T-03** | Artifact upload enforces file-type whitelist. | API test: upload `.exe` → 400 error. |
| **T-04** | Educator feedback locks project editing. | E2E: add feedback → check inputs disabled. |

---

## 9. Quick-Start Guide
1. Create UI scaffold and API routes for the MVP in v0
2. Clone repo, open in **Cursor** → run `npm install, npm run dev`
3. `docker compose up supabase` for local DB
4. Copy `.env.example` → `.env.local`, add Supabase keys & Gemini key. 
5. Push to GitHub → Vercel import → environment variables → **Deploy**
6. Create and run seed script `npm db:seed` to create sample problems & users  

---

## 10. Focused Learning Goals
This project will give you hands-on experience with the following core concepts. Check them off in `goals/learning_goals.md` as you master them.

### Chapter 2: Development Workflow, Tooling & QA
- [[learning_notes/What is version control.md|What is version control?]]
- [[learning_notes/What are package managers.md|What are package managers?]]
- [[learning_notes/What is linting.md|What is linting?]]
- [[learning_notes/What is a template boilerplate.md|What is a template / boilerplate?]]
- [[learning_notes/What are environment variables.md|What are environment variables?]]
- [[learning_notes/What is a test.md|What is a test?]]

### Chapter 3: Foundational Concepts & Core Technologies
- [[learning_notes/What is a route.md|What is a route?]]
- [[learning_notes/What is an API.md|What is an API?]]
- [[learning_notes/What is CRUD.md|What is CRUD?]]
- [[learning_notes/What is JSON.md|What is JSON?]]
- [[learning_notes/What is state management.md|What is state management?]]

### Chapter 4: Full-Stack Frameworks
- [[learning_notes/What is Next.js.md|What is Next.js?]]

### Chapter 5: Front-End Development
- [[learning_notes/What is React.md|What is React?]]
- [[learning_notes/What is a component.md|What is a component?]]
- [[learning_notes/What is Tailwind CSS.md|What is Tailwind CSS?]]
- [[learning_notes/What are forms.md|What are forms?]]
- [[learning_notes/What is form validation.md|What is form validation?]]

### Chapter 6: Back-End Development
- [[learning_notes/What is Node.js.md|What is Node.js?]]
- [[learning_notes/What is REST.md|What is REST?]]
- [[learning_notes/What are webhooks.md|What are webhooks?]]
- [[learning_notes/What is file upload.md|What is file upload?]]
- [[learning_notes/What are signed URLs.md|What are signed URLs?]]

### Chapter 7: Data Storage & Management
- [[learning_notes/What is a database.md|What is a database?]]
- [[learning_notes/What is SQL.md|What is SQL?]]
- [[learning_notes/What is a schema.md|What is a schema?]]
- [[learning_notes/What are database relationships.md|What are database relationships?]]
- [[learning_notes/What is Postgres.md|What is Postgres?]]
- [[learning_notes/What is an ORM.md|What is an ORM?]]
- [[learning_notes/What is a database migration.md|What is a database migration?]]

### Chapter 8: Authentication & Security
- [[learning_notes/What is Auth.md|What is Auth?]]
- [[learning_notes/What is OAuth.md|What is OAuth?]]
- [[learning_notes/What is JWT.md|What is JWT?]]
- [[learning_notes/What is role-based access control (RBAC).md|What is role-based access control (RBAC)?]]

### Chapter 9: Infrastructure & Deployment
- [[learning_notes/What is hosting.md|What is hosting?]]
- [[learning_notes/What is a container.md|What is a container?]]
- [[learning_notes/What is Docker.md|What is Docker?]]
- [[learning_notes/What is serverless.md|What is serverless?]]
- [[learning_notes/What is CI CD.md|What is CI/CD?]]
- [[learning_notes/What is caching.md|What is caching?]]
- [[learning_notes/What is monitoring (stretch).md|What is monitoring? (stretch)]]
- [[learning_notes/What is tracing (stretch).md|What is tracing? (stretch)]]

### Chapter 10: Third-Party Integrations & Services
- [[learning_notes/What are third-party services.md|What are third-party services?]]
- [[learning_notes/What is an API integration.md|What is an API integration?]]

### Chapter 11: Specialized Development & AI
- [[learning_notes/What is a GenAI API.md|What is a GenAI API?]]
- [[learning_notes/What is prompt engineering.md|What is prompt engineering?]]
- [[learning_notes/What is an AI agent.md|What is an AI agent?]]

---

## 11. Guiding Principles & Design Decisions

This section captures the core philosophy behind PBLab's design.

1. **AI Tutor as a Socratic Guide:** The AI tutor's primary goal is to foster inquiry, not to provide answers. It should use a first-principles approach to help students break down problems, prompting them to separate knowns from unknowns. It will guide, critique, and suggest research paths, but never solve the problem for the student.
    
2. **Context Management:** The AI Tutor must solve for "anterograde amnesia" by maintaining relevant context. It will have access to the conversation history within a specific project to provide continuous, intelligent guidance that remembers what has already been discussed.
    
3. **AI-Assisted Assessment (Generation + Verification + Refinement):** For rubric scoring, we will use an interactive loop where the AI handles the heavy lifting and educators provide expert oversight.

- **Generation:** The AI generates an initial score and qualitative feedback based on the rubric and the student's submitted report.
    
- **Verification & Refinement:** The educator reviews the AI's output in a clean, intuitive interface. They have three options:
    
    1. **Approve:** Accept the AI's assessment as-is.
        
    2. **Edit:** Manually change the scores or comments.
        
    3. **Regenerate:** Provide natural language feedback to the AI (e.g., "Change this score to a 4, focus more on their use of data visualization, and use a more encouraging tone"). The AI then incorporates this feedback and generates a new assessment for review. This iterative loop continues until the educator finalizes the grade.
        
4. **Granular AI Auditing:** All AI interactions (prompts and responses) must be logged with user and project IDs to ensure transparency and uphold academic integrity.

---

### 🔑  PBLab delivers a purpose-driven CRUD experience with rich relational data, role-based access, and ethical AI integration—perfectly aligned with the course's AI-first philosophy.
