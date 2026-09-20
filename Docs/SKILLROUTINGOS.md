# SKILL ROUTING OS

## 1. Purpose

This document defines the mandatory skill-selection and skill-usage system for the AI Agent.

Its purpose is to prevent the Agent from:

- ignoring available skills
    
- solving tasks from memory when a relevant skill exists
    
- mentioning skills without actually reading them
    
- using the wrong skill for a task
    
- loading every skill unnecessarily
    
- performing planning, review, security, UI, testing, architecture, or debugging work without checking the relevant skills first
    

This document is a **Skill Routing Operating System**.

It applies to every task performed by the Agent.

---

# 2. Mandatory Rule

## If a relevant skill exists, USE IT.

Before performing any non-trivial task, the Agent MUST determine whether one or more installed skills are relevant.

This is mandatory for tasks involving:

- Planning
    
- Requirements analysis
    
- PRDs
    
- Specifications
    
- Architecture
    
- Domain modeling
    
- Database design
    
- API design
    
- Frontend development
    
- UI/UX
    
- Design systems
    
- Accessibility
    
- Security
    
- Authentication
    
- Authorization
    
- Testing
    
- Debugging
    
- Code review
    
- Performance
    
- SEO
    
- Documentation
    
- Refactoring
    
- Agent security
    
- Prompt injection
    
- Browser testing
    
- E2E testing
    
- Deployment architecture
    
- Any other domain for which an installed skill exists
    

The Agent MUST NOT skip skill routing merely because it believes it already knows how to perform the task.

---

# 3. Skill Inventory

At the beginning of a project, or whenever the available skills may have changed:

1. Discover the currently installed skills.
    
2. Read their names and descriptions.
    
3. Build an internal understanding of what each skill does.
    
4. Group skills by capability.
    
5. Use the actual installed skill names.
    
6. Never invent skill names.
    
7. Never claim a skill was used unless it was actually loaded/read.
    

The Agent should treat the installed skill collection as the project's available engineering knowledge base.

---

# 4. Skill Categories

Every installed skill should be mentally classified into one or more of these categories.

## A. Planning & Requirements

Purpose:

Turn business requirements into structured implementation plans.

Typical responsibilities:

- requirements analysis
    
- PRD creation
    
- feature decomposition
    
- implementation planning
    
- task breakdown
    
- acceptance criteria
    
- scope definition
    
- dependency analysis
    
- identifying ambiguities
    
- identifying missing requirements
    

Typical skills may include:

- `prd`
    
- `writing-plans`
    
- `to-spec`
    
- `to-tickets`
    
- `wayfinder`
    

Use these when the user asks to:

- plan a project
    
- plan a phase
    
- create a specification
    
- break requirements into tasks
    
- prepare implementation instructions
    
- analyze a brief
    
- define acceptance criteria
    

---

# 5. Architecture & System Design

Purpose:

Design or evaluate the technical structure of the application.

Responsibilities:

- architecture
    
- module boundaries
    
- domain boundaries
    
- data flow
    
- dependencies
    
- scalability
    
- maintainability
    
- separation of concerns
    
- identifying architectural problems
    

Typical skills may include:

- `codebase-design`
    
- `domain-modeling`
    
- `improve-codebase-architecture`
    

Use architecture skills when the user asks:

- "Design the architecture"
    
- "How should this feature be structured?"
    
- "Review the architecture"
    
- "Is this architecture good?"
    
- "How should modules communicate?"
    
- "How should we model this domain?"
    
- "Refactor the architecture"
    

Never perform a substantial architecture decision without first checking the relevant architecture skills.

---

# 6. Database & Data Modeling

Purpose:

Design, review, optimize, and safely modify database structures.

For this project stack, PostgreSQL and Prisma are primary.

Responsibilities:

- schema design
    
- relations
    
- constraints
    
- indexes
    
- migrations
    
- query design
    
- Prisma usage
    
- data integrity
    
- transaction boundaries
    
- database performance
    

Relevant installed skills may include:

- `postgres`
    
- `prisma-client-api`
    
- `prisma-database-setup`
    
- `domain-modeling`
    

Use these when:

- creating database models
    
- modifying Prisma schema
    
