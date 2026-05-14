# Tasks

- [x] Task 1: Backend Authentication & User Management
  - [x] SubTask 1.1: Implement JWT-based authentication endpoints (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/me`)
  - [x] SubTask 1.2: Implement middleware for role-based access control (MEMBER, ADMIN)
  - [x] SubTask 1.3: Create an initial admin user via a setup script or Prisma seed

- [x] Task 2: Backend Core Entities APIs
  - [x] SubTask 2.1: Implement Members and Families APIs (`/families`, `/members`, `/members/:id`)
  - [x] SubTask 2.2: Implement Matches APIs (`/matches`, `/matches/:id`)
  - [x] SubTask 2.3: Implement Works APIs (`/works`, `/works/:id`)
  - [x] SubTask 2.4: Implement Annual Aggregation API (`/years/:year`)

- [x] Task 3: Backend Media & Storage APIs
  - [x] SubTask 3.1: Set up local disk storage logic for uploads (hashing, directories)
  - [x] SubTask 3.2: Implement Media upload API with metadata (`/media`)
  - [x] SubTask 3.3: Implement Media retrieval and file serving APIs (`/media/:id`, `/media/:id/file`)

- [x] Task 4: Backend Knowledge Base & Qwen Integration
  - [x] SubTask 4.1: Implement Knowledge Base APIs (`/knowledge`)
  - [x] SubTask 4.2: Integrate Qwen API client
  - [x] SubTask 4.3: Implement Annual Planner Skill API with RAG logic (`/planner/annual`)

- [x] Task 5: Frontend Base Components & Services
  - [x] SubTask 5.1: Implement base UI components (Button, Card, Dropdown, Tabs, SearchInput, EmptyState) adhering to the Claude design system
  - [x] SubTask 5.2: Set up Axios/fetch interceptors for API requests and token management
  - [x] SubTask 5.3: Create API service modules for frontend state management (Pinia)

- [x] Task 6: Frontend Core Pages Implementation
  - [x] SubTask 6.1: Implement Login page and Auth flow
  - [x] SubTask 6.2: Implement Home page and Navigation
  - [x] SubTask 6.3: Implement History and Year pages with Timeline component
  - [x] SubTask 6.4: Implement Media page with grid view and filtering

- [x] Task 7: Frontend Content & Planner Pages Implementation
  - [x] SubTask 7.1: Implement Works (Articles/Poems) page with search and tabs
  - [x] SubTask 7.2: Implement People page (Family/Red/Blue dropdowns) and Person detail page
  - [x] SubTask 7.3: Implement Upload Data page for members/media/works/matches
  - [x] SubTask 7.4: Implement Annual Planner page integrating the Qwen Skill

- [x] Task 8: Final Review & PWA Verification
  - [x] SubTask 8.1: Verify PWA offline caching (App Shell) and manifest installation
  - [x] SubTask 8.2: Ensure all pages have empty states and proper error handling
  - [x] SubTask 8.3: Run build and fix any TypeScript or ESLint errors

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 1 (for API contracts)
- Task 6 depends on Task 2, Task 3, Task 5
- Task 7 depends on Task 2, Task 4, Task 5
- Task 8 depends on Task 6, Task 7
