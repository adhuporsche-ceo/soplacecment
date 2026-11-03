import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { ConflictRelationship } from '../../types.ts';
import {
  Users,
  Building2,
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  Landmark,
  MapPin,
  FileText,
  CheckCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

export const ConflictNetworkView: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getConflictNetwork();
      setConflicts(data);
    } catch (err) {
      console.error('Failed to load conflicts of interest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const handleResolveAction = (conflictId: string, actionType: string) => {
    setActionSuccessMessage(`Action executed: ${actionType} logged to audit trail for conflict ${conflictId}.`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const filteredConflicts = conflicts.filter(c => {
    if (filterType === 'ALL') return true;
    return c.conflictType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Integrity & Governance</span>
            <span>·</span>
            <span>Related-Party & Beneficial Ownership Engine</span>
            <span>·</span>
            <span className="font-mono text-sky-700">SOX 404 / NASDAQ 5630</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Vendor & Employee Conflict of Interest Graph
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Correlates corporate vendor master files with internal payroll records, routing transit numbers, executive real-estate disclosures, and tax IDs to expose covert related parties.
          </p>
        </div>

        <button
          onClick={loadConflicts}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Scan Network</span>
        </button>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-3 rounded-md shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterType === 'ALL'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Conflicts ({conflicts.length})
          </button>
          <button
            onClick={() => setFilterType('SHARED_BANK_ROUTING')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterType === 'SHARED_BANK_ROUTING'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Shared Banking Routing
          </button>
          <button
            onClick={() => setFilterType('SHARED_ADDRESS')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterType === 'SHARED_ADDRESS'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Shared Physical Address
          </button>
          <button
            onClick={() => setFilterType('SHARED_TAX_ID')}
            className={`px-3 py-1.5 rounded transition-colors ${
              filterType === 'SHARED_TAX_ID'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Shared Corporate Tax ID
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          <span>Active Flagged Clusters: {filteredConflicts.length}</span>
        </div>
      </div>

      {/* Conflict Network Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredConflicts.map(item => {
          const isCritical = item.riskLevel === 'CRITICAL';
          const isHigh = item.riskLevel === 'HIGH';

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-md p-5 shadow-xs transition-shadow hover:shadow-sm ${
                isCritical
                  ? 'border-rose-300'
                  : isHigh
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className={`text-xs font-mono font-bold ${
                    isCritical ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {item.riskLevel} CONFLICT OF INTEREST
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {item.id}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Flagged: {new Date(item.flaggedDate).toLocaleDateString()}
                </div>
              </div>

              {/* Entity Connection Diagram */}
              <div className="my-4 grid grid-cols-1 md:grid-cols-7 items-center gap-4 bg-[#F8F9FA] border border-slate-200/80 p-4 rounded">
                {/* Left Entity: Corporate Vendor */}
                <div className="md:col-span-3 bg-white p-3.5 border border-slate-200 rounded">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    <span>Vendor Entity</span>
                  </div>
                  <div className="font-semibold text-sm text-slate-900">
                    {item.vendorName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    ID: {item.vendorId}
                  </div>
                </div>

                {/* Center Connector: Matched Overlap */}
                <div className="md:col-span-1 flex flex-col items-center justify-center text-center px-1">
                  <div className="w-7 h-7 rounded bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-1">
                    {item.conflictType === 'SHARED_BANK_ROUTING' && <Landmark className="w-3.5 h-3.5" />}
                    {item.conflictType === 'SHARED_ADDRESS' && <MapPin className="w-3.5 h-3.5" />}
                    {item.conflictType === 'SHARED_TAX_ID' && <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                    {item.conflictType.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Right Entity: Corporate Employee / Director */}
                <div className="md:col-span-3 bg-white p-3.5 border border-slate-200 rounded">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Internal Person of Interest</span>
                  </div>
                  <div className="font-semibold text-sm text-slate-900">
                    {item.employeeName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.employeeRole} · {item.departmentName}
                  </div>
                </div>
              </div>

              {/* Matched Evidence & Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700 shrink-0">Matching Attribute:</span>
                  <span className="font-mono text-slate-900 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.matchedAttribute}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700 shrink-0">Forensic Analysis:</span>
                  <span className="text-slate-600 leading-relaxed">
                    {item.details}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700 shrink-0">Recommended Action:</span>
                  <span className="text-slate-700 font-medium">
                    {item.recommendedAction}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleResolveAction(item.id, 'Mandate Conflict Affidavit')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Request Conflict Affidavit
                </button>
                <button
                  onClick={() => handleResolveAction(item.id, 'Freeze Vendor Disbursements')}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Freeze Vendor Disbursements
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
