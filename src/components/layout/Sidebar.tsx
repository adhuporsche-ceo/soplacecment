import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Receipt,
  ScanSearch,
  Briefcase,
  FileCheck2,
  ListTodo,
  Boxes,
  ScrollText,
  FileSpreadsheet,
  AlertTriangle,
  GitCompare,
  PieChart,
  Building2,
  Users,
  Binary,
  Network,
  ShieldCheck,
} from 'lucide-react';

export type NavModule =
  | 'DASHBOARD'
  | 'TRANSACTIONS'
  | 'THREE_WAY_MATCHING'
  | 'RECONCILIATION'
  | 'BENFORDS_LAW'
  | 'CONFLICT_NETWORK'
  | 'SOX_CONTROLS'
  | 'BUDGET_RECONCILIATION'
  | 'CASES'
  | 'EVIDENCE'
  | 'ACTIONS'
  | 'INVENTORY'
  | 'VENDORS'
  | 'REPORTS'
  | 'LOGS'
  | 'USERS';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (m: NavModule) => void;
  activeFindingsCount?: number;
  openCasesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  activeFindingsCount = 0,
  openCasesCount = 0,
}) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'DASHBOARD' as NavModule,
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'TRANSACTIONS' as NavModule,
      label: 'Financial Ledger',
      icon: Receipt,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'THREE_WAY_MATCHING' as NavModule,
      label: 'Three-Way Matching',
      icon: GitCompare,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'RECONCILIATION' as NavModule,
      label: 'Reconciliation Engine',
      icon: ScanSearch,
      badge: activeFindingsCount > 0 ? activeFindingsCount : null,
      badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'BENFORDS_LAW' as NavModule,
      label: "Benford's Law Forensic",
      icon: Binary,
      badge: 'Stats',
      badgeColor: 'text-sky-800 bg-sky-50 border-sky-200',
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'CONFLICT_NETWORK' as NavModule,
      label: 'Conflict of Interest Graph',
      icon: Network,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'SOX_CONTROLS' as NavModule,
      label: 'SOX 404 Control Matrix',
      icon: ShieldCheck,
      badge: 'SOX',
      badgeColor: 'text-teal-800 bg-teal-50 border-teal-200',
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER', 'DEPARTMENT_MANAGER'],
    },
    {
      id: 'BUDGET_RECONCILIATION' as NavModule,
      label: 'Budget & Actuals',
      icon: PieChart,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'CASES' as NavModule,
      label: 'Audit Investigations',
      icon: Briefcase,
      badge: openCasesCount > 0 ? openCasesCount : null,
      badgeColor: 'text-sky-800 bg-sky-50 border-sky-200',
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'EVIDENCE' as NavModule,
      label: 'Document Intelligence',
      icon: FileCheck2,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'ACTIONS' as NavModule,
      label: 'Corrective Actions',
      icon: ListTodo,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'INVENTORY' as NavModule,
      label: 'Inventory Audits',
      icon: Boxes,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'VENDORS' as NavModule,
      label: 'Vendor Risk Directory',
      icon: Building2,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'REPORTS' as NavModule,
      label: 'Board & SOX Reports',
      icon: FileSpreadsheet,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'LOGS' as NavModule,
      label: 'System Audit Logs',
      icon: ScrollText,
      badge: null,
      allowedRoles: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
    },
    {
      id: 'USERS' as NavModule,
      label: 'User Administration',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'text-slate-700 bg-slate-100 border-slate-200',
      allowedRoles: ['SUPER_ADMIN'],
    },
  ];

  return (
    <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col shrink-0 select-none">
      {/* Workspace Header */}
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8F9FA]/60">
        <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
          Internal Audit Workspace
        </div>
        <div className="text-xs font-semibold text-[#1E293B] truncate">
          Apex Global Internal Audit
        </div>
        {user?.role === 'DEPARTMENT_MANAGER' && (
          <div className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Scope: IT & Infrastructure</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isAllowed = user && item.allowedRoles.includes(user.role);
          if (!isAllowed) return null;

          const isActive = currentModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sky-50 text-sky-800 font-semibold border border-sky-200'
                  : 'text-[#1E293B] hover:text-slate-900 hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600' : 'text-[#64748B]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor || 'border-slate-200'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile Details */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8F9FA] text-[11px] text-[#64748B]">
        <div className="flex items-center justify-between font-mono">
          <span>Node: AGC-US-EAST</span>
          <span className="text-teal-700 font-medium">TLS 1.3 Certified</span>
        </div>
        <div className="mt-1 text-[#64748B] truncate">
          User: <span className="font-mono text-[#1E293B] font-medium">{user?.email}</span>
        </div>
      </div>
    </aside>
  );
};
