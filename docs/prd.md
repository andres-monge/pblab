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
| **Educator / Facilitator** | Monitor teams, give feedback, grade fairly, promote critical thinking | No visibility into team process, enforce PBL process |
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
3. I can **leave rubric-based feedback** on the final report and lock the project.

### 3.3 Course Admin
1. _As an admin_ I can **add/remove users, create cohorts**, and assign educators to problems.

---

## 4. Key Features & MVP Cut-Lines
| Feature                                                   | MVP?        | Notes                                    |
| --------------------------------------------------------- | ----------- | ---------------------------------------- |
| Team & Role management                                    | ✅           | Students, Educators, Admins              |
| Problem lifecycle states (Pre / Research / Post / Closed) | ✅           | State machine in DB                      |
| AI PBL tutor enforces PBL process                         | ✅           | Calls OpenAI / Gemini function           |
| Artifact upload & metadata                                | ✅           | File to Supabase Storage OR external URL |
| Comment threads & mentions                                | ✅           | Simple per-artifact thread               |
| Google Docs/Slides/Sheets link handling                   | ✅           | Detect & embed previews                  |
| Dashboard for educators                                   | ✅           | Table / Kanban view                      |
| Feedback & basic rubric                                   | ✅           | Per-criterion 1-5 rating + comment       |


---

## 5. Technical Decisions
| Area | Decision | Rationale |
|------|----------|-----------|
| **Stack** | Next.js (App Router) scaffolded by **V0** → edited in **Cursor** | Consistent with course workflow |
| **DB** | **Supabase Postgres** with Prisma (optional) | SQL clarity; built-in auth & storage |
| **Local Dev** | Supabase in **Docker Compose**; `npm run dev` for Next.js | One-command setup |
| **Auth** | Supabase email-link auth; RBAC via RLS policies | Fast, secure |
| **Hosting** | Vercel (app) + Supabase cloud |Minimal infrastructure complexity |
| **AI** | OpenAI functions via serverless route `/api/ai/*`; usage logged in `ai_usage` table | Simple, auditable |
| **Integrations** | Google OAuth scopes limited to Drive read-only for file metadata | Avoids storing large files |
