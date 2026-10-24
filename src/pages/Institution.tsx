import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  FileText,
  Users,
  ArrowRight,
} from 'lucide-react';
import { api, InstitutionDetail, Case } from '../api';
import { LoadingSpinner, ErrorPanel, StatusBadge, PriorityBadge, StatBox, Card, CardHeader, CardBody } from '../components/ui';
import Timeline from '../components/Timeline';
import type { TimelineEvent } from '../api';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AttentionBadge({ level }: { level: string }) {
  if (level === 'High')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle size={10} /> Attention: {level}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
      Attention: {level}
    </span>
  );
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InstitutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelines, setTimelines] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getInstitution(id)
      .then((d) => {
        setData(d);
        // Load timelines for all cases
        Promise.all(d.cases.map((c) => api.getCaseTimeline(c.id)))
          .then((allEvents) => {
            const flat = allEvents.flat().sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setTimelines(flat);
          });
      })
      .catch(() => setError('Failed to load institution data.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorPanel message={error} />;
  if (!data) return null;

  // Find the main conflict case (0412) for the Review link
  const conflictCase = data.conflictPairs[0];
  const conflictCaseObj = conflictCase
    ? data.cases.find((c) => c.caseNumber === conflictCase.caseA)
    : null;

  return (
    <div className="space-y-4">
      {/* Institution Header */}
      <div className="bg-white border border-gray-200 rounded-md px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-navy-50 border border-navy-200 rounded flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-navy-700" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">{data.name}</h1>
              <div className="text-xs text-gray-500 mt-0.5">
                AICTE Permanent ID: {data.aictePermanentId}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} />
                  {data.district}, {data.state}
                </span>
                <span className="text-xs text-gray-500">{data.type}</span>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle size={11} />
                  Approval: {data.approvalStatus}
                </span>
                <AttentionBadge level={data.attentionLevel} />
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/complaints/new')}
            className="text-xs border border-navy-300 text-navy-700 px-3 py-1.5 rounded hover:bg-navy-50 transition-colors shrink-0"
          >
            + New Complaint
          </button>
        </div>
      </div>

      {/* Cross-Bureau Conflict Banner */}
      {data.hasActiveConflict && (
        <div className="bg-red-50 border border-red-300 rounded-md px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-800">Cross-Bureau Conflict Detected</div>
              <div className="text-xs text-red-700 mt-0.5">
                {data.conflictPairs.length > 0
                  ? `${data.conflictPairs.length * 2} active cases across different bureaus have potentially conflicting proposed actions.`
                  : '2 active cases across different bureaus have potentially conflicting proposed actions.'}
              </div>
            </div>
            {conflictCaseObj && (
              <Link
                to={`/cases/${conflictCaseObj.id}/caselens`}
                className="flex items-center gap-1 text-xs text-red-700 font-medium hover:text-red-900 shrink-0"
              >
                Review in CaseLens <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Total Cases" value={data.stats.totalCases} />
        <StatBox label="Open Cases" value={data.stats.openCases} />
        <StatBox
          label="Related Cases"
          value={data.stats.relatedCases}
          sub="Confidence > 60%"
        />
        <StatBox label="Bureaus Involved" value={data.stats.bureausInvolved} />
      </div>

      {/* Active Bureaus */}
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Active Bureaus / Cells</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {data.bureaus.map((b) => (
              <span
                key={b}
                className="px-2.5 py-1 text-xs font-medium border border-navy-200 bg-navy-50 text-navy-700 rounded"
              >
                {b}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Cases</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Case ID</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Bureau</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Category</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Priority</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Officer</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Disposal Date</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">CaseLens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.cases.map((c) => (
                <CaseRow key={c.id} c={c} hasConflict={data.hasActiveConflict} conflictPairs={data.conflictPairs} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Institutional Timeline */}
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Institutional Action History</h2>
        </CardHeader>
        <CardBody>
          <Timeline events={timelines.slice(0, 12)} />
        </CardBody>
      </Card>
    </div>
  );
}

function CaseRow({
  c,
  hasConflict,
  conflictPairs,
}: {
  c: Case;
  hasConflict: boolean;
  conflictPairs: Array<{ caseA: string; caseB: string }>;
}) {
  const navigate = useNavigate();
  const isInConflict = conflictPairs.some(
    (p) => p.caseA === c.caseNumber || p.caseB === c.caseNumber
  );
  const isActive = !['Resolved', 'Closed', 'Disposed'].includes(c.status);

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/cases/${c.id}`)}
    >
      <td className="px-4 py-2.5">
        <span className="font-mono font-medium text-navy-700">{c.caseNumber}</span>
      </td>
      <td className="px-4 py-2.5 text-gray-600">{c.bureau}</td>
      <td className="px-4 py-2.5 text-gray-600">{c.category}</td>
      <td className="px-4 py-2.5">
        <PriorityBadge priority={c.priority} />
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={c.status} />
        {c.isOverdue && isActive && (
          <span className="ml-1 text-[10px] text-red-600 font-medium">OVERDUE</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-gray-600">{c.assignedOfficer}</td>
      <td className="px-4 py-2.5 text-gray-600">
        <span className={c.isOverdue && isActive ? 'text-red-600 font-medium' : ''}>
          {formatDate(c.expectedDisposalDate)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {isInConflict && isActive ? (
          <span
            className="flex items-center gap-1 text-red-600 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/cases/${c.id}/caselens`);
            }}
          >
            <AlertTriangle size={11} /> Conflict
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
