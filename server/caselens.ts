/**
 * CaseLens Scoring Service
 * Deterministic, rule-based relationship scoring.
 * No LLM, no external APIs, no random values.
 */

export type ActionType =
  | "REFUND_DIRECTION"
  | "APPROVAL_RESTRICTION"
  | "DOCUMENT_REQUEST"
  | "NONE";

export type ConflictType =
  | "ACTION_CONFLICT"
  | "NO_CONFLICT";

export type CoordinationStatus =
  | "AWAITING_ACKNOWLEDGEMENT"
  | "ACKNOWLEDGED"
  | "REJECTED";

export type CaseStatus =
  | "Open"
  | "Under Review"
  | "Action Proposed"
  | "Resolved"
  | "Closed"
  | "Disposed";

// ─── Domain Groups ───────────────────────────────────────────────────────────

const DOMAIN_GROUPS: Record<string, string> = {
  "Fee Complaint": "FEE_REGULATORY",
  "Regulatory Compliance": "FEE_REGULATORY",
  "Approval Issue": "APPROVAL",
  "Faculty Complaint": "FACULTY",
  "Infrastructure Complaint": "INFRASTRUCTURE",
};

function getDomain(category: string): string {
  return DOMAIN_GROUPS[category] ?? "OTHER";
}

// ─── Stopwords ───────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "a", "an", "is", "in", "on", "at", "to", "for", "of", "and",
  "or", "but", "not", "this", "that", "with", "from", "by", "as", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "shall",
  "its", "their", "our", "your", "my", "his", "her", "we", "they", "it",
  "he", "she", "who", "which", "what", "how", "when", "where", "why",
  "no", "yes", "all", "any", "some", "such", "than", "then", "also",
  "so", "if", "about", "into", "through", "during", "before", "after",
  "above", "below", "between", "each", "further", "once", "more", "can",
]);

// ─── Tokenize ─────────────────────────────────────────────────────────────────

export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return new Set(tokens);
}

// ─── Jaccard Similarity ──────────────────────────────────────────────────────

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ─── Score Components ─────────────────────────────────────────────────────────

function scoreInstitution(instAId: string, instBId: string): number {
  return instAId === instBId ? 40 : 0;
}

function scoreCategory(catA: string, catB: string): number {
  const domainA = getDomain(catA);
  const domainB = getDomain(catB);
  return domainA === domainB && domainA !== "OTHER" ? 25 : 0;
}

function scoreKeywords(descA: string, descB: string): number {
  const tokensA = tokenize(descA);
  const tokensB = tokenize(descB);
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  return Math.round(20 * jaccard);
}

function scoreTimeline(dateA: Date | null, dateB: Date | null): number {
  if (!dateA || !dateB) return 0;
  const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 15;
  if (diffDays <= 14) return 10;
  if (diffDays <= 30) return 5;
  return 0;
}

// ─── Score Breakdown ──────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  institutionScore: number;
  categoryScore: number;
  keywordScore: number;
  timelineScore: number;
  total: number;
}

export function calculateScore(
  caseA: {
    institutionId: string;
    category: string;
    description: string;
    createdAt: Date;
  },
  caseB: {
    institutionId: string;
    category: string;
    description: string;
    createdAt: Date;
  }
): ScoreBreakdown {
  const institutionScore = scoreInstitution(caseA.institutionId, caseB.institutionId);
  const categoryScore = scoreCategory(caseA.category, caseB.category);
  const keywordScore = scoreKeywords(caseA.description, caseB.description);
  const timelineScore = scoreTimeline(caseA.createdAt, caseB.createdAt);
  const total = institutionScore + categoryScore + keywordScore + timelineScore;
  return { institutionScore, categoryScore, keywordScore, timelineScore, total };
}

// ─── Conflict Matrix ──────────────────────────────────────────────────────────

const CONFLICT_PAIRS: Array<[ActionType, ActionType]> = [
  ["REFUND_DIRECTION", "APPROVAL_RESTRICTION"],
  ["APPROVAL_RESTRICTION", "REFUND_DIRECTION"],
];

function isConflictingPair(a: ActionType, b: ActionType): boolean {
  return CONFLICT_PAIRS.some(([x, y]) => x === a && y === b);
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  institutionId: string;
  bureau: string;
  category: string;
  description: string;
  status: string;
  actionType: string;
  proposedAction: string;
  createdAt: Date;
}

export interface RelationshipResult {
  relatedCase: CaseSummary;
  score: ScoreBreakdown;
  conflictType: ConflictType;
  recommendation: string;
}

function isActiveCaseStatus(status: string): boolean {
  const inactive = ["Resolved", "Closed", "Disposed"];
  return !inactive.includes(status);
}

function generateRecommendation(
  mainCase: CaseSummary,
  relatedCase: CaseSummary,
  conflictType: ConflictType
): string {
  if (conflictType === "ACTION_CONFLICT") {
    return `Coordinate with the ${relatedCase.bureau} before disposing this case because the proposed ${describeAction(mainCase.actionType)} and ${describeAction(relatedCase.actionType)} may affect the same institutional compliance issue.`;
  }
  if (relatedCase.status === "Resolved" || relatedCase.status === "Closed" || relatedCase.status === "Disposed") {
    return `This case is related to a previously resolved case handled by ${relatedCase.bureau}. Review the prior resolution before proceeding.`;
  }
  return `This case shares domain and institutional context with an active case at ${relatedCase.bureau}. Consider coordinating before independent disposal.`;
}

function describeAction(actionType: string): string {
  switch (actionType) {
    case "REFUND_DIRECTION": return "refund direction";
    case "APPROVAL_RESTRICTION": return "approval restriction";
    case "DOCUMENT_REQUEST": return "document request";
    default: return "proposed action";
  }
}

export function analyzeRelationships(
  mainCase: CaseSummary,
  allCases: CaseSummary[]
): RelationshipResult[] {
  const results: RelationshipResult[] = [];

  for (const other of allCases) {
    if (other.id === mainCase.id) continue;

    const score = calculateScore(mainCase, other);
    if (score.total < 40) continue; // Only include meaningful relationships

    // Conflict requires: same institution, both active, different bureaus, conflicting action types
    const bothActive = isActiveCaseStatus(mainCase.status) && isActiveCaseStatus(other.status);
    const differentBureau = mainCase.bureau !== other.bureau;
    const actionConflict = isConflictingPair(
      mainCase.actionType as ActionType,
      other.actionType as ActionType
    );

    const conflictType: ConflictType =
      bothActive && differentBureau && actionConflict ? "ACTION_CONFLICT" : "NO_CONFLICT";

    const recommendation = generateRecommendation(mainCase, other, conflictType);

    results.push({
      relatedCase: other,
      score,
      conflictType,
      recommendation,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score.total - a.score.total);
  return results;
}

// ─── New Complaint Analysis ───────────────────────────────────────────────────

export interface ComplaintInput {
  institutionId: string;
  category: string;
  description: string;
  createdAt: Date;
}

export function analyzeComplaint(
  complaint: ComplaintInput,
  allCases: CaseSummary[]
): RelationshipResult[] {
  const pseudoCase: CaseSummary = {
    id: "__new__",
    caseNumber: "NEW",
    institutionId: complaint.institutionId,
    bureau: "PGRC",
    category: complaint.category,
    description: complaint.description,
    status: "Open",
    actionType: "NONE",
    proposedAction: "",
    createdAt: complaint.createdAt,
  };

  return analyzeRelationships(pseudoCase, allCases);
}
