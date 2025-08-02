# PBLab - AI-Augmented Problem-Based Learning Platform

An MVP Learning Management System designed for Problem-Based Learning (PBL) that helps student teams collaborate on complex problems while providing educators with tools to facilitate, monitor, and assess their progress.

## Live Demo

- **Live Application:** https://pblab-rouge.vercel.app/
- **GitHub Repository:** https://github.com/andres-monge/pblab

## <� Project Overview

PBLab replaces traditional static assignments with a structured PBL workflow:

1. **Pre-discussion** � Problem statement & AI-assisted learning goals
2. **Self-directed research** � Artifact creation & team collaboration  
3. **Post-discussion** � Final report submission & rubric-based assessment

The platform integrates AI as a first-class citizen through contextual tutoring, learning goal suggestions, and automated assessment assistance, promoting responsible AI use in education.

## Technical Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth (Magic Links + Password)
- **AI Integration:** Google Gemini API
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS
- **Testing:** Jest (Unit) + Playwright (E2E)
- **Hosting:** Vercel + Supabase Cloud

## A Note on Authentication:

To provide the most seamless and comprehensive evaluation experience, this project uses a tailored authentication strategy designed specifically for the competition's requirements. The goal is to give you, the judges, immediate access to the application's pre-populated features without the friction of typical new-user-only authentication flows.

**Password-Based Access to Pre-Seeded Accounts:**

* **The Challenge:** Standard authentication flows are designed for new individuals signing up with their own personal accounts. This creates a fundamental problem for evaluating a pre-populated, role-based application. If you were to use these methods, you would:
    1.  Log in with your own personal email address.
    2.  The application would create a **brand-new, empty account** for you.
    3.  You would land on an empty dashboard, completely isolated from the pre-built examples, teams, and user roles.

    Crucially, you would be **unable to see the required project examples or test any of the specific Admin, Educator, or Student features** using your own Google account.

* **Solution:** I have implemented a direct **email and password** login system for all pre-seeded users. This is the only method that allows any evaluator to instantly step into the shoes of a pre-created, role-specific user and see the application in its fully-featured, data-rich state.

* **Why This is Better for Evaluation:** This method gives you immediate access to the fully populated dashboards, the two pre-built project examples ("Outbreak Simulator" and "EcoBalance"), and the various user-specific views. It ensures you can begin testing the application's core features in seconds, fulfilling the **"Live Application URL"** requirement with a functional, data-rich environment.

## Test Accounts

The application includes pre-seeded test accounts for evaluation purposes. All accounts use the password `password123`.

### Admin Account
- **Email:** `admin@university.edu`
- **Password:** `password123`
- **Role:** Full system administration capabilities

### Educator Accounts
- **Email:** `educator1@university.edu` / `educator2@university.edu`
- **Password:** `password123`
- **Role:** Create problems, manage teams, provide assessments

### Student Accounts
- **Email:** `student1@university.edu` through `student4@university.edu`
- **Password:** `password123`
- **Role:** Join teams, collaborate on projects, submit artifacts

In order to test the different phases of the prepopulated examples:

Team Alpha (students 1 & 2):
  - Outbreak Simulator: pre phase
  - EcoBalance: research phase

  Team Beta (students 3 & 4):
  - Outbreak Simulator: research phase
  - EcoBalance: pre phase

> **Authentication Strategy:** The platform supports both magic link authentication for production use and password authentication for testing/demo purposes. Magic links provide a seamless user experience while passwords enable rapid testing and evaluation.

## Testing the Student Invite Feature

To test the complete student invite workflow:

1. **Login as Admin** (`admin@university.edu`)
2. **Navigate to Admin Dashboard** - View system overview
3. **Click "Invite Users"** - Access the user invitation system
4. **Generate Invite Link** - Create a JWT-based invite token
5. **Open Invite Link** - New user can create account and automatically join assigned team
6. **Verify Team Assignment** - Check that user appears in team roster

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[username]/pblab.git
   cd pblab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Add your Supabase credentials and Google Gemini API key
   ```

4. **Database setup**
   ```bash
   # Run migrations (via Supabase CLI or Dashboard)
   # Seed with sample data
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Login with any test account listed above

## Core Features

### MVP Requirements Met

- **User & Team Management:** Complete CRUD operations with role-based access (Student, Educator, Admin)
- **Problem Lifecycle:** State machine implementation (Pre � Research � Post � Closed)
- **Learning Goal Editor with AI:** Smart suggestions powered by Google Gemini API
- **Artifacts & Comments:** File uploads, external links, @mention system with notifications
- **Educator Dashboard:** Real-time monitoring of team progress and project phases
- **Feedback System:** Rubric-based assessment with project locking mechanism

### Key User Flows

**For Students:**
- Join via secure invite links
- Collaborate on learning goals with AI assistance
- Upload artifacts and engage in threaded discussions
- Submit final reports through Google Docs integration

**For Educators:**
- Create PBL problems with custom rubrics
- Monitor team progress through comprehensive dashboards
- Provide structured feedback and lock completed projects

**For Admins:**
- Manage users, courses, and system configuration
- Generate secure invite tokens for new users
- Access system-wide analytics and usage metrics

## Testing

Run the comprehensive test suite:

```bash
# Unit tests
npm run test:unit

# End-to-end tests  
npm run test:e2e

# All tests
npm run test:all

# Setup test data
npm run test:setup
```

Key test coverage includes:
- **T-01:** Complete student invite flow (E2E)
- **T-02:** AI helper API with usage logging (Unit)
- **T-03:** File upload security validation (Unit)
- **T-04:** Educator assessment and project locking (E2E)

## Architecture Highlights

### Database Design
- **13 tables** with comprehensive relationships
- **Row Level Security (RLS)** for data isolation
- **3 custom ENUMs** for type safety
- **Transactional operations** for data consistency

### AI Integration
- **Contextual AI Tutor** with conversation memory
- **Learning goal suggestions** with domain expertise
- **Usage tracking** for transparency and analytics
- **Responsible AI patterns** throughout the application

### Security Features
- **JWT-based invite system** with expiration
- **File type validation** preventing malicious uploads
- **Authentication verification** on all server actions
- **Role-based authorization** with RLS enforcement

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbo
npm run build           # Production build
npm run lint            # Code linting

# Database
npm run types:gen       # Generate TypeScript types from Supabase
npm run db:seed         # Populate database with sample data

# Testing  
npm run test           # Run Jest unit tests
npm run test:e2e       # Run Playwright E2E tests
```


## <� Competition Submission

This project was built for the Vibecoding Sidequest PBLab Challenge, demonstrating:
- **Complete MVP implementation** meeting all core requirements
- **Superior UX/UI** with intuitive, responsive design
- **Technical excellence** with clean, well-documented code
- **Innovative AI integration** promoting responsible usage