- designing relations
    
- reviewing database structure
    
- optimizing queries
    
- planning migrations
    
- debugging database behavior
    

---

# 7. Frontend & Vue/Nuxt

Purpose:

Build and review frontend functionality using the project's frontend stack.

Primary stack:

- Vue
    
- Nuxt 3
    
- Nuxt Nitro
    
- Tailwind CSS
    
- shadcn-vue
    

Responsibilities:

- component architecture
    
- pages
    
- layouts
    
- composables
    
- state
    
- forms
    
- data fetching
    
- SSR/CSR behavior
    
- Nuxt conventions
    
- frontend performance
    

Use relevant Vue/Nuxt skills whenever the task involves frontend implementation or review.

---

# 8. UI/UX & Design

UI/UX work MUST use relevant design skills.

Never create a substantial interface purely from general model knowledge when relevant design skills are installed.

Typical relevant skills may include:

- `ui-ux-pro-max`
    
- `ui-styling`
    
- `shadcn`
    
- `design-taste-frontend`
    
- `web-design-guidelines`
    
- `review-animations`
    
- accessibility-related skills
    

Use them when the task involves:

- designing a page
    
- redesigning a page
    
- creating components
    
- improving visual hierarchy
    
- reviewing UI
    
- creating a design system
    
- responsive behavior
    
- accessibility
    
- animations
    
- interaction states
    
- converting Stitch designs into implementation
    

## Design Rule

If an approved Google Stitch design exists:

1. Read the relevant design documentation.
    
2. Load the relevant UI/design skills.
    
3. Treat Stitch as the visual source of truth.
    
4. Do not invent a different visual direction.
    
5. Use skills to determine how to implement the approved design correctly within Nuxt/Vue.
    

---

# 9. Security

Security-related work MUST use security skills.

Never perform security-sensitive work purely from general knowledge when an installed security skill exists.

Relevant skills may include:

- `agent-security-audit`
    
- `api-security-review`
    
- `auth-implementation-patterns`
    
- `security-best-practices`
    
- `security-threat-model`
    
- `prompt-injection-test`
    

Use security skills when the task involves:

- authentication
    
- authorization
    
- RBAC
    
- permissions
    
- sessions
    
- cookies
    
- passwords
    
- tokens
    
- API security
    
- file uploads
    
- secrets
    
- payment credentials
    
- encryption
    
- admin endpoints
    
- threat modeling
    
- security review
    
- security audit
    
- prompt injection
    
- agent security
    

## Security Review Rule

If the user asks:

> "Review this for security"

the Agent MUST:

1. Identify relevant security skills.
    
2. Load/read them.
    
3. Perform the review using their guidance.
    
4. Clearly distinguish verified findings from assumptions.
    
5. Never claim the system is secure merely because no obvious issue was found.
    

---

# 10. Authentication & Authorization

Authentication and authorization deserve explicit skill routing.

Use relevant skills for:

- login
    
- registration
    
- password hashing
    
- sessions
    
- cookies
    
- JWT
    
- RBAC
    
- permissions
    
- resource authorization
    
- admin access
    
- ownership checks
    

Relevant skills may include:

- `auth-implementation-patterns`
    
- `api-security-review`
    
- `security-best-practices`
    

Always perform server-side authorization analysis.

Never rely solely on frontend permission checks.

---

# 11. Testing

Testing MUST use relevant testing skills when testing is requested or required.

Relevant skills may include:

- `tdd`
    
- `test-driven-development`
    
- `playwright-best-practices`
    
- `webapp-testing`
    
- `vue-testing-best-practices`
    
- `verification-before-completion`
    

Use testing skills when:

- writing tests
    
- planning tests
    
- reviewing tests
    
- debugging test failures
    
- performing E2E testing
    
- browser testing
    
- deciding test coverage
    
- verifying completion
    

## Heavy Testing Rule

Heavy testing is still controlled by `AGENTS.md`.

The existence of testing skills does NOT authorize the Agent to automatically run:
- Playwright
    
- browser/MCP tests
    
- long E2E suites
    
- broad regression suites
    
- screenshot testing
    
- expensive test runs
    

