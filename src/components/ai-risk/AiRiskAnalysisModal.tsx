import React, { useState, useEffect } from 'react';
import { AuditFinding } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  Code2,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  Scale,
  X,
  RefreshCw,
} from 'lucide-react';

interface AiRiskAnalysisModalProps {
  finding: AuditFinding | null;
  onClose: () => void;
}

export const AiRiskAnalysisModal: React.FC<AiRiskAnalysisModalProps> = ({
  finding,
  onClose,
}) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!finding) return;

    async function loadAnalysis() {
      setIsLoading(true);
      try {
        const result = await api.analyzeFindingWithAi(finding!.id);
        setAnalysis(result.analysis);
      } catch (err) {
        console.warn('Failed to load AI analysis:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalysis();
  }, [finding]);

  if (!finding) return null;

  const score = analysis?.riskScore || finding.aiRiskScore || 75;
  const isHigh = score >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full p-6 text-xs text-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Gemini Audit Intelligence Deep Dive</span>
                <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-800/60">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Explainable internal control assessment & materiality analysis
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Finding Overview */}
        <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-xs">{finding.title}</span>
            <span className="font-mono text-rose-400 font-bold tabular-nums">
              Exposure: ${finding.amountAtRisk.toLocaleString()}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {finding.explanation}
          </p>
          <div className="text-[11px] text-slate-400 font-mono">
            Supporting Evidence: {finding.supportingEvidence}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
            <div className="text-slate-300 font-medium">Synthesizing forensic reasoning with Gemini...</div>
            <div className="text-[11px] text-slate-500">Checking SOX §404 controls, 3-way matching rules, and ledger thresholds.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Risk Score Dial & Regulatory Indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Control Risk Score</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-0.5">
                    {score}<span className="text-xs text-slate-500">/100</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isHigh ? 'High Severity Control Breakdown' : 'Moderate Advisory Attention'}
                  </div>
                </div>
                <ShieldAlert className={`w-8 h-8 ${isHigh ? 'text-rose-400' : 'text-amber-400'}`} />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">SOX / Statutory Reporting</div>
                  <div className={`text-sm font-bold font-mono mt-1 ${analysis?.requiresRegulatoryReporting ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {analysis?.requiresRegulatoryReporting ? 'Statutory Disclosure Required' : 'Internal Audit Resolution Only'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Threshold: Materiality &gt; $100k exposure
                  </div>
                </div>
                <Scale className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            {/* AI Forensic Reasoning */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Explainable Forensic Rationale</span>
              </div>
              <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-cyan-100 text-xs leading-relaxed">
                {analysis?.reasoning || finding.aiAnalysis || 'Detailed reasoning compiled.'}
              </div>
            </div>

            {/* Recommended Internal Controls */}
            {analysis?.recommendedControls && (
              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Actionable Corrective Controls</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.recommendedControls.map((ctrl: string, idx: number) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span>{ctrl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedural Policies Implicated */}
            {analysis?.proceduralViolations && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Standard Policies Implicated</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.proceduralViolations.map((violation: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-300">
                      {violation}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          <div>
            AI Guideline: AI does not declare fraud without verified human corroboration.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            Dismiss Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
