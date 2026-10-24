import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Send,
  RefreshCw,
} from 'lucide-react';
import { api, CaseLensResult, TimelineEvent } from '../api';
import {
  LoadingSpinner,
  ErrorPanel,
  StatusBadge,
  Card,
  CardHeader,
  CardBody,
  Button,
} from '../components/ui';
import Timeline from '../components/Timeline';

function ConfidenceBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-navy-600 h-1.5 rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-800 w-6 text-right">{value}</span>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-red-600' : score >= 60 ? 'text-amber-600' : 'text-teal-600';
  return (
    <div className={`text-4xl font-bold ${color}`}>
      {score}
      <span className="text-xl font-semibold">%</span>
    </div>
  );
}

export default function CaseLensPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseLensResult | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coordLoading, setCoordLoading] = useState(false);
  const [coordError, setCoordError] = useState('');
  const [ackLoading, setAckLoading] = useState(false);
  const [ackError, setAckError] = useState('');
  const [disposeLoading, setDisposeLoading] = useState(false);
  const [disposeSuccess, setDisposeSuccess] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getCaseLens(id), api.getCaseTimeline(id)])
      .then(([cl, tl]) => {
        setData(cl);
        setTimeline(tl);
      })
      .catch(() => setError('CaseLens analysis failed. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSendCoordination = async () => {
    if (!id) return;
    setCoordLoading(true);
    setCoordError('');
    try {
      await api.sendCoordination(id);
      await loadDataAsync();
    } catch (err: any) {
      if (err.existing) {
        await loadDataAsync();
      } else {
        setCoordError(err.error || 'Failed to send coordination request.');
      }
    } finally {
      setCoordLoading(false);
    }
  };

  const loadDataAsync = async () => {
    if (!id) return;
    const [cl, tl] = await Promise.all([api.getCaseLens(id), api.getCaseTimeline(id)]);
    setData(cl);
    setTimeline(tl);
  };

  const handleAcknowledge = async () => {
    if (!id) return;
    setAckLoading(true);
    setAckError('');
    try {
      await api.acknowledgeCoordination(id);
      await loadDataAsync();
    } catch (err: any) {
      setAckError(err.error || 'Failed to acknowledge.');
    } finally {
      setAckLoading(false);
    }
  };

  const handleDispose = async () => {
    if (!id || !data) return;
    setDisposeLoading(true);
    try {
      await api.disposeCase(id);
      setDisposeSuccess(true);
      await loadDataAsync();
    } catch (err: any) {
      alert(err.error || 'Disposal failed.');
    } finally {
      setDisposeLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!id || !data) return;
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      setOverrideError('Override reason must be at least 10 characters.');
      return;
    }
    setDisposeLoading(true);
    setOverrideError('');
    try {
      await api.overrideDispose(id, overrideReason, data.mainCase.assignedOfficer);
      setDisposeSuccess(true);
      await loadDataAsync();
    } catch (err: any) {
      setOverrideError(err.error || 'Override failed.');
    } finally {
      setDisposeLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Running CaseLens analysis..." />;
  if (error) return <ErrorPanel message={error} />;
  if (!data) return null;

  const { mainCase, relationships, hasActiveConflict, conflictBlocked, activeCoordination } = data;
  const topConflict = relationships.find((r) => r.conflictType === 'ACTION_CONFLICT');
  const topRelationship = relationships[0];
  const isActive = !['Resolved', 'Closed', 'Disposed'].includes(mainCase.status);
  const coordAwaiting = activeCoordination?.status === 'AWAITING_ACKNOWLEDGEMENT';
  const coordAcknowledged = activeCoordination?.status === 'ACKNOWLEDGED';

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <button onClick={() => navigate(-1)} className="hover:text-gray-800 flex items-center gap-1">
          <ArrowLeft size={11} /> Back
        </button>
        <ChevronRight size={10} />
        <Link to={`/cases/${id}`} className="hover:text-gray-800">{mainCase.caseNumber}</Link>
        <ChevronRight size={10} />
        <span className="text-gray-700 font-medium">CaseLens Intelligence</span>
      </div>

      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-md px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-900">CaseLens Analysis</span>
              <span className="text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
                Rule-Based Intelligence Layer
              </span>
            </div>
            <div className="text-xs font-mono text-navy-700 font-semibold">{mainCase.caseNumber}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mainCase.institution?.name}</div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Main conflict banner */}
      {hasActiveConflict && (
        <div className="bg-red-50 border border-red-400 rounded-md px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-800">Potential Cross-Bureau Conflict</div>
              <div className="text-xs text-red-700 mt-0.5">
                The proposed actions across these active cases may conflict and should be coordinated before disposal.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Main analysis (2 cols) */}
        <div className="col-span-2 space-y-4">

          {/* Relationship Visualization */}
          {topRelationship && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Relationship Visualization
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-center justify-center gap-0 py-2">
                  {/* Current case */}
                  <div className="border-2 border-navy-500 rounded-md p-3 bg-navy-50 text-center min-w-[130px]">
                    <div className="text-[9px] uppercase tracking-widest text-navy-500 font-bold mb-1">Current Case</div>
                    <div className="text-xs font-bold text-navy-800 font-mono">{mainCase.bureau} / {mainCase.caseNumber.split('/').pop()}</div>
                    <StatusBadge status={mainCase.status} />
                  </div>

                  {/* Arrow with confidence */}
                  <div className="flex flex-col items-center mx-4 relative">
                    <div className="text-xs font-bold text-gray-700 mb-1">
                      {topRelationship.confidence}%
                    </div>
                    <div className="flex items-center gap-0">
                      <div className="w-16 h-px bg-gray-400" />
                      <ArrowRight size={14} className="text-gray-500 -ml-1" />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {topRelationship.conflictType === 'ACTION_CONFLICT' ? (
                        <span className="text-red-500 font-medium">Potential Conflict</span>
                      ) : (
                        'Related'
                      )}
                    </div>
                  </div>

                  {/* Related case */}
                  <div className={`border-2 rounded-md p-3 text-center min-w-[130px] ${
                    topRelationship.conflictType === 'ACTION_CONFLICT'
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Related Case</div>
                    <div className="text-xs font-bold text-gray-800 font-mono">
                      {topRelationship.relatedCase.bureau} / {topRelationship.relatedCase.caseNumber.split('/').pop()}
                    </div>
                    <StatusBadge status={topRelationship.relatedCase.status} />
                  </div>
                </div>

                {/* All other relationships (smaller) */}
                {relationships.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Additional Relationships</div>
                    {relationships.slice(1).map((r) => (
                      <div key={r.relatedCase.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500 font-mono">{r.relatedCase.caseNumber}</span>
                        <ArrowRight size={10} className="text-gray-400" />
                        <span className="font-medium text-gray-700">{r.confidence}%</span>
                        <StatusBadge status={r.relatedCase.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Confidence Breakdown */}
          {topRelationship && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Relationship Confidence — {mainCase.caseNumber.split('/').pop()} ↔ {topRelationship.relatedCase.caseNumber.split('/').pop()}
                  </h2>
                  <ScoreCircle score={topRelationship.confidence} />
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <ConfidenceBar label="Institution" value={topRelationship.breakdown.institutionScore} total={100} />
                  <ConfidenceBar label="Category / Domain" value={topRelationship.breakdown.categoryScore} total={100} />
                  <ConfidenceBar label="Keywords" value={topRelationship.breakdown.keywordScore} total={100} />
                  <ConfidenceBar label="Timeline" value={topRelationship.breakdown.timelineScore} total={100} />
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Total Relationship Confidence</span>
                    <span className="text-sm font-bold text-gray-900">{topRelationship.confidence}%</span>
                  </div>
                </div>

                {/* Detected signals */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Detected Signals</div>
                  <div className="space-y-1">
                    {topRelationship.breakdown.institutionScore > 0 && (
                      <Signal text="Same institution — direct institutional overlap" />
                    )}
                    {topRelationship.breakdown.categoryScore > 0 && (
                      <Signal text="Same complaint domain — FEE_REGULATORY" />
                    )}
                    {topRelationship.breakdown.keywordScore > 0 && (
                      <Signal text={`Keyword overlap detected (Jaccard similarity: ${topRelationship.breakdown.keywordScore}/20)`} />
                    )}
                    {topRelationship.breakdown.timelineScore > 0 && (
                      <Signal text="Cases registered within 14 days — temporal correlation" />
                    )}
                    {topRelationship.conflictType === 'ACTION_CONFLICT' && (
                      <Signal type="conflict" text="Proposed actions are potentially conflicting across bureaus" />
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Side-by-side action comparison */}
          {topConflict && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Bureau Action Comparison
                </h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-navy-200 rounded-md p-3 bg-navy-50">
                    <div className="text-[10px] uppercase tracking-widest text-navy-500 font-semibold mb-1">
                      {mainCase.bureau}
                    </div>
                    <div className="text-xs font-mono text-navy-700 mb-2">{mainCase.caseNumber}</div>
                    <div className="text-[10px] uppercase text-gray-500 mb-1">Proposed Action:</div>
                    <div className="text-xs text-gray-700 leading-relaxed">{mainCase.proposedAction}</div>
                    <div className="mt-2 pt-2 border-t border-navy-100">
                      <span className="text-[10px] text-navy-600 font-medium bg-navy-100 px-1.5 py-0.5 rounded">
                        {mainCase.actionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="border border-red-300 rounded-md p-3 bg-red-50">
                    <div className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-1">
                      {topConflict.relatedCase.bureau}
                    </div>
                    <div className="text-xs font-mono text-gray-700 mb-2">{topConflict.relatedCase.caseNumber}</div>
                    <div className="text-[10px] uppercase text-gray-500 mb-1">Proposed Action:</div>
                    <div className="text-xs text-gray-700 leading-relaxed">{topConflict.relatedCase.proposedAction}</div>
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <span className="text-[10px] text-red-600 font-medium bg-red-100 px-1.5 py-0.5 rounded">
                        {topConflict.relatedCase.actionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conflict type */}
                <div className="mt-3 flex items-center gap-2">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-700">Conflict Type: Potential Action Conflict</span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* All Related Cases */}
          {relationships.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Related Cases</h2>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Case</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Bureau</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Proposed Action</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Confidence</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relationships.map((r) => (
                      <tr key={r.relatedCase.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <Link
                            to={`/cases/${r.relatedCase.id}`}
                            className="font-mono font-medium text-navy-700 hover:underline"
                          >
                            {r.relatedCase.caseNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{r.relatedCase.bureau}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.relatedCase.status} />
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">
                          {r.relatedCase.proposedAction || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`font-bold ${r.confidence >= 80 ? 'text-red-600' : r.confidence >= 60 ? 'text-amber-600' : 'text-gray-700'}`}>
                            {r.confidence}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.conflictType === 'ACTION_CONFLICT' ? (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <AlertTriangle size={11} /> Conflict
                            </span>
                          ) : (
                            <span className="text-gray-400">Related</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Recommendation */}
          {topRelationship && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Recommended Coordination
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-700 leading-relaxed">{topRelationship.recommendation}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right: Actions + Timeline */}
        <div className="space-y-4">

          {/* Coordination Panel */}
          {hasActiveConflict && isActive && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Coordination</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {!activeCoordination ? (
                  <>
                    <p className="text-xs text-gray-600">
                      Send a coordination request to the {topConflict?.relatedCase.bureau} before disposing this case.
                    </p>
                    {coordError && <p className="text-xs text-red-600">{coordError}</p>}
                    <Button
                      variant="primary"
                      onClick={handleSendCoordination}
                      disabled={coordLoading}
                      className="w-full justify-center"
                    >
                      <Send size={12} />
                      {coordLoading ? 'Sending...' : 'Send Coordination Request'}
                    </Button>
                  </>
                ) : coordAwaiting ? (
                  <>
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <div className="text-xs font-semibold text-orange-800 mb-1">Coordination Request Sent</div>
                      <div className="text-[11px] text-orange-700 mb-1">
                        <span className="font-medium">Recipient:</span>{' '}
                        {activeCoordination.toBureau} — Section Officer
                      </div>
                      <div className="text-[11px] text-orange-700">
                        <span className="font-medium">Status:</span> Awaiting acknowledgement
                      </div>
                    </div>

                    {/* Demo-only simulate button */}
                    <div className="border border-dashed border-gray-300 rounded p-3 bg-gray-50">
                      <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Demo Action</div>
                      {ackError && <p className="text-xs text-red-600 mb-2">{ackError}</p>}
                      <Button
                        variant="secondary"
                        onClick={handleAcknowledge}
                        disabled={ackLoading}
                        className="w-full justify-center"
                      >
                        <Clock size={11} />
                        {ackLoading ? 'Processing...' : 'Simulate RB Acknowledgement'}
                      </Button>
                    </div>
                  </>
                ) : coordAcknowledged ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800 mb-1">
                        <CheckCircle size={12} /> Coordination Acknowledged
                      </div>
                      <div className="text-[11px] text-green-700">
                        {activeCoordination.toBureau} has acknowledged the coordination request.
                        Case disposal can now proceed.
                      </div>
                    </div>
                  </>
                ) : null}
              </CardBody>
            </Card>
          )}

          {/* Dispose Panel */}
          {isActive && !disposeSuccess && (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Case Actions</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {!conflictBlocked ? (
                  <>
                    {coordAcknowledged && (
                      <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                        Coordination acknowledged. Disposal is now unlocked.
                      </div>
                    )}
                    {!overrideMode ? (
                      <Button
                        variant="primary"
                        onClick={handleDispose}
                        disabled={disposeLoading}
                        className="w-full justify-center"
                      >
                        {disposeLoading ? 'Disposing...' : 'Dispose Case'}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      Disposal blocked pending coordination.
                    </div>
                    {!overrideMode && (
                      <Button
                        variant="secondary"
                        onClick={() => setOverrideMode(true)}
                        className="w-full justify-center"
                      >
                        Override & Provide Reason
                      </Button>
                    )}
                  </>
                )}

                {/* Override form */}
                {overrideMode && (
                  <div className="space-y-2 border border-orange-200 bg-orange-50 rounded p-3">
                    <div className="text-xs font-semibold text-orange-800">Override Disposal</div>
                    <textarea
                      rows={3}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="State override reason (min 10 characters)..."
                      className="w-full px-2 py-1.5 text-xs border border-orange-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    {overrideError && <p className="text-xs text-red-600">{overrideError}</p>}
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={handleOverride} disabled={disposeLoading} className="flex-1 justify-center text-[11px]">
                        {disposeLoading ? '...' : 'Confirm Override'}
                      </Button>
                      <Button variant="ghost" onClick={() => { setOverrideMode(false); setOverrideError(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {disposeSuccess && (
            <div className="bg-green-50 border border-green-300 rounded-md px-4 py-3 flex items-center gap-2 text-sm text-green-800 font-medium">
              <CheckCircle size={14} /> Case disposed successfully.
            </div>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={11} /> Timeline
              </h2>
            </CardHeader>
            <CardBody>
              <Timeline events={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Signal({ text, type = 'info' }: { text: string; type?: 'info' | 'conflict' }) {
  return (
    <div className={`flex items-start gap-1.5 text-[11px] ${type === 'conflict' ? 'text-red-600' : 'text-gray-600'}`}>
      {type === 'conflict' ? (
        <AlertTriangle size={10} className="shrink-0 mt-0.5" />
      ) : (
        <CheckCircle size={10} className="shrink-0 mt-0.5 text-teal-500" />
      )}
      {text}
    </div>
  );
}