The Agent may plan them, but execution requires the approval rules defined in `AGENTS.md`.

Strict approval (see `agent.md` Section 20) applies to ALL testing and
verification — not only heavy testing. DEFAULT: no test/verification execution
without explicit human approval. `start`, `continue`, `start next phase` and
similar phrases are NOT approval.
---

# 12. Debugging

Debugging MUST be systematic.

Relevant skills may include:

- `systematic-debugging`
    
- `diagnosing-bugs`
    
- testing skills
    
- framework-specific skills
    
- database skills
    
- security skills
    

When debugging:

1. Reproduce or understand the failure.
    
2. Identify the relevant domain.
    
3. Route to the appropriate skills.
    
4. Investigate the root cause.
    
5. Avoid speculative fixes.
    
6. Verify the fix.
    
7. Do not refactor unrelated code.
    

---

# 13. Code Review

When the user asks for:

- code review
    
- audit
    
- quality review
    
- architecture review
    
- security review
    
- PR review
    
- implementation review
    

the Agent MUST route to the relevant review skills first.

Relevant skills may include:

- `code-review`
    
- `requesting-code-review`
    
- `agent-security-audit`
    
- `api-security-review`
    
- architecture skills
    
- testing skills
    
- performance skills
    

A review must be evidence-based.

Do not merely summarize the code.

Identify:

- correctness problems
    
- security problems
    
- architectural problems
    
- maintainability problems
    
- performance problems
    
- testing gaps
    
- requirement violations
    

when relevant.

---

# 14. Performance

Use performance skills when the task involves:

- slow pages
    
- slow APIs
    
- database performance
    
- frontend performance
    
- bundle size
    
- rendering performance
    
- caching
    
- image optimization
    
- Core Web Vitals
    

Relevant skills may include:

- `web-perf`
    
- database performance skills
    
- framework performance skills
    

Do not optimize blindly.

Measure or inspect first where possible.

---

# 15. SEO & Web Discoverability

Use relevant SEO skills when available for:

- metadata
    
- sitemap
    
- structured data
    
- canonical URLs
    
- search indexing
    
- product SEO
    
- GEO/AI search discoverability
    

SEO should be treated as a feature requirement when the project requires it, not as decorative documentation.

---

# 16. Documentation

When asked to create technical documentation:

1. Check whether a documentation skill exists.
    
2. Load it.
    
3. Use the project's existing documentation conventions.
    
4. Do not create unnecessary documentation.
    

Documentation should reflect the actual implementation and source of truth.

---

# 17. Skill Combination

Many tasks require multiple skills.

Example:

### "Build a secure admin product management page"

Possible routing:

```text
Planning
+
Vue/Nuxt
+
UI/UX
+
shadcn
+
Database/Prisma
+
API
+
Security
+
Testing
```

Do not choose only one skill when the task clearly spans multiple domains.

---

# 18. Planning Tasks Require Planning Skills

If the user asks for:

- planning
    
- project plan
    
- phase plan
    
- implementation plan
    
- PRD
    
- specification
    
- technical design
    
- task breakdown
    
- acceptance criteria
    

the Agent MUST use the relevant planning skills.

It is NOT sufficient to say:

> "I understand the requirements."

The actual planning output must reflect the guidance from the relevant planning skills.

---

# 19. Review Tasks Require Review Skills

If the user asks:

- "Review this"
    
- "Audit this"
    
- "Check this"
    
- "Find problems"
    
- "Is this good?"
    
- "Analyze this implementation"
    

the Agent MUST first determine what kind of review it is.

Examples:

```text
UI review
→ UI/UX + design skills

Security review
→ security skills

Architecture review
→ architecture skills

Database review
→ PostgreSQL + Prisma + domain modeling

API review
→ API security + backend skills

Testing review
→ testing skills

General code review
→ code-review + relevant domain skills
```

---

# 20. Never Fake Skill Usage

This is a hard rule.

The Agent MUST NOT:

- list a skill without reading it
    
- claim a skill was used when it was not
    
- mention a skill only to satisfy documentation
    
- invent a skill
    
- pretend that general model knowledge is equivalent to using the installed skill
    

If a skill is reported as used, it must actually have been loaded/read.

