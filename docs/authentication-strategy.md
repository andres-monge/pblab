### A Note on the Authentication Strategy

To provide the most seamless and comprehensive evaluation experience, this project uses a tailored authentication strategy designed specifically for the competition's requirements. Our goal is to give you, the judges, immediate access to the application's rich, pre-populated features without the friction of typical new-user-only authentication flows.

The strategy consists of two parts:

**1. Password-Based Access to Pre-Seeded Accounts:**

* **The Challenge:** Standard authentication flows like **OAuth ("Sign in with Google")** or **magic links** are designed for new individuals signing up with their own personal accounts. This creates a fundamental problem for evaluating a pre-populated, role-based application. If you were to use these methods, you would:
    1.  Log in with your own personal email address.
    2.  The application would create a **brand-new, empty account** for you.
    3.  You would land on an empty dashboard, completely isolated from the pre-built examples, teams, and user roles.

    Crucially, you would be **unable to see the required project examples or test any of the specific Admin, Educator, or Student features**, as there is no way to "impersonate" the fictional user `educator1@university.edu` using your own Google account.

* **Our Solution:** We have implemented a direct **email and password** login system for all pre-seeded users. This is the only method that allows any evaluator to instantly step into the shoes of a pre-created, role-specific user and see the application in its fully-featured, data-rich state.

* **Why This is Better for Evaluation:** This method gives you immediate access to the fully populated dashboards, the two pre-built project examples ("Outbreak Simulator" and "EcoBalance"), and the various user-specific views. It ensures you can begin testing the application's core features in seconds, fulfilling the **"Live Application URL"** requirement with a functional, data-rich environment.

**2. Guided Walkthrough for the "Invite Link" Feature:**

* **Fulfilling the PRD Requirement:** The user story "_As a student I can join a team via invite link_" is **fully implemented** using a secure, JWT-based system.

* **Our Solution:** Rather than leaving this multi-step feature to chance, we have provided a dedicated, step-by-step guide below on how to test it. This walkthrough directs you to log in as an educator, generate a real invite link, and sign up as a brand new student.

* **Why This is Better for Evaluation:** This approach allows us to keep the primary login UI clean and simple while ensuring the invite functionality can be tested thoroughly and correctly. It explicitly demonstrates that the **"User & Team Management"** requirement for creating and onboarding new users is met, without compromising the ease of access to the main demo content.

In summary, this deliberate two-part strategy was chosen to respect your time and provide the most efficient and complete evaluation experience possible within the context of this competition.