import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { analyzeRelationships, analyzeComplaint, calculateScore, tokenize } from "./caselens";

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

// Fixed demo date
const DEMO_DATE = new Date("2026-10-23T00:00:00.000Z");

app.use(cors());
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(status: string): boolean {
  return !["Resolved", "Closed", "Disposed"].includes(status);
}

async function getCaseSummaries() {
  const cases = await prisma.case.findMany({
    include: { institution: true },
  });
  return cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    institutionId: c.institutionId,
    bureau: c.bureau,
    category: c.category,
    description: c.description,
    status: c.status,
    actionType: c.actionType,
    proposedAction: c.proposedAction,
    createdAt: c.createdAt,
  }));
}

// ─── Institutions ─────────────────────────────────────────────────────────────

app.get("/api/institutions", async (_req, res) => {
  try {
    const institutions = await prisma.institution.findMany({
      include: { _count: { select: { cases: true } } },
    });
    res.json(institutions);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch institutions" });
  }
});

app.get("/api/institutions/:id", async (req, res) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: {
        cases: {
          include: { documents: true, coordinationsFrom: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!institution) return res.status(404).json({ error: "Institution not found" });

    // Count related cases (confidence > 60%) for each active case, excluding self
    const allCases = await getCaseSummaries();
    const instCases = allCases.filter((c) => c.institutionId === institution.id);

    let relatedCasesCount = 0;
    const relatedCaseIds = new Set<string>();
    for (const c of instCases) {
      const results = analyzeRelationships(c, allCases);
      for (const r of results) {
        if (r.score.total > 60 && r.relatedCase.institutionId === institution.id) {
          relatedCaseIds.add(r.relatedCase.id);
        }
      }
    }
    relatedCasesCount = relatedCaseIds.size;

    // Detect active conflicts
    let hasActiveConflict = false;
    const conflictPairs: Array<{ caseA: string; caseB: string }> = [];
    for (const c of instCases) {
      if (!isActive(c.status)) continue;
      const results = analyzeRelationships(c, allCases);
      for (const r of results) {
        if (r.conflictType === "ACTION_CONFLICT") {
          hasActiveConflict = true;
          conflictPairs.push({ caseA: c.caseNumber, caseB: r.relatedCase.caseNumber });
        }
      }
    }

    // Bureau list
    const bureaus = [...new Set(institution.cases.map((c) => c.bureau))];
    const openCases = institution.cases.filter((c) => isActive(c.status)).length;

    // Overdue
    const casesWithOverdue = institution.cases.map((c) => ({
      ...c,
      isOverdue:
        c.expectedDisposalDate !== null &&
        new Date(c.expectedDisposalDate) < DEMO_DATE &&
        isActive(c.status),
    }));

    res.json({
      ...institution,
      cases: casesWithOverdue,
      stats: {
        totalCases: institution.cases.length,
        openCases,
        relatedCases: relatedCasesCount,
        bureausInvolved: bureaus.length,
      },
      bureaus,
      hasActiveConflict,
      conflictPairs: [...new Set(conflictPairs.map((p) => JSON.stringify(p)))].map((s) =>
        JSON.parse(s)
      ),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch institution" });
  }
});

app.get("/api/institutions/:id/cases", async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      where: { institutionId: req.params.id },
      include: { documents: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(cases);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

// ─── Cases ────────────────────────────────────────────────────────────────────

app.get("/api/cases/:id", async (req, res) => {
  try {
    const c = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: {
        institution: true,
        documents: true,
        coordinationsFrom: true,
        coordinationsTo: true,
      },
    });
    if (!c) return res.status(404).json({ error: "Case not found" });

    const isOverdue =
      c.expectedDisposalDate !== null &&
      new Date(c.expectedDisposalDate) < DEMO_DATE &&
      isActive(c.status);

    res.json({ ...c, isOverdue });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

app.get("/api/cases/:id/timeline", async (req, res) => {
  try {
    const events = await prisma.timelineEvent.findMany({
      where: { caseId: req.params.id },
      orderBy: { timestamp: "asc" },
    });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

app.get("/api/cases/:id/relationships", async (req, res) => {
  try {
    const relationships = await prisma.caseRelationship.findMany({
      where: { OR: [{ caseAId: req.params.id }, { caseBId: req.params.id }] },
      include: { caseA: true, caseB: true },
    });
    res.json(relationships);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch relationships" });
  }
});

app.get("/api/cases/:id/caselens", async (req, res) => {
  try {
    const mainCase = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { institution: true },
    });
    if (!mainCase) return res.status(404).json({ error: "Case not found" });

    const allCases = await getCaseSummaries();
    const mainSummary = {
      id: mainCase.id,
      caseNumber: mainCase.caseNumber,
      institutionId: mainCase.institutionId,
      bureau: mainCase.bureau,
      category: mainCase.category,
      description: mainCase.description,
      status: mainCase.status,
      actionType: mainCase.actionType,
      proposedAction: mainCase.proposedAction,
      createdAt: mainCase.createdAt,
    };

    const results = analyzeRelationships(mainSummary, allCases);

    // Get stored relationships for this case
    const storedRels = await prisma.caseRelationship.findMany({
      where: { OR: [{ caseAId: req.params.id }, { caseBId: req.params.id }] },
      include: { caseA: true, caseB: true },
    });

    // Check for active coordination
    const activeCoord = await prisma.coordinationRequest.findFirst({
      where: {
        caseId: req.params.id,
        status: { in: ["AWAITING_ACKNOWLEDGEMENT", "ACKNOWLEDGED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const hasActiveConflict = results.some((r) => r.conflictType === "ACTION_CONFLICT");
    const conflictBlocked =
      hasActiveConflict &&
      (!activeCoord || activeCoord.status === "AWAITING_ACKNOWLEDGEMENT");

    res.json({
      mainCase: { ...mainCase },
      relationships: results.map((r) => ({
        relatedCase: r.relatedCase,
        confidence: r.score.total,
        breakdown: r.score,
        conflictType: r.conflictType,
        recommendation: r.recommendation,
      })),
      hasActiveConflict,
      conflictBlocked,
      activeCoordination: activeCoord,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "CaseLens analysis failed" });
  }
});

app.post("/api/cases/:id/caselens/analyze", async (req, res) => {
  // Re-runs analysis (same as GET)
  return res.redirect(307, `/api/cases/${req.params.id}/caselens`);
});

// ─── Coordination ─────────────────────────────────────────────────────────────

app.post("/api/cases/:id/coordination", async (req, res) => {
  try {
    const mainCase = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { institution: true },
    });
    if (!mainCase) return res.status(404).json({ error: "Case not found" });

    const allCases = await getCaseSummaries();
    const mainSummary = allCases.find((c) => c.id === req.params.id)!;
    const results = analyzeRelationships(mainSummary, allCases);
    const conflictResult = results.find((r) => r.conflictType === "ACTION_CONFLICT");

    if (!conflictResult) {
      return res.status(400).json({ error: "No active conflict found" });
    }

    // Check for existing coordination
    const existing = await prisma.coordinationRequest.findFirst({
      where: {
        caseId: req.params.id,
        status: { in: ["AWAITING_ACKNOWLEDGEMENT", "ACKNOWLEDGED"] },
      },
    });
    if (existing) {
      return res.status(400).json({ error: "Coordination request already exists", existing });
    }

    const coord = await prisma.coordinationRequest.create({
      data: {
        caseId: req.params.id,
        relatedCaseId: conflictResult.relatedCase.id,
        fromBureau: mainCase.bureau,
        toBureau: conflictResult.relatedCase.bureau,
        message: `Coordination requested regarding potentially conflicting actions on ${mainCase.institution.name}. Please review before independent disposal.`,
        status: "AWAITING_ACKNOWLEDGEMENT",
      },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: req.params.id,
        action: "Coordination Request Sent",
        actor: mainCase.assignedOfficer,
        designation: mainCase.officerDesignation,
        remark: `Coordination request sent to ${conflictResult.relatedCase.bureau}. Status: Awaiting acknowledgement.`,
      },
    });

    res.json({ success: true, coordination: coord });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create coordination request" });
  }
});

app.post("/api/cases/:id/coordination/acknowledge", async (req, res) => {
  try {
    const coord = await prisma.coordinationRequest.findFirst({
      where: {
        caseId: req.params.id,
        status: "AWAITING_ACKNOWLEDGEMENT",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!coord) {
      return res.status(404).json({ error: "No pending coordination request found" });
    }

    const updated = await prisma.coordinationRequest.update({
      where: { id: coord.id },
      data: { status: "ACKNOWLEDGED" },
    });

    const mainCase = await prisma.case.findUnique({ where: { id: req.params.id } });

    await prisma.timelineEvent.create({
      data: {
        caseId: req.params.id,
        action: "Coordination Acknowledged",
        actor: `${coord.toBureau} — Section Officer`,
        designation: "Section Officer",
        remark: `${coord.toBureau} has acknowledged the coordination request. Case disposal can now proceed.`,
      },
    });

    res.json({ success: true, coordination: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to acknowledge coordination" });
  }
});

// ─── Dispose ──────────────────────────────────────────────────────────────────

app.post("/api/cases/:id/dispose", async (req, res) => {
  try {
    const mainCase = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { institution: true },
    });
    if (!mainCase) return res.status(404).json({ error: "Case not found" });

    if (!isActive(mainCase.status)) {
      return res.status(400).json({ error: "Case is already disposed or resolved" });
    }

    const allCases = await getCaseSummaries();
    const mainSummary = allCases.find((c) => c.id === req.params.id)!;
    const results = analyzeRelationships(mainSummary, allCases);
    const hasActiveConflict = results.some((r) => r.conflictType === "ACTION_CONFLICT");

    if (hasActiveConflict) {
      // Check if coordination is acknowledged
      const coord = await prisma.coordinationRequest.findFirst({
        where: {
          caseId: req.params.id,
          status: "ACKNOWLEDGED",
        },
      });

      if (!coord) {
        const conflictResult = results.find((r) => r.conflictType === "ACTION_CONFLICT")!;
        return res.status(409).json({
          error: "CONFLICT_BLOCKED",
          message: "Independent disposal is currently blocked due to an active cross-bureau conflict.",
          conflict: {
            caseA: { bureau: mainCase.bureau, proposedAction: mainCase.proposedAction },
            caseB: { bureau: conflictResult.relatedCase.bureau, proposedAction: conflictResult.relatedCase.proposedAction },
          },
        });
      }
    }

    // Dispose
    const disposed = await prisma.case.update({
      where: { id: req.params.id },
      data: { status: "Disposed" },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: req.params.id,
        action: "Case Disposed",
        actor: mainCase.assignedOfficer,
        designation: mainCase.officerDesignation,
        remark: "Case disposed after coordination acknowledgement.",
      },
    });

    res.json({ success: true, case: disposed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to dispose case" });
  }
});

// ─── Override ─────────────────────────────────────────────────────────────────

app.post("/api/cases/:id/override", async (req, res) => {
  try {
    const { reason, actor } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: "A detailed override reason is required (minimum 10 characters)." });
    }

    const mainCase = await prisma.case.findUnique({ where: { id: req.params.id } });
    if (!mainCase) return res.status(404).json({ error: "Case not found" });
    if (!isActive(mainCase.status)) {
      return res.status(400).json({ error: "Case is already disposed or resolved" });
    }

    const disposed = await prisma.case.update({
      where: { id: req.params.id },
      data: { status: "Disposed" },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: req.params.id,
        action: "Override Disposal",
        actor: actor || mainCase.assignedOfficer,
        designation: mainCase.officerDesignation,
        remark: `Conflict guard overridden. Reason: ${reason.trim()}`,
      },
    });

    res.json({ success: true, case: disposed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to override disposal" });
  }
});

// ─── Complaints / New ─────────────────────────────────────────────────────────

app.post("/api/complaints/analyze", async (req, res) => {
  try {
    const { institutionId, category, description } = req.body;
    if (!institutionId || !category || !description) {
      return res.status(400).json({ error: "institutionId, category, and description are required" });
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: "Institution not found" });

    const allCases = await getCaseSummaries();

    const complaint = {
      institutionId,
      category,
      description,
      createdAt: DEMO_DATE,
    };

    const results = analyzeComplaint(complaint, allCases);

    res.json({
      institution,
      matches: results.map((r) => ({
        relatedCase: r.relatedCase,
        confidence: r.score.total,
        breakdown: r.score,
        conflictType: r.conflictType,
        recommendation: r.recommendation,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Complaint analysis failed" });
  }
});

app.post("/api/complaints", async (req, res) => {
  try {
    const { institutionId, category, description, priority, source } = req.body;

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: "Institution not found" });

    // Check if 0421 already exists
    const existing = await prisma.case.findUnique({
      where: { caseNumber: "AICTE/PGRC/2026/0421" },
    });
    if (existing) {
      return res.json({ success: true, case: existing, alreadyExisted: true });
    }

    const newCase = await prisma.case.create({
      data: {
        caseNumber: "AICTE/PGRC/2026/0421",
        institutionId,
        bureau: "PGRC",
        category,
        description,
        priority: priority || "High",
        status: "Open",
        assignedOfficer: "Anita Ramanathan",
        officerDesignation: "Section Officer",
        proposedAction: "",
        actionType: "NONE",
        createdAt: DEMO_DATE,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: newCase.id,
        action: "Case Registered",
        actor: "System",
        designation: "System",
        remark: `Case registered from ${source || "New Complaint Form"}. CaseLens monitoring enabled.`,
      },
    });

    res.json({ success: true, case: newCase });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create complaint" });
  }
});

// ─── Link Existing Case ───────────────────────────────────────────────────────

app.post("/api/cases/:id/link", async (req, res) => {
  try {
    const { targetCaseId, note } = req.body;
    const sourceCase = await prisma.case.findUnique({ where: { id: req.params.id } });
    const targetCase = await prisma.case.findUnique({ where: { id: targetCaseId } });

    if (!sourceCase || !targetCase) {
      return res.status(404).json({ error: "One or both cases not found" });
    }

    // Check if relationship already exists
    const existing = await prisma.caseRelationship.findFirst({
      where: {
        OR: [
          { caseAId: sourceCase.id, caseBId: targetCase.id },
          { caseAId: targetCase.id, caseBId: sourceCase.id },
        ],
      },
    });

    if (existing) {
      return res.json({ success: true, relationship: existing, alreadyLinked: true });
    }

    const scoreBreakdown = calculateScore(
      {
        institutionId: sourceCase.institutionId,
        category: sourceCase.category,
        description: sourceCase.description,
        createdAt: sourceCase.createdAt,
      },
      {
        institutionId: targetCase.institutionId,
        category: targetCase.category,
        description: targetCase.description,
        createdAt: targetCase.createdAt,
      }
    );

    const relationship = await prisma.caseRelationship.create({
      data: {
        caseAId: sourceCase.id,
        caseBId: targetCase.id,
        confidence: scoreBreakdown.total,
        institutionScore: scoreBreakdown.institutionScore,
        categoryScore: scoreBreakdown.categoryScore,
        keywordScore: scoreBreakdown.keywordScore,
        timelineScore: scoreBreakdown.timelineScore,
        relationshipType: "LINKED",
        conflictType: "NO_CONFLICT",
        recommendation: `Cases manually linked. CaseLens monitoring enabled.`,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: sourceCase.id,
        action: "Case Linked",
        actor: "System",
        designation: "System",
        remark: `Linked to ${targetCase.caseNumber}. ${note || ""}`,
      },
    });

    res.json({ success: true, relationship });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to link cases" });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`AICTE CaseLens API running on http://localhost:${PORT}`);
});

export default app;
