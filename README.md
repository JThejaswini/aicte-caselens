# AICTE CaseLens — Institution-Centric Complaint Intelligence

**SIH Problem Statement ID:** SIH26264  
**Theme:** Smart Automation · **Category:** Software  
**Organization:** AICTE

---

## What is CaseLens?

CaseLens is an **institution-centric** complaint intelligence layer for AICTE's complaint management system.

> Instead of only answering "Where is my complaint?", CaseLens answers  
> **"What is happening across AICTE regarding this institution?"**

CaseLens uses deterministic, rule-based analysis (no LLM, no external AI APIs) to:

- Identify an institution and retrieve all related cases across AICTE bureaus/cells
- Calculate a transparent **Relationship Confidence** score for every pair of cases
- Detect **Cross-Bureau Conflicts** where proposed actions may contradict each other
- **Block independent disposal** when an active conflict exists
- Recommend **Coordination** between bureaus before disposal
- Analyze new complaints and rank existing related cases

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Lucide React |
| Backend | Node.js, Express, TypeScript |
| ORM / DB | Prisma + SQLite |
| Scoring | Deterministic rule-based (Jaccard similarity, domain groups) |

**No:** PostgreSQL, MongoDB, Redis, Docker, WebSockets, external AI APIs, OAuth.

---

## Project Structure

```
/
├── package.json
├── README.md
├── prisma/
│   ├── schema.prisma        # Database models
│   ├── seed.ts              # Deterministic seed + assertions
│   └── dev.db               # SQLite database (auto-created)
├── server/
│   ├── index.ts             # Express API server (port 3001)
│   ├── caselens.ts          # CaseLens scoring service
│   └── smoke.ts             # Smoke test suite
└── src/
    ├── main.tsx             # React entry point
    ├── App.tsx              # Routes
    ├── api.ts               # Typed API client
    ├── index.css
    ├── components/
    │   ├── Layout.tsx       # Sidebar + shell
    │   ├── Timeline.tsx     # Reusable timeline
    │   ├── DisposalGuard.tsx # Conflict guard modal
    │   └── ui.tsx           # Shared components
    └── pages/
        ├── Home.tsx         # / — Institution search
        ├── Institution.tsx  # /institutions/:id — 360°
        ├── CaseDetail.tsx   # /cases/:id
        ├── CaseLens.tsx     # /cases/:id/caselens
        └── NewComplaint.tsx # /complaints/new
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Push database schema
npm run prisma:push

# 3. Seed demo data (and verify scoring assertions)
npm run seed

# 4. Start the application
npm run dev
```

The application runs at:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start both API server and Vite dev server |
| `npm run seed` | Wipe and re-create demo data; verify 87/73 assertions |
| `npm run smoke` | API smoke test (run with server already started) |
| `npm run build` | Build frontend for production |

> **After running `npm run smoke`**, always re-run `npm run seed` to restore clean demo data.

---

## Demo Flow

### Path 1: Institution → CaseLens → Coordination → Disposal

1. Open http://localhost:5173
2. Search **Sri Lakshmi Narayana Institute of Technology**
3. Institution 360° shows 4 cases across 3 bureaus
4. **Cross-Bureau Conflict Detected** banner is visible
5. Click **Review in CaseLens** → opens Case 0412 CaseLens screen
6. See **87% Relationship Confidence** with full breakdown
7. See side-by-side bureau action comparison:
   - PGRC: "Refund excess fees"
   - Regulatory Bureau: "Approval restriction"
8. Click **Dispose Case** → conflict guard blocks disposal
9. Click **Send Coordination Request** → status shows "Awaiting acknowledgement"
10. Click **Simulate RB Acknowledgement** → disposal unlocked
11. Click **Dispose Case** → case disposed

### Path 2: New Complaint → CaseLens

1. Click **New Complaint** in sidebar
2. Institution and description are pre-filled with demo data
3. Click **Analyze with CaseLens**
4. See 3-step analysis progress
5. Results show:
   - **AICTE/RB/2026/0198** at **80%** (higher)
   - **AICTE/PGRC/2026/0387** at **73%** (lower)
6. Click **Create New Case** → creates **AICTE/PGRC/2026/0421**
7. Or click **Link to Existing Case** to link to a related case

---

## CaseLens Scoring Logic

CaseLens uses a **deterministic, transparent scoring formula** — maximum 100 points.

| Component | Points | Logic |
|---|---|---|
| Institution | 40 | Same institution ID → 40, different → 0 |
| Category / Domain | 25 | Same complaint domain group → 25, different → 0 |
| Keywords | 0–20 | `round(20 × Jaccard similarity)` of tokenized descriptions |
| Timeline | 0–15 | ≤7 days→15, ≤14→10, ≤30→5, >30→0 |

**Domain Groups:**
- `Fee Complaint` + `Regulatory Compliance` → `FEE_REGULATORY`
- `Approval Issue` → `APPROVAL`

**Keyword tokenization:** lowercase, remove punctuation, remove stopwords, filter len≤2.

### Seeded Score Assertions (verified on every `npm run seed`)

| Pair | inst | cat | kw | tl | **Total** |
|---|---|---|---|---|---|
| 0412 ↔ 0198 | 40 | 25 | 12 | 10 | **87** |
| 0412 ↔ 0387 | 40 | 25 | 8 | 0 | **73** |

---

## Conflict Detection Matrix

Conflict requires **all four** conditions:
1. Same institution
2. Both cases **active** (not Resolved/Closed/Disposed)
3. Different bureaus
4. Action types match a conflict rule:

| Case A Action | Case B Action | Result |
|---|---|---|
| REFUND_DIRECTION | APPROVAL_RESTRICTION | **CONFLICT** |
| APPROVAL_RESTRICTION | REFUND_DIRECTION | **CONFLICT** |
| DOCUMENT_REQUEST | anything | NO_CONFLICT |
| same | same | NO_CONFLICT |
| NONE | anything | NO_CONFLICT |

---

## Seeded Demo Cases

| Case | Bureau | Category | Status | Action Type |
|---|---|---|---|---|
| AICTE/PGRC/2026/0412 | PGRC | Fee Complaint | Under Review | REFUND_DIRECTION |
| AICTE/RB/2026/0198 | Regulatory Bureau | Regulatory Compliance | Action Proposed | APPROVAL_RESTRICTION |
| AICTE/PGRC/2026/0387 | PGRC | Fee Complaint | **Resolved** | REFUND_DIRECTION |
| AICTE/APPR/2026/0271 | Approval | Approval Issue | Under Review (**Overdue**) | DOCUMENT_REQUEST |

**Notable intentional imperfections:**
- Case 0412: `Institution Response.pdf` status = **MISSING**
- Case APPR-0271: Expected disposal date is **before** DEMO_DATE (overdue)
- Case 0387: **Resolved** — must never trigger an active conflict

---

## Important Notes

- **DEMO_DATE = 2026-10-23** — all overdue/timeline calculations use this fixed date
- CaseLens is a **deterministic prototype** — not a production AI model
- No authentication is implemented — this is a demo prototype
- The 87% and 73% scores are produced by real Jaccard similarity calculation, not hardcoded values
