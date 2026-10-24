# AICTE CaseLens — Teammate Handoff

## 1. Project Overview

Project: **AICTE CaseLens — Institution-Centric Complaint Intelligence**

Problem Statement:

**SIH26264 — Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells**

The prototype is an AICTE internal complaint-management dashboard.

The main innovation is **cross-bureau case intelligence**:

> Instead of only answering "Where is my complaint?", the system helps answer "What is happening across AICTE regarding this institution?"

CaseLens identifies potentially related cases for the same institution, explains why they are related, detects possible cross-bureau action conflicts, and recommends coordination.

The current implementation uses **deterministic rule-based logic and seeded demo data**. Do NOT describe it as a production AI/ML system.

---

# 2. IMPORTANT — Current Status

The existing implementation is the completed first half of the prototype.

It has already been tested.

- Database seed works.
- CaseLens scoring works.
- Seed assertions pass.
- 87% relationship works.
- 73% relationship works.
- Cross-bureau conflict detection works.
- Disposal guard works.
- Coordination request works.
- Coordination acknowledgement works.
- Disposal unlock works.
- New complaint analysis works.
- New case creation works.
- Existing-case linking works.
- `npm run smoke` passed all 27 tests.
- Database has been reseeded into a clean demo state.

**Do NOT rebuild or replace these systems.**

---

# 3. Technology Stack

Use the existing stack:

- React
- Vite
- TypeScript
- Tailwind CSS
- Node.js
- Express
- Prisma
- SQLite
- Lucide React

Do NOT introduce:

- PostgreSQL
- MongoDB
- Redis
- Docker
- WebSockets
- Microservices
- OAuth
- Paid APIs
- External AI APIs
- Chart libraries unless specifically agreed upon

---

# 4. What Is Already Implemented

## Existing frontend routes

```text
/
```

Institution search/home.

```text
/institutions/:id
```

Institution 360°.

```text
/cases/:id
```

Case Details.

```text
/cases/:id/caselens
```

CaseLens Intelligence.

```text
/complaints/new
```

New Complaint → CaseLens analysis.

There is intentionally **no separate relationship page**.

---

# 5. Existing Backend APIs

The following APIs already exist:

```text
GET /api/institutions
GET /api/institutions/:id
GET /api/institutions/:id/cases

GET /api/cases/:id
GET /api/cases/:id/timeline
GET /api/cases/:id/relationships
GET /api/cases/:id/caselens

POST /api/cases/:id/caselens/analyze

POST /api/cases/:id/coordination
POST /api/cases/:id/coordination/acknowledge

POST /api/cases/:id/dispose
POST /api/cases/:id/override

POST /api/complaints/analyze
POST /api/complaints

POST /api/cases/:id/link
```

Do not change their behavior unless integration requires it and the change is discussed first.

---

# 6. Existing CaseLens Logic

CaseLens is deterministic.

Do NOT replace it with an LLM, random score, or hardcoded frontend score.

The relationship score is:

```text
Institution = 40 points
Category/Domain = 25 points
Keywords = 20 points maximum
Timeline = 15 points maximum
```

Maximum:

```text
100%
```

## Keyword score

After:

- lowercase
- punctuation removal
- stopword removal
- tokenization

Jaccard similarity is calculated.

```text
Keyword Score = round(20 × Jaccard similarity)
```

## Timeline score

Using absolute date difference:

```text
≤ 7 days  → 15
≤ 14 days → 10
≤ 30 days → 5
> 30 days → 0
```

## Category/domain mapping

```text
FEE_COMPLAINT
→ FEE_REGULATORY

REGULATORY_COMPLIANCE
→ FEE_REGULATORY

APPROVAL_ISSUE
→ APPROVAL
```

Same domain:

```text
25 points
```

Different domain:

```text
0 points
```

---

# 7. Critical Seeded Relationships

These MUST remain correct.

## Case 0412 ↔ Case 0198

Expected:

```text
87%
```

Breakdown:

```text
Institution: 40
Category/Domain: 25
Keywords: 12
Timeline: 10

Total: 87
```

## Case 0412 ↔ Case 0387

Expected:

```text
73%
```

Breakdown:

```text
Institution: 40
Category/Domain: 25
Keywords: 8
Timeline: 0

Total: 73
```

Do NOT modify the scoring formulas just to obtain these numbers.

The seed data is intentionally written so that the formulas produce these results.

---

# 8. Conflict Detection

The conflict matrix currently uses:

```text
REFUND_DIRECTION + APPROVAL_RESTRICTION
→ CONFLICT

APPROVAL_RESTRICTION + REFUND_DIRECTION
→ CONFLICT
```

These are not conflicts:

```text
DOCUMENT_REQUEST + anything
same action type
NONE + anything
```

Conflict additionally requires:

- same institution
- both cases active
- different bureaus/cells
- action types match the conflict matrix

