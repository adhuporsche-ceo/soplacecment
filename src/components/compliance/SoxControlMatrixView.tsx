import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { SoxControl } from '../../types.ts';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Play,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle,
  Clock,
  RefreshCw,
  Building,
} from 'lucide-react';

interface SoxControlMatrixViewProps {
  onOpenWorkpapers: () => void;
}

export const SoxControlMatrixView: React.FC<SoxControlMatrixViewProps> = ({ onOpenWorkpapers }) => {
  const [controls, setControls] = useState<SoxControl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadControls = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSoxControls();
      setControls(data);
    } catch (err) {
      console.error('Failed to load SOX controls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadControls();
  }, []);

  const handleRunSampleTest = async (id: string) => {
    setTestingId(id);
    try {
      const updated = await api.testSoxControl(id);
      setControls(prev => prev.map(c => (c.id === id ? updated : c)));
      setFeedbackMessage(`Auditor sample test verified for control ${updated.controlCode}. Status: ${updated.status}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Error running test:', err);
    } finally {
      setTestingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: SoxControl['status']) => {
    try {
      const updated = await api.updateSoxControl(id, { status: newStatus });
      setControls(prev => prev.map(c => (c.id === id ? updated : c)));
      setFeedbackMessage(`Status updated to ${newStatus} for ${updated.controlCode}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const effectiveCount = controls.filter(c => c.status === 'EFFECTIVE').length;
  const deficiencyCount = controls.filter(c => c.status === 'DEFICIENCY').length;
  const sigDeficiencyCount = controls.filter(c => c.status === 'SIGNIFICANT_DEFICIENCY' || c.status === 'MATERIAL_WEAKNESS').length;

  const filteredControls = controls.filter(c => {
    if (filterCategory === 'ALL') return true;
    return c.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Regulatory Compliance</span>
            <span>·</span>
            <span>Sarbanes-Oxley Act (SOX § 404) & COSO 2013</span>
            <span>·</span>
            <span className="font-mono text-sky-700">Internal Control Matrix</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Internal Accounting & Operating Controls Testing Matrix
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Audit testing workbook evaluating design and operating effectiveness across financial reporting, procurement three-way matching, inventory cycle counts, and IT access governance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={onOpenWorkpapers}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 rounded hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Workpapers Bundle</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* SOX KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Controls in Scope
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {controls.length}
            </span>
            <span className="text-xs text-slate-500">active controls</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            SOX 404, PCAOB & COSO Framework
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Tested Effective
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
              {effectiveCount}
            </span>
            <span className="text-xs text-slate-500">
              ({Math.round((effectiveCount / (controls.length || 1)) * 100)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Zero operating exceptions
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Control Deficiencies
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {deficiencyCount}
            </span>
            <span className="text-xs text-slate-500">remediation required</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Isolated procedural departures
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Significant Deficiencies
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {sigDeficiencyCount}
            </span>
            <span className="text-xs text-slate-500">Board disclosure</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Audit committee escalation
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-3 rounded-md shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterCategory === 'ALL'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Frameworks ({controls.length})
          </button>
          <button
            onClick={() => setFilterCategory('FINANCIAL_REPORTING')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterCategory === 'FINANCIAL_REPORTING'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Financial Reporting
          </button>
          <button
            onClick={() => setFilterCategory('PROCUREMENT')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterCategory === 'PROCUREMENT'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Procurement & Matching
          </button>
          <button
            onClick={() => setFilterCategory('IT_GENERAL_CONTROLS')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterCategory === 'IT_GENERAL_CONTROLS'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            IT General Controls
          </button>
          <button
            onClick={() => setFilterCategory('INVENTORY')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterCategory === 'INVENTORY'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Inventory Verification
          </button>
        </div>

        <button
          onClick={loadControls}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* Control Rows */}
      <div className="space-y-4">
        {filteredControls.map(ctrl => {
          const isEffective = ctrl.status === 'EFFECTIVE';
          const isDeficiency = ctrl.status === 'DEFICIENCY';
          const isSigDeficiency = ctrl.status === 'SIGNIFICANT_DEFICIENCY' || ctrl.status === 'MATERIAL_WEAKNESS';

          return (
            <div
              key={ctrl.id}
              className="bg-white border border-slate-200 rounded-md p-5 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {ctrl.controlCode}
                  </span>
                  <span className="text-slate-300">·</span>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {ctrl.name}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium text-slate-600">
                    {ctrl.framework} · {ctrl.frequency}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isEffective && (
                      <span className="font-mono text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>EFFECTIVE</span>
                      </span>
                    )}
                    {isDeficiency && (
                      <span className="font-mono text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>DEFICIENCY</span>
                      </span>
                    )}
                    {isSigDeficiency && (
                      <span className="font-mono text-xs font-semibold text-rose-700 flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>SIGNIFICANT DEFICIENCY</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Control Metadata */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-[#F8F9FA] p-3 rounded border border-slate-200/80">
                <div>
                  <span className="text-slate-500 font-medium">Control Owner:</span>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {ctrl.controlOwner}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ctrl.controlOwnerTitle}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Testing Method:</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {ctrl.testingType.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Sample Progress:</span>
                  <div className="font-mono tabular-nums text-slate-900 font-semibold mt-0.5">
                    {ctrl.sampleSizeTested} tested · {ctrl.sampleExceptionsFound} exception(s)
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Last Tested:</span>
                  <div className="font-mono text-slate-700 mt-0.5">
                    {new Date(ctrl.lastTestedDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Walkthrough Notes & Mitigation */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Auditor Walkthrough Notes: </span>
                  <span className="text-slate-600">{ctrl.walkthroughNotes}</span>
                </div>
                {ctrl.mitigationPlan && (
                  <div>
                    <span className="font-semibold text-amber-700">Management Remediation Plan: </span>
                    <span className="text-slate-600">{ctrl.mitigationPlan}</span>
                  </div>
                )}
              </div>

              {/* Auditor Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Set Status:</span>
                  <select
                    value={ctrl.status}
                    onChange={(e) => handleUpdateStatus(ctrl.id, e.target.value as any)}
                    className="bg-white border border-slate-200 text-slate-700 rounded px-2 py-1 text-xs cursor-pointer"
                  >
                    <option value="EFFECTIVE">Effective</option>
                    <option value="DEFICIENCY">Deficiency</option>
                    <option value="SIGNIFICANT_DEFICIENCY">Significant Deficiency</option>
                    <option value="MATERIAL_WEAKNESS">Material Weakness</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRunSampleTest(ctrl.id)}
                  disabled={testingId === ctrl.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Play className={`w-3 h-3 ${testingId === ctrl.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === ctrl.id ? 'Testing Sample...' : 'Run Automated Sample Test'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
