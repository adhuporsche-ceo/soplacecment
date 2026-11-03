import React from 'react';
import { DashboardMetrics, AuditFinding, CorrectiveAction } from '../../types.ts';
import { FileSpreadsheet, Printer, Download, X, ShieldCheck, AlertOctagon } from 'lucide-react';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: DashboardMetrics | null;
  findings: AuditFinding[];
  actions: CorrectiveAction[];
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  metrics,
  findings,
  actions,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full p-8 text-xs text-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Board & Audit Committee Executive Brief</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Document */}
        <div className="space-y-6 font-sans">
          {/* Header Block */}
          <div className="border-b border-slate-800 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white print:text-black">
                  AUDITMIND 360 · INTERNAL AUDIT REPORT
                </h1>
                <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  Apex Global Corporation · Internal Audit & Risk Oversight Directorate
                </div>
              </div>
              <div className="text-right text-xs font-mono text-slate-400 print:text-slate-600">
                <div>Document ID: AUD-REP-2026-Q1</div>
                <div>Date: {new Date().toISOString().split('T')[0]}</div>
                <div className="text-cyan-400 print:text-cyan-800 font-bold">SOX §404 Compliance</div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider mb-2">
              1. Executive Audit Opinion & Synthesis
            </h3>
            <p className="text-slate-300 print:text-slate-700 leading-relaxed text-xs">
              During the Q1 comprehensive financial reconciliation sweep across General Ledger accounts, purchase orders, and vendor vouchers, the automated audit intelligence engine scanned <strong>${((metrics?.totalSpendYTD || 0) / 1000000).toFixed(2)}M</strong> in gross disbursements. A total of <strong>{findings.length} actionable anomalies</strong> representing <strong>${(metrics?.totalExposureAtRisk || 0).toLocaleString()}</strong> in capital exposure were identified, including duplicated advisory invoicing and unapproved freight detention surcharges.
            </p>
          </div>

          {/* Key Metrics Table */}
          <div>
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider mb-2">
              2. Core Financial Discrepancy Findings
            </h3>
            <table className="w-full text-xs text-left border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-black border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Finding Details</th>
                  <th className="p-2.5">Severity</th>
                  <th className="p-2.5 text-right">Exposure Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-300 font-mono">
                {findings.map(f => (
                  <tr key={f.id}>
                    <td className="p-2.5 font-sans font-medium text-slate-300 print:text-black">
                      {f.category.replace(/_/g, ' ')}
                    </td>
                    <td className="p-2.5 font-sans text-slate-400 print:text-slate-700">
                      {f.title}
                    </td>
                    <td className="p-2.5 text-rose-400 print:text-rose-700 font-bold">
                      {f.severity}
                    </td>
                    <td className="p-2.5 text-right text-white print:text-black tabular-nums font-bold">
                      ${f.amountAtRisk.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Corrective Actions Status */}
          <div>
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider mb-2">
              3. Corrective Action Plan (CAPA) Mandates
            </h3>
            <div className="space-y-2">
              {actions.map(act => (
                <div key={act.id} className="p-3 rounded border border-slate-800 print:border-slate-300 bg-slate-950/60 print:bg-slate-50 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white print:text-black">
                    <span>{act.title}</span>
                    <span className="font-mono text-cyan-400 print:text-cyan-800">{act.status}</span>
                  </div>
                  <div className="text-slate-400 print:text-slate-600 mt-1">
                    Assigned: {act.assignedToName} · Due: {act.dueDate.split('T')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-400 print:text-slate-600">
            <div>
              <div className="font-semibold text-slate-200 print:text-black">Robert Hastings (CIA, CISA)</div>
              <div>Chief Audit Executive, Apex Global</div>
              <div className="mt-4 border-b border-dashed border-slate-700 w-48" />
              <div className="text-[10px] mt-1 font-mono">Digital Signature: VERIFIED 2026-03-15</div>
            </div>
            <div>
              <div className="font-semibold text-slate-200 print:text-black">Evelyn Brooks (JD)</div>
              <div>Compliance & Risk Governance Officer</div>
              <div className="mt-4 border-b border-dashed border-slate-700 w-48" />
              <div className="text-[10px] mt-1 font-mono">Digital Signature: VERIFIED 2026-03-15</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
