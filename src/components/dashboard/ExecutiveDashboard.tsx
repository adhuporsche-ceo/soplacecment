import React from 'react';
import { DashboardMetrics } from '../../types.ts';
import {
  DollarSign,
  AlertOctagon,
  ShieldAlert,
  FolderArchive,
  Clock,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ExecutiveDashboardProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  onNavigateToReconcile: () => void;
  onNavigateToCases: () => void;
  onSelectFindingForAi?: (findingId: string) => void;
}

const CATEGORY_COLORS = ['#0284C7', '#0D9488', '#F59E0B', '#E11D48', '#6366F1', '#EC4899'];

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  metrics,
  isLoading,
  onNavigateToReconcile,
  onNavigateToCases,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-28 rounded bg-white border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded bg-white border border-[#E2E8F0] animate-pulse" />
          <div className="h-80 rounded bg-white border border-[#E2E8F0] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Executive Summary Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Corporate Governance</span>
            <span>·</span>
            <span>Automated Continuous Auditing</span>
            <span>·</span>
            <span className="font-mono text-sky-700 font-semibold">Active Sync</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Executive Audit Intelligence Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Real-time reconciliation and automated internal control testing across General Ledger, Purchase Orders, Vendor Disbursements, and Physical Inventories.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={onNavigateToReconcile}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Execute Reconciliation Scan</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Crisp Slate & White, Tabular Numerals, Anti-Slop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Spend Reviewed */}
        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium">Total Spend Audited</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1E293B] font-mono tabular-nums">
            ${(metrics.totalSpendYTD / 1000000).toFixed(2)}M
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            {metrics.totalTransactionsCount} transactions processed
          </div>
        </div>

        {/* KPI 2: Total Exposure At Risk */}
        <div className="p-4 rounded-md bg-white border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700">
            <span className="font-medium">Discrepancy Exposure</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 font-mono tabular-nums">
            ${metrics.totalExposureAtRisk.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-rose-600/80">
            {metrics.criticalFindingsCount} critical severity anomalies
          </div>
        </div>

        {/* KPI 3: Active Audit Findings */}
        <div className="p-4 rounded-md bg-white border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700">
            <span className="font-medium">Active Findings</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {metrics.activeFindingsCount}
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80">
            {metrics.flaggedTransactionsCount} ledger rows flagged
          </div>
        </div>

        {/* KPI 4: Open Investigation Cases */}
        <div className="p-4 rounded-md bg-white border border-sky-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-sky-800">
            <span className="font-medium">Open Cases</span>
            <FolderArchive className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-800 font-mono tabular-nums">
            {metrics.openCasesCount}
          </div>
          <div className="mt-1 text-[11px] text-sky-700 flex items-center justify-between">
            <span>In investigation pipeline</span>
            <button
              onClick={onNavigateToCases}
              className="hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
            >
              View <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 5: Overdue Corrective Actions */}
        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium">Overdue Actions</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1E293B] font-mono tabular-nums">
            {metrics.overdueActionsCount}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            Remediation tracking queue
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Expenditure & Anomaly Trends */}
        <div className="lg:col-span-2 p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-[#1E293B]">
                Monthly Expenditure vs Authorized Budget Cap
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">
                Comparison of actual disbursements against encumbered allocation (USD)
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-600" /> Actual Spend
              </span>
              <span className="flex items-center gap-1.5 ml-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" /> Budget Cap
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyExpenditureTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={val => `$${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '4px', fontSize: '12px', color: '#1E293B' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="actualSpend" fill="#0284C7" radius={[2, 2, 0, 0]} name="Actual Spend" />
                <Bar dataKey="budgetCap" fill="#E2E8F0" radius={[2, 2, 0, 0]} name="Budget Cap" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Findings by Category */}
        <div className="p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="mb-4">
            <div className="text-sm font-semibold text-[#1E293B]">Findings by Mechanism</div>
            <div className="text-xs text-[#64748B] mt-0.5">Distribution across deterministic controls</div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.findingsByCategory}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {metrics.findingsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '4px', fontSize: '12px', color: '#1E293B' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto space-y-1.5 pt-3 border-t border-[#E2E8F0] text-xs">
            {metrics.findingsByCategory.map((cat, idx) => (
              <div key={cat.category} className="flex items-center justify-between text-[#1E293B]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-xs shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="truncate">{cat.label}</span>
                </div>
                <div className="font-mono text-[#64748B] shrink-0">
                  {cat.count} · <span className="text-rose-700 font-medium">${cat.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Department Risk Matrix & Auditor Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Risk Matrix */}
        <div className="lg:col-span-2 p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-[#1E293B]">Department Risk & Budget Utilization</div>
              <div className="text-xs text-[#64748B] mt-0.5">Internal control vulnerability index per operational unit</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-medium bg-[#F8F9FA]">
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Budget Allocated</th>
                  <th className="py-2.5 px-3 text-right">Spend YTD</th>
                  <th className="py-2.5 px-3 text-right">Active Findings</th>
                  <th className="py-2.5 px-3 text-right">Risk Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[#1E293B]">
                {metrics.departmentMetrics.map(dept => {
                  const percentSpent = ((dept.spent / dept.budget) * 100).toFixed(0);
                  const isHighRisk = dept.riskScore > 50;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-sans text-[#1E293B] font-medium">
                        {dept.name}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                        ${(dept.budget / 1000000).toFixed(2)}M
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                        ${(dept.spent / 1000000).toFixed(2)}M ({percentSpent}%)
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {dept.findingsCount > 0 ? (
                          <span className="text-amber-700 font-semibold">{dept.findingsCount}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                          isHighRisk
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {dept.riskScore}/100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor Workload */}
        <div className="p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs flex flex-col">
          <div className="mb-4">
            <div className="text-sm font-semibold text-[#1E293B]">Investigation Workload</div>
            <div className="text-xs text-[#64748B] mt-0.5">Assigned cases per lead investigator</div>
          </div>

          <div className="space-y-3">
            {metrics.auditorWorkload.map((aud, i) => (
              <div key={i} className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1E293B]">{aud.auditorName}</span>
                  <span className="text-[10px] text-[#64748B] font-mono">{aud.role}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span className="text-sky-700 font-medium">
                    {aud.activeCases} active {aud.activeCases === 1 ? 'case' : 'cases'}
                  </span>
                  <span className="text-teal-700 font-medium">
                    {aud.resolvedCases} resolved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
