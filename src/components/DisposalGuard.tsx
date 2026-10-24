import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { api, CaseLensResult } from '../api';
import { Button } from './ui';

interface Props {
  caseId: string;
  caseLens: CaseLensResult;
  onClose: () => void;
  onSuccess: () => void;
  onCoordinationSent: () => void;
}

export default function DisposalGuard({ caseId, caseLens, onClose, onSuccess, onCoordinationSent }: Props) {
  const [mode, setMode] = useState<'main' | 'override'>('main');
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const conflict = caseLens.relationships.find((r) => r.conflictType === 'ACTION_CONFLICT');
  const mainCase = caseLens.mainCase;

  const handleSendCoordination = async () => {
    setLoading(true);
    setError('');
    try {
      await api.sendCoordination(caseId);
      onCoordinationSent();
    } catch (err: any) {
      if (err.existing) {
        // Already exists — still close and refresh
        onCoordinationSent();
      } else {
        setError(err.error || 'Failed to send coordination request.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      setError('Override reason must be at least 10 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.overrideDispose(caseId, overrideReason, mainCase.assignedOfficer);
      onSuccess();
    } catch (err: any) {
      setError(err.error || 'Override failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-600" />
            <span className="text-sm font-semibold text-gray-900">Cross-Bureau Conflict</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {mode === 'main' ? (
            <>
              <p className="text-sm text-gray-700">
                An active related case has a potentially conflicting proposed action. Independent disposal is currently blocked.
              </p>

              {/* Action comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {mainCase.bureau}
                  </div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Proposed Action:</div>
                  <div className="text-xs text-gray-600">{mainCase.proposedAction || 'Fee refund direction'}</div>
                </div>
                {conflict && (
                  <div className="border border-red-200 rounded-md p-3 bg-red-50">
                    <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">
                      {conflict.relatedCase.bureau}
                    </div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Proposed Action:</div>
                    <div className="text-xs text-gray-600">{conflict.relatedCase.proposedAction}</div>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                <strong>Independent disposal is currently blocked.</strong>
                <br />
                The proposed actions across these cases may conflict and should be coordinated before disposal.
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleSendCoordination} disabled={loading} className="flex-1 justify-center">
                  {loading ? 'Sending...' : 'Send Coordination Request'}
                </Button>
                <Button variant="secondary" onClick={() => setMode('override')} disabled={loading} className="flex-1 justify-center">
                  Override & Provide Reason
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                You are about to override the conflict guard and dispose this case. This action will be logged.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 block">
                  Override Reason <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(minimum 10 characters)</span>
                </label>
                <textarea
                  rows={4}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the reason for overriding the conflict guard..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleOverride} disabled={loading} className="flex-1 justify-center">
                  {loading ? 'Processing...' : 'Confirm Override & Dispose'}
                </Button>
                <Button variant="secondary" onClick={() => { setMode('main'); setError(''); }} disabled={loading}>
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
