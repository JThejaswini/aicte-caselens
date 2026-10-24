// Centralized API client for AICTE CaseLens

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Institution {
  id: string;
  aictePermanentId: string;
  name: string;
  type: string;
  state: string;
  district: string;
  approvalStatus: string;
  attentionLevel: string;
  createdAt: string;
  _count?: { cases: number };
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  type: string;
  status: string;
  uploadedAt: string;
}

export interface CoordinationRequest {
  id: string;
  caseId: string;
  relatedCaseId: string;
  fromBureau: string;
  toBureau: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  institutionId: string;
  bureau: string;
  category: string;
  description: string;
  displayDescription: string;
  priority: string;
  status: string;
  assignedOfficer: string;
  officerDesignation: string;
  proposedAction: string;
  actionType: string;
  expectedDisposalDate: string | null;
  createdAt: string;
  isOverdue?: boolean;
  documents?: Document[];
  coordinationsFrom?: CoordinationRequest[];
  institution?: Institution;
}

export interface InstitutionDetail extends Institution {
  cases: Case[];
  stats: {
    totalCases: number;
    openCases: number;
    relatedCases: number;
    bureausInvolved: number;
  };
  bureaus: string[];
  hasActiveConflict: boolean;
  conflictPairs: Array<{ caseA: string; caseB: string }>;
}

export interface ScoreBreakdown {
  institutionScore: number;
  categoryScore: number;
  keywordScore: number;
  timelineScore: number;
  total: number;
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
  createdAt: string;
}

export interface Relationship {
  relatedCase: CaseSummary;
  confidence: number;
  breakdown: ScoreBreakdown;
  conflictType: 'ACTION_CONFLICT' | 'NO_CONFLICT';
  recommendation: string;
}

export interface CaseLensResult {
  mainCase: Case;
  relationships: Relationship[];
  hasActiveConflict: boolean;
  conflictBlocked: boolean;
  activeCoordination: CoordinationRequest | null;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  action: string;
  actor: string;
  designation: string;
  remark: string;
}

export interface ComplaintMatch {
  relatedCase: CaseSummary;
  confidence: number;
  breakdown: ScoreBreakdown;
  conflictType: string;
  recommendation: string;
}

export interface ComplaintAnalysis {
  institution: Institution;
  matches: ComplaintMatch[];
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Institutions
  getInstitutions: () => request<Institution[]>('/institutions'),
  getInstitution: (id: string) => request<InstitutionDetail>(`/institutions/${id}`),
  getInstitutionCases: (id: string) => request<Case[]>(`/institutions/${id}/cases`),

  // Cases
  getCase: (id: string) => request<Case>(`/cases/${id}`),
  getCaseTimeline: (id: string) => request<TimelineEvent[]>(`/cases/${id}/timeline`),
  getCaseLens: (id: string) => request<CaseLensResult>(`/cases/${id}/caselens`),

  // Coordination
  sendCoordination: (id: string) =>
    request<{ success: boolean; coordination: CoordinationRequest }>(`/cases/${id}/coordination`, {
      method: 'POST',
    }),
  acknowledgeCoordination: (id: string) =>
    request<{ success: boolean; coordination: CoordinationRequest }>(
      `/cases/${id}/coordination/acknowledge`,
      { method: 'POST' }
    ),

  // Disposal
  disposeCase: (id: string) =>
    request<{ success: boolean; case: Case }>(`/cases/${id}/dispose`, { method: 'POST' }),
  overrideDispose: (id: string, reason: string, actor: string) =>
    request<{ success: boolean; case: Case }>(`/cases/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({ reason, actor }),
    }),

  // Complaints
  analyzeComplaint: (payload: {
    institutionId: string;
    category: string;
    description: string;
  }) =>
    request<ComplaintAnalysis>('/complaints/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createComplaint: (payload: {
    institutionId: string;
    category: string;
    description: string;
    priority: string;
    source: string;
  }) =>
    request<{ success: boolean; case: Case; alreadyExisted?: boolean }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  linkCase: (sourceId: string, targetCaseId: string) =>
    request<{ success: boolean; relationship: unknown; alreadyLinked?: boolean }>(
      `/cases/${sourceId}/link`,
      { method: 'POST', body: JSON.stringify({ targetCaseId }) }
    ),
};