---

# 21. Do Not Load Everything

Skill usage must be deliberate.

Do NOT load all installed skills for every task.

Instead:

```text
Task
 ↓
Identify domains
 ↓
Identify relevant skills
 ↓
Load relevant skills
 ↓
Perform work
 ↓
Verify against skill guidance
```

The goal is **maximum relevant skill usage**, not maximum skill count.

---

# 22. Skill Gap Detection

If the task clearly requires a capability but no installed skill covers it:

1. Detect the gap.
    
2. Do not invent a skill.
    
3. Use the closest valid available engineering knowledge.
    
4. Clearly note the skill gap when it materially affects the result.
    
5. If the gap requires a human decision, ask.
    

---

# 23. Phase-Aware Skill Routing

When working on a project phase:

1. Read the phase specification.
    
2. Identify all technical domains involved.
    
3. Route each domain to relevant skills.
    
4. Load the required skills.
    
5. Follow the phase's required skill mapping.
    
6. Do not load unrelated skills.
    

Example:

```text
Phase: Authentication + Admin

Planning:
- prd / writing-plans if planning is required

Architecture:
- codebase-design

Database:
- postgres
- prisma-client-api

Authentication:
- auth-implementation-patterns

Security:
- api-security-review
- security-best-practices
- security-threat-model

Frontend:
- Vue/Nuxt relevant skills
- shadcn
- ui-ux-pro-max

Testing:
- relevant testing skills
```

---

# 24. Mandatory Pre-Task Skill Check

Before beginning any substantial task, internally answer:

```text
1. What type of task is this?
2. Which technical domains are involved?
3. Which installed skills cover those domains?
4. Which skills must be loaded?
5. Is this planning, implementation, review, security, UI, testing, debugging, or a combination?
6. Are there any skill gaps?
```

Only then begin the task.

---

# 25. Skill Usage in Planning Documents

When a planning document requires skill mapping, record:

```text
Skill:
Purpose:
Why this phase needs it:
What the skill informed:
Coding Agent usage:
```

Do not list irrelevant skills.

---

# 26. Skill Usage in Coding Agent Work

When implementing a phase:

- Read `AGENTS.md`.
    
- Read the phase execution package.
    
- Apply `SKILL_ROUTING_OS.md`.
    
- Identify relevant skills.
    
- Load them.
    
- Implement only the approved scope.
    
- Perform static / code review only. Do NOT run any verification —
  request explicit human approval first (see `agent.md` Section 20).
    

---

# 27. Skill Usage in Security-Critical Work

For security-critical functionality, the Agent should use multiple relevant security skills where available rather than relying on a single skill.

For example:

```text
Authentication
→ auth-implementation-patterns
→ security-best-practices
→ api-security-review
```

For an agent-security concern:

```text
→ agent-security-audit
→ prompt-injection-test
```

Use only the skills actually relevant to the problem.

---

# 28. Skill Usage in UI-Critical Work

For significant UI work, evaluate:

```text
UI/UX
+
design system
+
component library
+
frontend implementation
+
accessibility
+
responsive design
+
performance
```

Use the relevant installed skills for the actual task.

Do not automatically load every design skill.

---

# 29. Final Skill Validation

Before completing a substantial task, verify:

- Did I identify the task domains?
    
- Did I check for relevant installed skills?
    
- Did I actually read/load the relevant skills?
    
- Did I use their guidance?
    
- Did I avoid irrelevant skills?
    
- Did I avoid claiming unused skills?
    
- Did I respect the project's phase and scope?
    
- Did I follow `AGENTS.md`?
    
- Did I preserve human approval requirements?
    

If the answer to any relevant question is "No", correct the process before declaring completion.

---

# 30. Core Principle

The Agent should not ask:

> "Do I know how to do this?"

The Agent should ask:

> "What is this task, which installed skills are authoritative for it, and have I actually used them?"

The required workflow is:

```text
Task
 ↓
Classify
 ↓
Route
 ↓
Load Skills
 ↓
Use Skills
 ↓
Perform Work
 ↓
Verify
 ↓
Complete
```

**Skills are not optional suggestions. They are part of the project's engineering operating system.**