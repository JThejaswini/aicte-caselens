import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowRight, Loader } from 'lucide-react';
import { api, Institution, ComplaintAnalysis, ComplaintMatch } from '../api';
import {
  ErrorPanel,
  StatusBadge,
  Card,
  CardHeader,
  CardBody,
  Button,
} from '../components/ui';

const DEMO_INSTITUTION_ID_KEY = 'caselens_demo_inst_id';
const DEMO_DESCRIPTION =
  "Students report collection of fees inconsistent with the institution's approved fee structure.";

type AnalysisState = 'idle' | 'step1' | 'step2' | 'step3' | 'done' | 'error';

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [category, setCategory] = useState('Fee Complaint');
  const [description, setDescription] = useState(DEMO_DESCRIPTION);
  const [source, setSource] = useState('Student Grievance Portal');
  const [priority, setPriority] = useState('High');

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  const [actionState, setActionState] = useState<
    null | 'creating' | 'created' | 'linking' | 'linked' | 'error'
  >(null);
  const [actionError, setActionError] = useState('');
  const [createdCase, setCreatedCase] = useState<any>(null);
  const [linkedTo, setLinkedTo] = useState<string | null>(null);

  useEffect(() => {
    api.getInstitutions().then((insts) => {
      setInstitutions(insts);
      // Pre-select the demo institution
      const demo = insts.find((i) => i.aictePermanentId === '1-789456123');
      if (demo) setSelectedInstitution(demo);
    });
  }, []);

  const runAnalysis = async () => {
    if (!selectedInstitution) { setAnalysisError('Please select an institution.'); return; }
    if (!description.trim()) { setAnalysisError('Please enter a description.'); return; }
    setAnalysisError('');
    setAnalysis(null);
    setAnalysisState('step1');

    await sleep(600);
    setAnalysisState('step2');
    await sleep(500);
    setAnalysisState('step3');

    try {
      const result = await api.analyzeComplaint({
        institutionId: selectedInstitution.id,
        category,
        description,
      });
      await sleep(400);
      setAnalysis(result);
      setAnalysisState('done');
    } catch (err: any) {
      setAnalysisState('error');
      setAnalysisError(err.error || 'Analysis failed. Please try again.');
    }
  };

  const handleCreateNew = async () => {
    if (!selectedInstitution) return;
    setActionState('creating');
    setActionError('');
    try {
      const res = await api.createComplaint({
        institutionId: selectedInstitution.id,
        category,
        description,
        priority,
        source,
      });
      setCreatedCase(res.case);
      setActionState('created');
    } catch (err: any) {
      setActionError(err.error || 'Failed to create case.');
      setActionState('error');
    }
  };

  const handleLinkExisting = async (match: ComplaintMatch) => {
    if (!createdCase) {
      // Create first, then link
      setActionState('creating');
      try {
        const res = await api.createComplaint({
          institutionId: selectedInstitution!.id,
          category,
          description,
          priority,
          source,
        });
        setCreatedCase(res.case);
        await doLink(res.case.id, match.relatedCase.id, match.relatedCase.caseNumber);
      } catch (err: any) {
        setActionError(err.error || 'Failed.');
        setActionState('error');
      }
    } else {
      await doLink(createdCase.id, match.relatedCase.id, match.relatedCase.caseNumber);
    }
  };

  const doLink = async (sourceId: string, targetId: string, targetCaseNumber: string) => {
    setActionState('linking');
    try {
      await api.linkCase(sourceId, targetId);
      setLinkedTo(targetCaseNumber);
      setActionState('linked');
    } catch (err: any) {
      setActionError(err.error || 'Failed to link case.');
      setActionState('error');
    }
  };

  const topMatch = analysis?.matches[0];
  const secondMatch = analysis?.matches[1];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-base font-semibold text-gray-900">New Complaint → CaseLens</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Register a new complaint and run CaseLens analysis to identify existing related cases.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Complaint Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Institution */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Institution</label>
            <select
              value={selectedInstitution?.id ?? ''}
              onChange={(e) => {
                const inst = institutions.find((i) => i.id === e.target.value);
                setSelectedInstitution(inst ?? null);
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="">— Select institution —</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {selectedInstitution && (
              <div className="text-[11px] text-gray-500 mt-1">
                AICTE ID: {selectedInstitution.aictePermanentId} · {selectedInstitution.district}, {selectedInstitution.state}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option>Fee Complaint</option>
              <option>Regulatory Compliance</option>
              <option>Approval Issue</option>
              <option>Faculty Complaint</option>
              <option>Infrastructure Complaint</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Source */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option>Student Grievance Portal</option>
                <option>Email</option>
                <option>Physical Letter</option>
                <option>AICTE Portal</option>
                <option>Inspection Report</option>
              </select>
            </div>
            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          {analysisError && <ErrorPanel message={analysisError} />}

          <Button
            variant="primary"
            onClick={runAnalysis}
            disabled={analysisState === 'step1' || analysisState === 'step2' || analysisState === 'step3'}
            className="w-full justify-center py-2"
          >
            {analysisState === 'idle' || analysisState === 'done' || analysisState === 'error'
              ? 'Analyze with CaseLens'
              : 'Analyzing...'}
          </Button>
        </CardBody>
      </Card>

      {/* Analysis progress */}
      {(analysisState !== 'idle') && (
        <Card>
          <CardHeader>
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">CaseLens Analysis</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <AnalysisStep
              done={['step2', 'step3', 'done', 'error'].includes(analysisState)}
              active={analysisState === 'step1'}
              text="Institution identified"
            />
            <AnalysisStep
              done={['step3', 'done', 'error'].includes(analysisState)}
              active={analysisState === 'step2'}
              text="Existing cases retrieved"
            />
            <AnalysisStep
              done={['done', 'error'].includes(analysisState)}
              active={analysisState === 'step3'}
              text="Potential relationships analyzed"
            />
          </CardBody>
        </Card>
      )}

      {/* Results */}
      {analysisState === 'done' && analysis && (
        <>
          {analysis.matches.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-gray-500">No related cases found for this complaint.</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Potential Related Cases — {analysis.matches.length} found
                </h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {analysis.matches.map((match, idx) => (
                  <MatchCard
                    key={match.relatedCase.id}
                    match={match}
                    rank={idx + 1}
                    onLink={() => handleLinkExisting(match)}
                    onReview={() => navigate(`/cases/${match.relatedCase.id}/caselens`)}
                    actionState={actionState}
                  />
                ))}
              </CardBody>
            </Card>
          )}

          {/* Action buttons */}
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {actionState === 'created' && createdCase ? (
                <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-1">
                    <CheckCircle size={14} /> Case Created Successfully
                  </div>
                  <div className="text-xs text-green-700 mb-0.5">
                    Case Number: <span className="font-mono font-bold">{createdCase.caseNumber}</span>
                  </div>
                  <div className="text-xs text-green-600">CaseLens monitoring enabled.</div>
                  <button
                    onClick={() => navigate(`/cases/${createdCase.id}`)}
                    className="mt-2 flex items-center gap-1 text-xs text-green-700 font-medium hover:underline"
                  >
                    Open Case <ArrowRight size={11} />
                  </button>
                </div>
              ) : actionState === 'linked' ? (
                <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-1">
                    <CheckCircle size={14} /> Case Linked Successfully
                  </div>
                  <div className="text-xs text-green-700 mb-0.5">
                    Linked to: <span className="font-mono font-bold">{linkedTo}</span>
                  </div>
                  <div className="text-xs text-green-600">CaseLens monitoring enabled.</div>
                </div>
              ) : actionState === 'error' ? (
                <ErrorPanel message={actionError} />
              ) : (
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="primary"
                    onClick={handleCreateNew}
                    disabled={actionState === 'creating'}
                    className="flex-1 justify-center"
                  >
                    {actionState === 'creating' ? 'Creating...' : 'Create New Case'}
                  </Button>
                  {topMatch && (
                    <Button
                      variant="secondary"
                      onClick={() => handleLinkExisting(topMatch)}
                      disabled={actionState === 'linking'}
                      className="flex-1 justify-center"
                    >
                      {actionState === 'linking' ? 'Linking...' : 'Link to Existing Case'}
                    </Button>
                  )}
                  {topMatch && (
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/cases/${topMatch.relatedCase.id}/caselens`)}
                      className="flex-1 justify-center"
                    >
                      Review Related Cases
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function AnalysisStep({ done, active, text }: { done: boolean; active: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-green-700' : active ? 'text-amber-600' : 'text-gray-400'}`}>
      {done ? (
        <CheckCircle size={14} className="shrink-0" />
      ) : active ? (
        <Loader size={14} className="animate-spin shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
      )}
      {text}
    </div>
  );
}

function MatchCard({
  match,
  rank,
  onLink,
  onReview,
  actionState,
}: {
  match: ComplaintMatch;
  rank: number;
  onLink: () => void;
  onReview: () => void;
  actionState: any;
}) {
  const isConflict = match.conflictType === 'ACTION_CONFLICT';
  return (
    <div className={`border rounded-md p-3 ${isConflict ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-gray-400 font-medium">#{rank}</span>
            <span className="font-mono text-xs font-bold text-navy-700">{match.relatedCase.caseNumber}</span>
            <StatusBadge status={match.relatedCase.status} />
            {isConflict && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
                <AlertTriangle size={10} /> Conflict
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-600">
            {match.relatedCase.bureau} · {match.relatedCase.category}
          </div>
          {match.relatedCase.proposedAction && (
            <div className="text-[11px] text-gray-500 mt-0.5 italic">
              Action: {match.relatedCase.proposedAction}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <ConfidencePill value={match.breakdown.institutionScore} label="Institution" />
            <ConfidencePill value={match.breakdown.categoryScore} label="Domain" />
            <ConfidencePill value={match.breakdown.keywordScore} label="Keywords" />
            <ConfidencePill value={match.breakdown.timelineScore} label="Timeline" />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${match.confidence >= 80 ? 'text-red-600' : 'text-amber-600'}`}>
            {match.confidence}%
          </div>
          <div className="text-[10px] text-gray-500">Confidence</div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={onLink}
          disabled={!!actionState}
          className="text-[11px] text-navy-600 hover:underline disabled:opacity-50"
        >
          Link to this case
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={onReview}
          className="text-[11px] text-teal-600 hover:underline flex items-center gap-0.5"
        >
          Review CaseLens <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

function ConfidencePill({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  return (
    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
      {label}: {value}
    </span>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
