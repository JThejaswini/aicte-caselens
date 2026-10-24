import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Building2,
  ClipboardList,
  ArrowLeftRight,
  Bell,
  BarChart2,
  Settings,
  Shield,
} from 'lucide-react';

const ACTIVE_NAV = 'bg-white/10 text-white';
const INACTIVE_NAV = 'text-slate-300 hover:bg-white/5 hover:text-white';
const DISABLED_NAV = 'text-slate-500 cursor-not-allowed';

function NavItem({
  to,
  icon: Icon,
  label,
  disabled,
}: {
  to?: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs ${DISABLED_NAV}`}>
        <Icon size={14} />
        <span className="flex-1">{label}</span>
        <span className="text-[10px] text-slate-600 font-medium">Coming soon</span>
      </div>
    );
  }
  return (
    <NavLink
      to={to!}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors ${
          isActive ? ACTIVE_NAV : INACTIVE_NAV
        }`
      }
    >
      <Icon size={14} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-teal-400" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">AICTE</div>
              <div className="text-[10px] text-teal-400 font-medium leading-tight tracking-wide">
                CaseLens
              </div>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-1 leading-tight">
            Institution Complaint Intelligence
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
            Active
          </div>
          <NavItem to="/" icon={Search} label="Institution Search" />
          <NavItem to="/complaints/new" icon={ClipboardList} label="New Complaint" />

          <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-slate-500 font-semibold mt-3 mb-1">
            Other Modules
          </div>
          <NavItem disabled icon={LayoutDashboard} label="Executive Dashboard" />
          <NavItem disabled icon={Building2} label="Bureau Management" />
          <NavItem disabled icon={ClipboardList} label="Assignments" />
          <NavItem disabled icon={ArrowLeftRight} label="Transfers" />
          <NavItem disabled icon={Bell} label="Alerts" />
          <NavItem disabled icon={BarChart2} label="Analytics" />
          <NavItem disabled icon={Settings} label="Administration" />
        </nav>

        <div className="px-4 py-3 border-t border-white/10">
          <div className="text-[9px] text-slate-500 leading-tight">
            SIH 2024 Prototype
          </div>
          <div className="text-[9px] text-slate-600">Problem ID: SIH26264</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-10 bg-white border-b border-gray-200 flex items-center px-5 gap-3 shrink-0">
          <span className="text-xs font-semibold text-gray-700">
            All India Council for Technical Education
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500">
            Integrated Complaint Monitoring — CaseLens Intelligence Layer
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
              Demo Mode · DEMO_DATE: 2026-10-23
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
