import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  FileText,
  Clock,
  ChevronRight,
  XCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { api, Case, TimelineEvent, CaseLensResult } from '../api';
import {
  LoadingSpinner,
  ErrorPanel,
  StatusBadge,
  PriorityBadge,
  Card,
  CardHeader,
  CardBody,
  FieldRow,
  Button,
} from '../components/ui';
import Timeline from '../components/Timeline';
import DisposalGuard from '../components/DisposalGuard';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [caseLens, setCaseLens] = useState<CaseLensResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDisposalGuard, setShowDisposalGuard] = useState(false);
  const [disposeSuccess, setDisposeSuccess] = useState(false);

  const loadData = () => {
    if (!id) return;
    Promise.all([api.getCase(id), api.getCaseTimeline(id), api.getCaseLens(id)])
      .then(([c, tl, cl]) => {
        setCaseData(c);
        setTimeline(tl);
        setCaseLens(cl);
      })
      .catch(() => setError('Failed to load case data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleDisposeClick = () => {
    if (!caseData || !id) return;
    if (caseLens?.conflictBlocked) {
      setShowDisposalGuard(true);
    } else {
      // Try dispose directly
      api.disposeCase(id).then(() => {
        setDisposeSuccess(true);
        loadData();
      }).catch((err) => {
        if (err.error === 'CONFLICT_BLOCKED') {
          setShowDisposalGuard(true);
        } else {
          alert(err.error || 'Disposal failed');
        }
      });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorPanel message={error} />;
  if (!caseData) return null;

  const isActive = !['Resolved', 'Closed', 'Disposed'].includes(caseData.status);
  const hasConflict = caseLens?.hasActiveConflict ?? false;
  const conflictBlocked = caseLens?.conflictBlocked ?? false;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <button onClick={() => navigate(-1)} className="hover:text-gray-800 flex items-center gap-1">
          <ArrowLeft size={11} /> Back
        </button>
        <ChevronRight size={10} />
        <span className="text-gray-400">Case</span>
        <ChevronRight size={10} />
        <span className="text-gray-700 font-medium">{caseData.caseNumber}</span>
      </div>

      {/* Case Header */}
      <div className="bg-white border border-gray-200 rounded-md px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-base font-bold text-navy-800">{caseData.caseNumber}</span>
              <StatusBadge status={caseData.status} />
              <PriorityBadge priority={caseData.priority} />
              {caseData.isOverdue && isActive && (
                <span className="text-xs text-red-600 font-semibold border border-red-300 bg-red-50 px-1.5 py-0.5 rounded">
                  OVERDUE
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {caseData.institution?.name ?? ''}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Bureau: {caseData.bureau} · Category: {caseData.category}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => navigate(`/cases/${id}/caselens`)}
            >
              Open CaseLens
            </Button>
            {disposeSuccess ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={12} /> Disposed
              </span>
            ) : isActive ? (
              <Button
                variant={conflictBlocked ? 'danger' : 'primary'}
                onClick={handleDisposeClick}
              >
                {conflictBlocked && <AlertTriangle size={12} />}
                Dispose Case
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* CaseLens Warning */}
      {hasConflict && isActive && (
        <div className="bg-amber-50 border border-amber-300 rounded-md px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">CaseLens: Potential Cross-Bureau Conflict Detected</div>
              <div className="text-xs text-amber-700 mt-0.5">
                {conflictBlocked
                  ? 'Independent disposal is currently blocked. Coordination with the related bureau is required.'
                  : caseLens?.activeCoordination?.status === 'ACKNOWLEDGED'
                  ? 'Coordination has been acknowledged. Disposal may now proceed.'
                  : 'A related case with potentially conflicting actions exists.'}
              </div>
            </div>
            <Link
              to={`/cases/${id}/caselens`}
              className="text-xs text-amber-700 font-medium hover:text-amber-900 shrink-0 flex items-center gap-1"
            >
              View CaseLens <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Case Details */}
        <div className="col-span-2 space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Case Information</h2>
            </CardHeader>
            <CardBody>
              <FieldRow label="Case Number" value={<span className="font-mono font-medium">{caseData.caseNumber}</span>} />
              <FieldRow label="Bureau / Cell" value={caseData.bureau} />
              <FieldRow label="Category" value={caseData.category} />
              <FieldRow label="Priority" value={<PriorityBadge priority={caseData.priority} />} />
              <FieldRow label="Status" value={<StatusBadge status={caseData.status} />} />
              <FieldRow label="Assigned Officer" value={caseData.assignedOfficer} />
              <FieldRow label="Designation" value={caseData.officerDesignation} />
              <FieldRow
                label="Expected Disposal"
                value={
                  <span className={caseData.isOverdue && isActive ? 'text-red-600 font-medium' : ''}>
                    {formatDate(caseData.expectedDisposalDate)}
                    {caseData.isOverdue && isActive && ' (Overdue)'}
                  </span>
                }
              />
              <FieldRow label="Registered On" value={formatDate(caseData.createdAt)} />
            </CardBody>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Complaint Summary</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-700 leading-relaxed">
                {caseData.displayDescription || caseData.description}
              </p>
            </CardBody>
          </Card>

          {/* Proposed Action */}
          {caseData.proposedAction && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Proposed Action</h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-700">{caseData.proposedAction}</p>
                <div className="mt-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Action Type: </span>
                  <span className="text-[11px] text-gray-700 font-medium">{caseData.actionType.replace('_', ' ')}</span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Documents</h2>
            </CardHeader>
            <CardBody className="p-0">
              {caseData.documents && caseData.documents.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Document</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {caseData.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-4 py-2.5 flex items-center gap-2">
                          <FileText size={12} className="text-gray-400 shrink-0" />
                          <span className="text-gray-700">{doc.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{doc.type}</td>
                        <td className="px-4 py-2.5">
                          {doc.status === 'MISSING' ? (
                            <span className="flex items-center gap-1 text-red-600 font-semibold">
                              <XCircle size={11} /> MISSING
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={11} /> {doc.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">No documents attached.</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={11} /> Action Timeline
              </h2>
            </CardHeader>
            <CardBody>
              <Timeline events={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Disposal Guard Modal */}
      {showDisposalGuard && id && caseLens && (
        <DisposalGuard
          caseId={id}
          caseLens={caseLens}
          onClose={() => setShowDisposalGuard(false)}
          onSuccess={() => {
            setShowDisposalGuard(false);
            setDisposeSuccess(true);
            loadData();
          }}
          onCoordinationSent={() => {
            setShowDisposalGuard(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
