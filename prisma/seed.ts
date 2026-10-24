/**
 * CaseLens Seed Data
 * Deterministic seed with assertions.
 * DEMO_DATE = 2026-10-23
 */

import { PrismaClient } from "@prisma/client";
import { calculateScore, tokenize } from "../server/caselens";

const prisma = new PrismaClient();

const DEMO_DATE = new Date("2026-10-23T00:00:00.000Z");

function daysOffset(days: number): Date {
  const d = new Date(DEMO_DATE);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("=== AICTE CaseLens Seed ===\n");

  // Wipe all data
  await prisma.coordinationRequest.deleteMany();
  await prisma.document.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.caseRelationship.deleteMany();
  await prisma.case.deleteMany();
  await prisma.institution.deleteMany();

  console.log("Cleared existing data.\n");

  // ─── Institution ─────────────────────────────────────────────────────────────

  const institution = await prisma.institution.create({
    data: {
      aictePermanentId: "1-789456123",
      name: "Sri Lakshmi Narayana Institute of Technology",
      type: "Engineering Institution",
      state: "Tamil Nadu",
      district: "Chennai",
      approvalStatus: "Active",
      attentionLevel: "High",
    },
  });

  console.log(`Institution created: ${institution.name}`);

  // ─── Scoring descriptions (carefully tuned for Jaccard targets) ───────────────
  //
  // tokenize() → lowercase, remove punctuation, filter len≤2 and stopwords
  //
  // desc0412 tokens (10):
  //   students, complaint, institution, collected, excess, fees, approved, fee, structure, refund
  //
  // desc0198 tokens (9):
  //   institution, fees, students, excess, approved, fee, structure, regulatory, compliance
  //
  // desc0387 tokens (7):
  //   students, grievance, institution, fees, approved, fee, reimbursement
  //
  // 0412 ↔ 0198:
  //   intersection = {institution, students, fees, excess, approved, fee, structure} = 7
  //   union = 10 + 9 - 7 = 12 → J = 7/12 = 0.5833 → kw = round(11.667) = 12
  //   total = 40 + 25 + 12 + 10 = 87 ✓
  //
  // 0412 ↔ 0387:
  //   intersection = {students, institution, fees, approved, fee} = 5
  //   union = 10 + 7 - 5 = 12 → J = 5/12 = 0.4167 → kw = round(8.333) = 8
  //   total = 40 + 25 + 8 + 0 = 73 ✓
  //
  // New complaint (spec text: "Students report collection of fees inconsistent with the institution's approved fee structure."):
  //   tokens = students, report, collection, fees, inconsistent, institution, approved, fee, structure = 9
  //   New ↔ 0198: intersection={institution,fees,students,approved,fee,structure}=6, union=9+9-6=12, J=0.5, kw=10
  //     total = 40+25+10+5 = 80 ✓ (range 80-90)
  //   New ↔ 0387: intersection={students,fees,institution,approved,fee}=5, union=9+7-5=11, J=0.4545, kw=9
  //     total = 40+25+9+0 = 74 ✓ (range 65-80, less than 80)

  // Case 0412 scoring description
  // Tokens: students, complaint, institution, collected, excess, fees, approved, fee, structure, refund
  const desc0412 =
    "Students' complaint: institution has collected excess fees from the approved fee structure. Refund.";

  // Case 0198 scoring description
  // Tokens: institution, fees, students, excess, approved, fee, structure, regulatory, compliance
  const desc0198 =
    "Institution fees for students are in excess of the approved fee structure. Regulatory compliance.";

  // Case 0387 scoring description
  // Tokens: students, grievance, institution, fees, approved, fee, reimbursement
  const desc0387 =
    "Students' grievance: institution fees not as per approved fee. Reimbursement.";

  // Pre-verify tokens
  const t0412 = tokenize(desc0412);
  const t0198 = tokenize(desc0198);
  const t0387 = tokenize(desc0387);

  console.log("Token analysis:");
  console.log(`  0412 tokens (${t0412.size}):`, [...t0412].sort().join(", "));
  console.log(`  0198 tokens (${t0198.size}):`, [...t0198].sort().join(", "));
  console.log(`  0387 tokens (${t0387.size}):`, [...t0387].sort().join(", "));

  const inter0412_0198 = [...t0412].filter((x) => t0198.has(x));
  const union0412_0198 = new Set([...t0412, ...t0198]);
  const j0412_0198 = inter0412_0198.length / union0412_0198.size;
  console.log(`  0412∩0198 = ${inter0412_0198.length}, union = ${union0412_0198.size}, J = ${j0412_0198.toFixed(4)} → kw = ${Math.round(20 * j0412_0198)}`);

  const inter0412_0387 = [...t0412].filter((x) => t0387.has(x));
  const union0412_0387 = new Set([...t0412, ...t0387]);
  const j0412_0387 = inter0412_0387.length / union0412_0387.size;
  console.log(`  0412∩0387 = ${inter0412_0387.length}, union = ${union0412_0387.size}, J = ${j0412_0387.toFixed(4)} → kw = ${Math.round(20 * j0412_0387)}`);

  // ─── Dates ────────────────────────────────────────────────────────────────────

  // 0412 created Oct 15, 0198 created Oct 2 → diff 13 days → within 14 → timeline score 10 ✓
  // 0412 vs 0387 (June 10) → diff 127 days → > 30 → timeline score 0 ✓
  const created0412 = daysOffset(-8);  // Oct 15, 2026
  const created0198 = daysOffset(-21); // Oct 2, 2026
  const created0387 = new Date("2026-06-10T00:00:00.000Z");
  const createdAPPR = daysOffset(-15); // Oct 8, 2026

  const diff0412_0198 = Math.abs(created0412.getTime() - created0198.getTime()) / (1000 * 60 * 60 * 24);
  const diff0412_0387 = Math.abs(created0412.getTime() - created0387.getTime()) / (1000 * 60 * 60 * 24);

  console.log(`\nDate analysis:`);
  console.log(`  0412: ${created0412.toISOString().slice(0, 10)}, 0198: ${created0198.toISOString().slice(0, 10)}`);
  console.log(`  Diff 0412-0198: ${diff0412_0198.toFixed(1)} days → tl = ${diff0412_0198 <= 7 ? 15 : diff0412_0198 <= 14 ? 10 : diff0412_0198 <= 30 ? 5 : 0}`);
  console.log(`  Diff 0412-0387: ${diff0412_0387.toFixed(1)} days → tl = ${diff0412_0387 <= 7 ? 15 : diff0412_0387 <= 14 ? 10 : diff0412_0387 <= 30 ? 5 : 0}`);

  // ─── Cases ────────────────────────────────────────────────────────────────────

  const case0412 = await prisma.case.create({
    data: {
      caseNumber: "AICTE/PGRC/2026/0412",
      institutionId: institution.id,
      bureau: "PGRC",
      category: "Fee Complaint",
      description: desc0412,
      displayDescription:
        "Multiple students have reported that the institution has been collecting fees in excess of the AICTE-approved fee structure for the academic year 2026. The complaint pertains to fee irregularities. Institution has been directed to process refund of excess amounts collected from students.",
      priority: "High",
      status: "Under Review",
      assignedOfficer: "Anita Ramanathan",
      officerDesignation: "Section Officer",
      proposedAction: "Direct institution to refund excess fees collected from students.",
      actionType: "REFUND_DIRECTION",
      expectedDisposalDate: new Date("2026-10-28T00:00:00.000Z"),
      createdAt: created0412,
    },
  });

  const case0198 = await prisma.case.create({
    data: {
      caseNumber: "AICTE/RB/2026/0198",
      institutionId: institution.id,
      bureau: "Regulatory Bureau",
      category: "Regulatory Compliance",
      description: desc0198,
      displayDescription:
        "Regulatory inspection indicates that the institution has been operating with significant fee irregularities and compliance lapses. The institution has collected fees in excess of the AICTE-approved fee structure without proper disclosure. A regulatory compliance review has been initiated and an approval restriction is proposed pending resolution of the compliance issues.",
      priority: "High",
      status: "Action Proposed",
      assignedOfficer: "R. Karthik",
      officerDesignation: "Deputy Director",
      proposedAction: "Initiate approval restriction pending regulatory compliance review.",
      actionType: "APPROVAL_RESTRICTION",
      expectedDisposalDate: new Date("2026-10-30T00:00:00.000Z"),
      createdAt: created0198,
    },
  });

  const case0387 = await prisma.case.create({
    data: {
      caseNumber: "AICTE/PGRC/2026/0387",
      institutionId: institution.id,
      bureau: "PGRC",
      category: "Fee Complaint",
      description: desc0387,
      displayDescription:
        "Students submitted a grievance regarding collection of fees beyond the approved fee structure. Institution agreed to reimburse affected students. Case resolved following institutional compliance and confirmation of reimbursement to affected students.",
      priority: "Medium",
      status: "Resolved",
      assignedOfficer: "Anita Ramanathan",
      officerDesignation: "Section Officer",
      proposedAction: "Resolved.",
      actionType: "REFUND_DIRECTION",
      expectedDisposalDate: new Date("2026-07-01T00:00:00.000Z"),
      createdAt: created0387,
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "AICTE/APPR/2026/0271",
      institutionId: institution.id,
      bureau: "Approval",
      category: "Approval Issue",
      description:
        "Institution has not submitted mandatory documentation required for annual approval renewal. Documents pending submission.",
      displayDescription:
        "Institution has not submitted mandatory documentation required for annual approval renewal. Compliance documents including faculty records and infrastructure reports remain pending. Renewal approval is on hold pending document submission. Expected disposal date has passed without resolution.",
      priority: "Medium",
      status: "Under Review",
      assignedOfficer: "Meena S.",
      officerDesignation: "Assistant Director",
      proposedAction: "Request additional institutional documentation.",
      actionType: "DOCUMENT_REQUEST",
      expectedDisposalDate: new Date("2026-10-20T00:00:00.000Z"),
      createdAt: createdAPPR,
    },
  });

  console.log("\nCases created: 0412, 0198, 0387, APPR-0271");

  // ─── Documents ────────────────────────────────────────────────────────────────

  await prisma.document.createMany({
    data: [
      {
        caseId: case0412.id,
        name: "Complaint Letter.pdf",
        type: "Complaint",
        status: "RECEIVED",
        uploadedAt: created0412,
      },
      {
        caseId: case0412.id,
        name: "Institution Response.pdf",
        type: "Response",
        status: "MISSING",
        uploadedAt: created0412,
      },
      {
        caseId: case0412.id,
        name: "Fee Structure Copy.pdf",
        type: "Evidence",
        status: "RECEIVED",
        uploadedAt: created0412,
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        caseId: case0198.id,
        name: "Regulatory Notice.pdf",
        type: "Notice",
        status: "RECEIVED",
        uploadedAt: created0198,
      },
      {
        caseId: case0198.id,
        name: "Compliance Report.pdf",
        type: "Report",
        status: "RECEIVED",
        uploadedAt: created0198,
      },
    ],
  });

  // ─── Timeline Events ──────────────────────────────────────────────────────────

  await prisma.timelineEvent.createMany({
    data: [
      {
        caseId: case0412.id,
        timestamp: created0412,
        action: "Case Registered",
        actor: "System",
        designation: "System",
        remark: "Case registered via Student Grievance Portal.",
      },
      {
        caseId: case0412.id,
        timestamp: new Date("2026-10-16T10:00:00.000Z"),
        action: "Assigned to Officer",
        actor: "Anita Ramanathan",
        designation: "Section Officer",
        remark: "Case assigned for review.",
      },
      {
        caseId: case0412.id,
        timestamp: new Date("2026-10-17T14:30:00.000Z"),
        action: "Document Request Sent",
        actor: "Anita Ramanathan",
        designation: "Section Officer",
        remark: "Institution Response.pdf requested from institution. Status: MISSING.",
      },
      {
        caseId: case0412.id,
        timestamp: new Date("2026-10-18T09:00:00.000Z"),
        action: "CaseLens Analysis Completed",
        actor: "CaseLens System",
        designation: "System",
        remark:
          "Related cases identified: AICTE/RB/2026/0198 (87%), AICTE/PGRC/2026/0387 (73%). Cross-bureau conflict detected with AICTE/RB/2026/0198.",
      },
    ],
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        caseId: case0198.id,
        timestamp: created0198,
        action: "Case Registered",
        actor: "System",
        designation: "System",
        remark: "Case registered from regulatory inspection report.",
      },
      {
        caseId: case0198.id,
        timestamp: new Date("2026-10-05T11:00:00.000Z"),
        action: "Assigned to Officer",
        actor: "R. Karthik",
        designation: "Deputy Director",
        remark: "Case assigned for regulatory review.",
      },
      {
        caseId: case0198.id,
        timestamp: new Date("2026-10-12T16:00:00.000Z"),
        action: "Action Proposed",
        actor: "R. Karthik",
        designation: "Deputy Director",
        remark: "Approval restriction proposed pending compliance review.",
      },
    ],
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        caseId: case0387.id,
        timestamp: created0387,
        action: "Case Registered",
        actor: "System",
        designation: "System",
        remark: "Case registered via Student Grievance Portal.",
      },
      {
        caseId: case0387.id,
        timestamp: new Date("2026-06-20T10:00:00.000Z"),
        action: "Case Resolved",
        actor: "Anita Ramanathan",
        designation: "Section Officer",
        remark: "Institution agreed to reimburse excess fees. Case resolved.",
      },
    ],
  });

  // ─── CaseLens Relationship Scoring ───────────────────────────────────────────

  const cs0412 = {
    id: case0412.id,
    caseNumber: case0412.caseNumber,
    institutionId: case0412.institutionId,
    bureau: case0412.bureau,
    category: case0412.category,
    description: case0412.description,
    status: case0412.status,
    actionType: case0412.actionType,
    proposedAction: case0412.proposedAction,
    createdAt: created0412,
  };

  const cs0198 = {
    id: case0198.id,
    caseNumber: case0198.caseNumber,
    institutionId: case0198.institutionId,
    bureau: case0198.bureau,
    category: case0198.category,
    description: case0198.description,
    status: case0198.status,
    actionType: case0198.actionType,
    proposedAction: case0198.proposedAction,
    createdAt: created0198,
  };

  const cs0387 = {
    id: case0387.id,
    caseNumber: case0387.caseNumber,
    institutionId: case0387.institutionId,
    bureau: case0387.bureau,
    category: case0387.category,
    description: case0387.description,
    status: case0387.status,
    actionType: case0387.actionType,
    proposedAction: case0387.proposedAction,
    createdAt: created0387,
  };

  const score0412_0198 = calculateScore(cs0412, cs0198);
  const score0412_0387 = calculateScore(cs0412, cs0387);

  console.log("\n=== Score Breakdowns ===");
  console.log("0412 ↔ 0198:");
  console.log(`  Institution:     ${score0412_0198.institutionScore}`);
  console.log(`  Category/Domain: ${score0412_0198.categoryScore}`);
  console.log(`  Keywords:        ${score0412_0198.keywordScore}`);
  console.log(`  Timeline:        ${score0412_0198.timelineScore}`);
  console.log(`  Total:           ${score0412_0198.total}`);

  console.log("0412 ↔ 0387:");
  console.log(`  Institution:     ${score0412_0387.institutionScore}`);
  console.log(`  Category/Domain: ${score0412_0387.categoryScore}`);
  console.log(`  Keywords:        ${score0412_0387.keywordScore}`);
  console.log(`  Timeline:        ${score0412_0387.timelineScore}`);
  console.log(`  Total:           ${score0412_0387.total}`);

  // ─── Assertions ───────────────────────────────────────────────────────────────

  console.log("\n=== Assertions ===");
  let failed = false;

  if (score0412_0198.total !== 87) {
    console.error(`FAIL: 0412 ↔ 0198 expected 87, got ${score0412_0198.total}`);
    console.error(`  inst=${score0412_0198.institutionScore} cat=${score0412_0198.categoryScore} kw=${score0412_0198.keywordScore} tl=${score0412_0198.timelineScore}`);
    failed = true;
  } else {
    console.log("PASS: 0412 ↔ 0198 = 87");
  }

  if (score0412_0387.total !== 73) {
    console.error(`FAIL: 0412 ↔ 0387 expected 73, got ${score0412_0387.total}`);
    console.error(`  inst=${score0412_0387.institutionScore} cat=${score0412_0387.categoryScore} kw=${score0412_0387.keywordScore} tl=${score0412_0387.timelineScore}`);
    failed = true;
  } else {
    console.log("PASS: 0412 ↔ 0387 = 73");
  }

  if (failed) {
    await prisma.$disconnect();
    process.exit(1);
  }

  // Store relationships in DB
  await prisma.caseRelationship.create({
    data: {
      caseAId: case0412.id,
      caseBId: case0198.id,
      confidence: score0412_0198.total,
      institutionScore: score0412_0198.institutionScore,
      categoryScore: score0412_0198.categoryScore,
      keywordScore: score0412_0198.keywordScore,
      timelineScore: score0412_0198.timelineScore,
      relationshipType: "CROSS_BUREAU",
      conflictType: "ACTION_CONFLICT",
      recommendation:
        "Coordinate with the Regulatory Bureau before disposing this case because the proposed refund direction and approval restriction may affect the same institutional compliance issue.",
    },
  });

  await prisma.caseRelationship.create({
    data: {
      caseAId: case0412.id,
      caseBId: case0387.id,
      confidence: score0412_0387.total,
      institutionScore: score0412_0387.institutionScore,
      categoryScore: score0412_0387.categoryScore,
      keywordScore: score0412_0387.keywordScore,
      timelineScore: score0412_0387.timelineScore,
      relationshipType: "SAME_BUREAU",
      conflictType: "NO_CONFLICT",
      recommendation:
        "This case is related to a previously resolved case handled by PGRC. Review the prior resolution before proceeding.",
    },
  });

  console.log("\nRelationships stored.");
  console.log("\n=== Seed complete. All assertions passed. ===");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
