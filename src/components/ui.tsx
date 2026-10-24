// Shared UI utility components

import React from 'react';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  'Open': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Under Review': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Action Proposed': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Resolved': 'bg-green-50 text-green-700 border border-green-200',
  'Closed': 'bg-gray-100 text-gray-600 border border-gray-200',
  'Disposed': 'bg-gray-100 text-gray-600 border border-gray-200',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusColors[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  'High': 'bg-red-50 text-red-700 border border-red-200',
  'Medium': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Low': 'bg-gray-100 text-gray-600 border border-gray-200',
};

export function PriorityBadge({ priority }: { priority: string }) {
  const cls = priorityColors[priority] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {priority}
    </span>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ─── Error Panel ──────────────────────────────────────────────────────────────

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="border border-red-200 bg-red-50 rounded p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-md ${className}`}>{children}</div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>{children}</div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

export function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-md bg-white px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-navy-800">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {sub && <div className="text-sm text-gray-500 mt-0.5">{sub}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-navy-700 hover:bg-navy-800 text-white border border-navy-800',
  secondary:
    'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border border-red-700',
  ghost:
    'bg-transparent hover:bg-gray-100 text-gray-600 border border-transparent',
};

export function Button({
  children,
  variant = 'secondary',
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded
        transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
