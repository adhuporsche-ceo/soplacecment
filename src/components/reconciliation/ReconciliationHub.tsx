import React, { useState } from 'react';
import { AuditFinding } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  ScanSearch,
  Code2,
  AlertTriangle,
  Copy,
  Receipt,
  FileQuestion,
  TrendingUp,
  Boxes,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface ReconciliationHubProps {
  findings: AuditFinding[];
  isScanning: boolean;
  onRunScan: () => void;
  onOpenAiAnalysis: (finding: AuditFinding) => void;
  onCreateCaseFromFinding: (finding: AuditFinding) => void;
}

export const ReconciliationHub: React.FC<ReconciliationHubProps> = ({
  findings,
  isScanning,
  onRunScan,
  onOpenAiAnalysis,
  onCreateCaseFromFinding,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories: Array<{ id: string; label: string; icon: any }> = [
    { id: 'ALL', label: 'All Anomalies', icon: AlertTriangle },
    { id: 'DUPLICATE_PAYMENT', label: 'Duplicate Payments', icon: Copy },
    { id: 'PO_INVOICE_VARIANCE', label: 'PO vs Invoice Variances', icon: Receipt },
    { id: 'MISSING_DOCUMENTATION', label: 'Missing Documentation', icon: FileQuestion },
    { id: 'UNUSUAL_EXPENDITURE', label: 'Statistical Outliers', icon: TrendingUp },
    { id: 'INVENTORY_DISCREPANCY', label: 'Inventory Discrepancies', icon: Boxes },
  ];

  const filteredFindings = findings.filter(f => {
    if (selectedCategory === 'ALL') return true;
    return f.category === selectedCategory;
  });

  const totalExposure = filteredFindings.reduce((sum, f) => sum + f.amountAtRisk, 0);

  const canRunScan = user?.role === 'SUPER_ADMIN' || user?.role === 'CHIEF_AUDITOR' || user?.role === 'FINANCIAL_AUDITOR';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Automated Detection</span>
            <span>·</span>
            <span>Multi-Pass Verification Sweep</span>
            <span>·</span>
            <span className="font-mono text-amber-700 font-semibold">{findings.length} Anomalies Flagged</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Deterministic Reconciliation Engine
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Mathematical cross-referencing of invoice strings, line-item totals, purchase order variances, duplicate disbursement hashes, and inventory count slips.
          </p>
        </div>

        {canRunScan && (
          <button
            onClick={onRunScan}
            disabled={isScanning}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors flex items-center gap-2 whitespace-nowrap shadow-2xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <ScanSearch className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Executing Multi-Pass Sweep...' : 'Run Full Reconciliation Sweep'}</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-xs text-[#64748B] font-medium">Flagged Anomalies</div>
          <div className="mt-1 text-2xl font-bold text-[#1E293B] font-mono tabular-nums">
            {filteredFindings.length}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            Cross-referenced with general ledger
          </div>
        </div>

        <div className="p-4 rounded-md bg-white border border-rose-200 shadow-xs">
          <div className="text-xs text-rose-700 font-medium">Total Capital Exposure at Risk</div>
          <div className="mt-1 text-2xl font-bold text-rose-700 font-mono tabular-nums">
            ${totalExposure.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            Subject to stop-payment order or recovery
          </div>
        </div>

        <div className="p-4 rounded-md bg-white border border-sky-200 shadow-xs">
          <div className="text-xs text-sky-800 font-medium">AI Explainability Engine</div>
          <div className="mt-1 text-sm font-semibold text-sky-900 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-sky-600" />
            <span>Gemini 3.8 Flash Active</span>
          </div>
          <div className="text-[11px] text-sky-700 mt-1">
            Forensic reasoning without speculative conclusions
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white rounded-md border border-[#E2E8F0] shadow-xs">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#64748B]'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center rounded-md border border-[#E2E8F0] bg-white shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#1E293B]">No discrepancies detected in this category</div>
            <div className="text-xs text-[#64748B] mt-1">
              All transactions verified and passed deterministic reconciliation filters.
            </div>
          </div>
        ) : (
          filteredFindings.map(finding => {
            const isCritical = finding.severity === 'CRITICAL';
            const isAssigned = finding.status === 'ASSIGNED_TO_CASE';

            return (
              <div
                key={finding.id}
                className="p-5 rounded-md bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Severity Label */}
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                        isCritical
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {finding.severity}
                      </span>

                      {/* Unboxed Metadata Separators */}
                      <span className="text-[#64748B] font-mono">{finding.category.replace(/_/g, ' ')}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-[#64748B] font-mono tabular-nums">
                        Detected: {finding.detectedAt.split('T')[0]}
                      </span>
                      {finding.aiRiskScore && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-sky-700 font-mono font-medium">
                            AI Risk Score: {finding.aiRiskScore}/100
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-[#1E293B]">
                      {finding.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {finding.explanation}
                    </p>

                    <div className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#64748B]">
                      <span className="font-semibold text-[#1E293B]">Supporting Evidence: </span>
                      {finding.supportingEvidence}
                    </div>

                    {finding.aiAnalysis && (
                      <div className="p-3 rounded bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start gap-2">
                        <Code2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-sky-950">Gemini Audit Rationale: </span>
                          {finding.aiAnalysis}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exposure Amount & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                    <div className="text-right">
                      <div className="text-[11px] text-[#64748B]">Exposure at Risk</div>
                      <div className="text-lg font-bold text-rose-700 font-mono tabular-nums">
                        ${finding.amountAtRisk.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenAiAnalysis(finding)}
                        className="px-2.5 py-1 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Explain AI</span>
                      </button>

                      {!isAssigned ? (
                        <button
                          onClick={() => onCreateCaseFromFinding(finding)}
                          className="px-2.5 py-1 text-xs font-medium text-[#1E293B] bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Case</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-sky-800 px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                          Assigned: {finding.caseId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