Resolved cases must NOT create active conflicts.

---

# 9. Important Demo Data

Main institution:

```text
Sri Lakshmi Narayana Institute of Technology
AICTE Permanent ID: 1-789456123
Chennai, Tamil Nadu
Engineering Institution
Approval: Active
Attention: High
```

## Case 0412

```text
AICTE/PGRC/2026/0412
Bureau: PGRC
Category: Fee Complaint
Priority: High
Status: Under Review
```

Proposed action:

```text
Direct institution to refund excess fees collected from students.
```

Action type:

```text
REFUND_DIRECTION
```

IMPORTANT:

```text
Institution Response.pdf
Status: MISSING
```

This missing document is intentional.

---

## Case 0198

```text
AICTE/RB/2026/0198
Bureau: Regulatory Bureau
Category: Regulatory Compliance
Priority: High
Status: Action Proposed
```

Proposed action:

```text
Initiate approval restriction pending regulatory compliance review.
```

Action type:

```text
APPROVAL_RESTRICTION
```

This conflicts with Case 0412.

---

## Case 0387

```text
AICTE/PGRC/2026/0387
Bureau: PGRC
Category: Fee Complaint
Priority: Medium
Status: Resolved
```

It must remain resolved.

It scores:

```text
73%
```

with Case 0412.

Because it is resolved, it must NOT participate in an active conflict.

---

## Case 0271

```text
AICTE/APPR/2026/0271
Bureau: Approval
Category: Approval Issue
Priority: Medium
Status: Under Review
```

Action type:

```text
DOCUMENT_REQUEST
```

It should not create a conflict.

It is intentionally slightly overdue relative to the demo date.

---

# 10. Existing CaseLens Workflow

For Case 0412:

```text
Case 0412
    ↓
CaseLens
    ↓
Related Case 0198 — 87%
    ↓
Potential Cross-Bureau Conflict
    ↓
Compare proposed actions
    ↓
PGRC → Fee refund
Regulatory Bureau → Approval restriction
    ↓
Send Coordination Request
    ↓
Awaiting acknowledgement
    ↓
Simulate RB Acknowledgement
    ↓
Coordination Acknowledged
    ↓
Disposal unlocked
```

The case does NOT automatically become resolved.

---

# 11. Disposal Guard

If Case 0412 still has an active conflict, disposal must be blocked.

The guard should explain:

```text
Cross-Bureau Conflict

An active related case has a potentially conflicting proposed action.

PGRC Proposed Action:
Fee refund.

RB Proposed Action:
Approval restriction.

Independent disposal is currently blocked.
```

Available actions:

```text
Send Coordination Request
Override & Provide Reason
```

Override requires a reason.

The override must be logged with:

- reason
- actor
- timestamp
- action

After override, disposal can proceed.

---

# 12. Coordination

When coordination is sent:

```text
Status:
AWAITING_ACKNOWLEDGEMENT
```

A timeline event must be created.

The case remains active.

After acknowledgement:

```text
Status:
ACKNOWLEDGED
```

Timeline event is created.

The case remains:

```text
Under Review
```

but disposal becomes available.

Do NOT automatically resolve the case.

---

# 13. New Complaint Workflow

Route:

```text
/complaints/new
```

Demo institution:

```text
Sri Lakshmi Narayana Institute of Technology
```

Category:

```text
Fee Complaint
```

Description:

```text
Students report collection of fees inconsistent with the institution's approved fee structure.
```

Source:

```text
Student Grievance Portal
```

Priority:

```text
High
```

The analysis must use the SAME CaseLens scoring service.

Expected important results:

```text
RB-0198 → approximately 80–90%
PGRC-0387 → approximately 65–80%
```

The important requirement is:

```text
RB-0198 > PGRC-0387
```

Current seeded result:

```text
0198 → 80%
0387 → 73%
```

Another case may score higher. That is acceptable.

Do NOT change the scoring system merely to force 0198 to rank #1.

---

# 14. New Case Creation

Creating the demo complaint creates:

```text
AICTE/PGRC/2026/0421
```

Monitoring is enabled.

Existing-case linking should also work and enable monitoring.

---

# 15. Database

Existing Prisma schema and SQLite database are already configured.

Before modifying the database schema:

**Discuss it first.**

Do not replace SQLite with another database.

Do not delete existing CaseLens models or fields.

Existing important models include:

```text
Institution
Case
CaseRelationship
TimelineEvent
CoordinationRequest
Document
```

---

# 16. Your Part — What You Need to Build

The remaining half of the prototype is the management/operations side.

Build the following:

### 1. Executive Dashboard

A management overview of complaint activity.

Possible information:

- total cases
- open cases
- overdue cases
- cases by bureau
- priority overview
- institution/case attention
- high-level operational status

Keep it consistent with the existing visual style.

---

