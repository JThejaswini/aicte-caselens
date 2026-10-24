import React from 'react';
import { Clock, CheckCircle, AlertTriangle, FileText, Send, Link } from 'lucide-react';
import type { TimelineEvent } from '../api';

const actionIcons: Record<string, React.ElementType> = {
  'Case Registered': FileText,
  'Assigned to Officer': CheckCircle,
  'Document Request Sent': FileText,
  'CaseLens Analysis Completed': Clock,
  'Coordination Request Sent': Send,
  'Coordination Acknowledged': CheckCircle,
  'Override Disposal': AlertTriangle,
  'Case Disposed': CheckCircle,
  'Case Resolved': CheckCircle,
  'Case Linked': Link,
  'Action Proposed': AlertTriangle,
};

const actionColors: Record<string, string> = {
  'Case Registered': 'bg-blue-100 text-blue-600',
  'Assigned to Officer': 'bg-slate-100 text-slate-600',
  'Document Request Sent': 'bg-yellow-100 text-yellow-600',
  'CaseLens Analysis Completed': 'bg-teal-100 text-teal-600',
  'Coordination Request Sent': 'bg-orange-100 text-orange-600',
  'Coordination Acknowledged': 'bg-green-100 text-green-600',
  'Override Disposal': 'bg-red-100 text-red-600',
  'Case Disposed': 'bg-green-100 text-green-600',
  'Case Resolved': 'bg-green-100 text-green-600',
  'Case Linked': 'bg-blue-100 text-blue-600',
  'Action Proposed': 'bg-orange-100 text-orange-600',
};

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-gray-500 py-2">No timeline events.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

      <div className="space-y-4">
        {events.map((ev) => {
          const Icon = actionIcons[ev.action] ?? Clock;
          const color = actionColors[ev.action] ?? 'bg-gray-100 text-gray-500';
          return (
            <div key={ev.id} className="flex gap-3 relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}
              >
                <Icon size={13} />
              </div>
              <div className="flex-1 pt-1 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800">{ev.action}</span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {formatDate(ev.timestamp)}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {ev.actor}
                  {ev.designation && ev.designation !== 'System' && (
                    <span className="text-gray-400"> · {ev.designation}</span>
                  )}
                </div>
                {ev.remark && (
                  <div className="text-xs text-gray-600 mt-1 bg-gray-50 border border-gray-100 rounded px-2 py-1">
                    {ev.remark}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
