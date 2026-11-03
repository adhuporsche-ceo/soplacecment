import React, { useState } from 'react';
import {
  PieChart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface BudgetDepartment {
  departmentId: string;
  departmentName: string;
  code: string;
  headOfDepartment: string;
  budgetAllocated: number;
  actualSpend: number;
  committedAmount: number;
  totalEncumbered: number;
  variance: number;
  burnRate: number;
  alertStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL_OVERSPEND';
  activeFindingsCount: number;
}

interface BudgetReconciliationViewProps {
  reconciliationData: BudgetDepartment[];
  isLoading: boolean;
}

export const BudgetReconciliationView: React.FC<BudgetReconciliationViewProps> = ({
  reconciliationData,
  isLoading,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  const totalAllocated = reconciliationData.reduce((sum, d) => sum + d.budgetAllocated, 0);
  const totalActual = reconciliationData.reduce((sum, d) => sum + d.actualSpend, 0);
  const totalCommitted = reconciliationData.reduce((sum, d) => sum + d.committedAmount, 0);
  const totalRemaining = totalAllocated - (totalActual + totalCommitted);
  const overallBurnRate = totalAllocated > 0 ? (((totalActual + totalCommitted) / totalAllocated) * 100).toFixed(1) : '0';

  const filteredDepts = selectedDeptId === 'ALL'
    ? reconciliationData
    : reconciliationData.filter(d => d.departmentId === selectedDeptId);

  const chartData = reconciliationData.map(d => ({
    name: d.code,
    allocated: d.budgetAllocated / 1000000,
    actual: d.actualSpend / 1000000,
    committed: d.committedAmount / 1000000,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Fiscal Governance</span>
            <span>·</span>
            <span>Expenditure Reconciliation</span>
            <span>·</span>
            <span className="font-mono text-sky-700">FY2026 Budget Controls</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Budget vs Actuals & Encumbrance Tracking
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Reconciles approved fiscal operating budgets against open purchase order commitments and general ledger disbursements.
          </p>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-xs text-[#64748B] font-medium">Total Fiscal Budget Cap</div>
          <div className="mt-1 text-2xl font-bold text-[#1E293B] font-mono tabular-nums">
            ${(totalAllocated / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">5 operating units</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-xs text-[#64748B] font-medium">Actual Cleared Spend</div>
          <div className="mt-1 text-2xl font-bold text-sky-700 font-mono tabular-nums">
            ${(totalActual / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Posted GL disbursements</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-xs text-[#64748B] font-medium">Open Commitments</div>
          <div className="mt-1 text-2xl font-bold text-teal-700 font-mono tabular-nums">
            ${(totalCommitted / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Encumbered purchase orders</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-emerald-200 shadow-xs">
          <div className="text-xs text-emerald-800 font-medium">Remaining Surplus</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            ${(totalRemaining / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            {overallBurnRate}% overall budget encumbered
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-[#1E293B]">Departmental Budget vs Spend vs Commitments ($M)</div>
            <div className="text-xs text-[#64748B] mt-0.5">Comparative bar chart by organizational cost center</div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                tickFormatter={val => `$${val}M`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '4px', fontSize: '12px', color: '#1E293B' }}
                formatter={(val: any) => [`$${Number(val).toFixed(2)}M`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="allocated" fill="#CBD5E1" radius={[2, 2, 0, 0]} name="Allocated Budget" />
              <Bar dataKey="actual" fill="#0284C7" radius={[2, 2, 0, 0]} name="Actual Cleared Spend" />
              <Bar dataKey="committed" fill="#0D9488" radius={[2, 2, 0, 0]} name="Open Commitments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepts.map(dept => {
          const isOverspend = dept.alertStatus === 'CRITICAL_OVERSPEND';
          const isWarning = dept.alertStatus === 'WARNING';

          return (
            <div
              key={dept.departmentId}
              className="p-5 rounded-md bg-white border border-[#E2E8F0] space-y-3 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-sky-700 text-xs font-semibold">{dept.code}</span>
                  <h3 className="text-sm font-bold text-[#1E293B] mt-0.5">{dept.departmentName}</h3>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Lead: {dept.headOfDepartment}</div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  isOverspend
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : isWarning
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {dept.alertStatus.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Burn Rate</span>
                  <span className={`font-bold tabular-nums ${isOverspend ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-slate-800'}`}>
                    {dept.burnRate}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverspend ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-sky-600'
                    }`}
                    style={{ width: `${Math.min(100, dept.burnRate)}%` }}
                  />
                </div>
              </div>

              {/* Encumbrance Breakdown */}
              <div className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] space-y-1 text-xs font-mono">
                <div className="flex justify-between text-[#64748B]">
                  <span>Allocated:</span>
                  <span className="text-[#1E293B] font-medium">${(dept.budgetAllocated / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Actual Spend:</span>
                  <span className="text-sky-700 font-medium">${(dept.actualSpend / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Committed POs:</span>
                  <span className="text-teal-700 font-medium">${(dept.committedAmount / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E2E8F0] text-[#1E293B] font-bold">
                  <span>Available Variance:</span>
                  <span className={dept.variance < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    ${(dept.variance / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>

              {dept.activeFindingsCount > 0 && (
                <div className="text-[11px] text-amber-700 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{dept.activeFindingsCount} audit findings active in this unit</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