### 2. Bureau / Cell Management

Screen for viewing/managing AICTE bureaus/cells.

Examples:

```text
PGRC
Regulatory Bureau
Approval
```

The screen should feel like an internal administrative management page.

---

### 3. Assignment Management

Show:

- case
- assigned officer
- bureau/cell
- priority
- status

Allow reassignment if appropriate for the prototype.

Do not break the existing CaseLens relationships.

---

### 4. Transfer Management

Create a simple workflow for transferring a case between bureaus/cells.

Show:

```text
Current Bureau
Target Bureau
Reason
Transfer status
Timeline
```

Do not implement real-time infrastructure.

---

### 5. Alerts / Notifications

Create a visual notification/alerts area.

Examples:

- high-priority case
- overdue case
- cross-bureau conflict
- pending coordination
- acknowledgement required

This can be prototype data.

Do NOT create WebSockets or real-time infrastructure.

---

### 6. Analytics / Reports

Create management-oriented reporting screens.

Use simple tables, summaries, or CSS-based visualizations.

Do NOT add a chart library unless explicitly agreed.

Examples:

- cases by bureau
- cases by category
- cases by status
- resolution/processing overview
- overdue cases

---

### 7. Administration / Management Screens

Add appropriate administrative screens needed for the prototype.

Examples:

- system configuration
- management overview
- administrative settings

Keep them visually consistent with the existing dashboard.

---

# 17. DO NOT BUILD

Do NOT rebuild these:

```text
CaseLens
Institution 360°
Case Details
New Complaint
Disposal Guard
Coordination
Existing scoring logic
Existing seed data
```

Do NOT add:

```text
Login/authentication
User-management system
Real-time WebSockets
External AI APIs
Paid APIs
Redis
Docker
PostgreSQL
MongoDB
Microservices
```

Do not turn the project into a completely different architecture.

---

# 18. Existing Sidebar

The current sidebar contains the existing working areas and placeholder management areas.

You may replace the "Coming soon" visual placeholders with your actual screens.

The management screens should become active routes.

Do not remove access to:

```text
Search
Institution 360°
Case Details
CaseLens
New Complaint
```

---

# 19. Visual Design

Match the existing application.

The intended style is:

- serious internal government/education system
- light neutral/white interface
- deep navy primary
- restrained blue/teal
- Inter font
- compact dark navy sidebar
- thin borders
- mild rounded corners
- minimal shadows
- dense readable tables
- compact badges

Avoid:

- gradients
- glassmorphism
- huge headings
- excessive whitespace
- colorful KPI card grids
- excessive shadows
- animations
- emoji
- floating AI widgets
- generic "AI dashboard" styling

The existing UI is intentionally functional and professional rather than highly decorative.

---

# 20. Development Rules

Before changing anything:

1. Inspect the existing project.
2. Understand the current architecture.
3. Reuse existing components.
4. Reuse existing API/client patterns.
5. Do not rewrite working CaseLens code.
6. Do not modify scoring formulas.
7. Do not change seeded demo relationships.
8. Keep TypeScript strict and clean.
9. Avoid unnecessary dependencies.
10. Test after each major feature.

If you think an existing implementation must be changed, explain why before doing it.

---

# 21. Running the Project

From the project root:

```bash
npm install
```

Seed/reset demo data:

```bash
npm run seed
```

Start development server:

```bash
npm run dev
```

Run smoke tests:

```bash
npm run smoke
```

The development application normally runs with:

```text
Frontend: http://localhost:5173
Backend: http://localhost:3001
```

---

# 22. IMPORTANT — Database Reset

The seed script creates the deterministic demo dataset.

Before the final demo:

```bash
npm run seed
```

Do not record the demo immediately after exploratory testing unless the database has been reseeded.

---

# 23. Integration Safety

After adding your screens:

```bash
npm run seed
npm run smoke
```

The existing 27 smoke tests must continue to pass.

At minimum verify:

- Case 0412
- Case 0198
- Case 0387
- 87% relationship
- 73% relationship
- conflict detection
- coordination
- acknowledgement
- disposal unlock
- new complaint
- Case 0421 creation/linking

If your changes cause these to fail, fix the integration rather than modifying the expected CaseLens behavior.

---

# 24. Final Demo Story

The complete project should tell this story:

```text
Detect
↓
Explain
↓
Prevent
↓
Coordinate
↓
Resolve
↓
Manage at Institution/Bureau/Executive level
```

The existing half demonstrates the intelligence workflow.

The new half should demonstrate the management/operational workflow around it.

---

# 25. Most Important Rule

**Do not optimize for adding the maximum number of features.**

Optimize for:

```text
Stable
↓
Believable
↓
Integrated
↓
Easy to demonstrate
```

If a feature is not necessary for the demo, keep it simple.

The existing CaseLens workflow is the core innovation and must remain stable.