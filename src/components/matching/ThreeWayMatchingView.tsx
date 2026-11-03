import React, { useState } from 'react';
import { ThreeWayMatchResult } from '../../types.ts';
import {
  FileCheck2,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';

interface ThreeWayMatchingViewProps {
  matches: ThreeWayMatchResult[];
  isLoading: boolean;
  onSelectFinding?: (findingId: string) => void;
  onOpenReport?: () => void;
}

export const ThreeWayMatchingView: React.FC<ThreeWayMatchingViewProps> = ({
  matches,
  isLoading,
  onSelectFinding,
  onOpenReport,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<ThreeWayMatchResult | null>(matches[0] || null);

  const filteredMatches = matches.filter(m => {
    const matchesSearch =
      m.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      m.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      m.vendorName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || m.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const currentMatch = matches.find(m => m.matchId === selectedMatch?.matchId) || matches[0] || null;

  const totalVariance = matches.reduce((sum, m) => sum + (m.status !== 'PERFECT_MATCH' ? Math.abs(m.varianceAmount) : 0), 0);
  const matchedCount = matches.filter(m => m.status === 'PERFECT_MATCH').length;
  const varianceCount = matches.filter(m => m.status !== 'PERFECT_MATCH').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Automated Procurement Control</span>
            <span>·</span>
            <span>Three-Way Matching</span>
            <span>·</span>
            <span className="font-mono text-sky-700">PO ↔ GRN ↔ Invoice</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Three-Way Procurement Matching Engine
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Automated verification comparing Purchase Order quantities & rates against warehouse Goods Receiving Notes (GRN) and vendor invoices.
          </p>
        </div>

        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] rounded transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            Export Match Summary
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-xs text-[#64748B] font-medium">Evaluated Pairs</div>
          <div className="mt-1 text-2xl font-bold text-[#1E293B] font-mono tabular-nums">
            {matches.length}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Automated ERP cross-reconciliation</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-teal-200 shadow-xs">
          <div className="text-xs text-teal-800 font-medium">Perfect 3-Way Match Rate</div>
          <div className="mt-1 text-2xl font-bold text-teal-700 font-mono tabular-nums">
            {matches.length > 0 ? ((matchedCount / matches.length) * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[11px] text-teal-700 mt-0.5">{matchedCount} verified within zero variance</div>
        </div>

        <div className="p-4 rounded-md bg-white border border-rose-200 shadow-xs">
          <div className="text-xs text-rose-800 font-medium">3-Way Variance Exposure</div>
          <div className="mt-1 text-2xl font-bold text-rose-700 font-mono tabular-nums">
            ${totalVariance.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">{varianceCount} invoices require audit authorization</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-md border border-[#E2E8F0] shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Invoice #, PO #, or Vendor Name..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded text-xs text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E293B] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Matching States</option>
            <option value="PERFECT_MATCH">Perfect 3-Way Match</option>
            <option value="PRICE_VARIANCE">Price / Surcharge Variance</option>
            <option value="QUANTITY_VARIANCE">Quantity Discrepancy</option>
            <option value="MISSING_RECEIPT">Missing Warehouse Receipt</option>
            <option value="UNMATCHED_INVOICE">Unmatched / No PO</option>
          </select>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Matches */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-1">
            Reconciliation Queue ({filteredMatches.length})
          </div>

          <div className="space-y-2.5">
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-white">
                No matching records found.
              </div>
            ) : (
              filteredMatches.map(m => {
                const isSelected = currentMatch?.matchId === m.matchId;
                const isMatch = m.status === 'PERFECT_MATCH';

                return (
                  <div
                    key={m.matchId}
                    onClick={() => setSelectedMatch(m)}
                    className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50/60 border-sky-400 shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-sky-700 font-semibold">{m.invoiceNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        isMatch
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#1E293B] truncate">
                      {m.vendorName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2 font-mono tabular-nums">
                      <span>PO: ${m.poAmount.toLocaleString()}</span>
                      <span className="text-slate-300">→</span>
                      <span>Inv: ${m.invoicedAmount.toLocaleString()}</span>
                      {m.varianceAmount !== 0 && (
                        <span className="text-rose-700 font-bold">
                          (+${m.varianceAmount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Deep Comparator Workbench */}
        {currentMatch ? (
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-md bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
              <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-sky-700 font-bold">{currentMatch.invoiceNumber}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-[#64748B] font-mono">PO: {currentMatch.poNumber}</span>
                    {currentMatch.receiptNumber && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-[#64748B] font-mono">GRN: {currentMatch.receiptNumber}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-[#1E293B] mt-1">
                    {currentMatch.vendorName}
                  </h2>
                </div>

                <span className={`px-2.5 py-1 rounded text-xs font-semibold font-mono ${
                  currentMatch.status === 'PERFECT_MATCH'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {currentMatch.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* 3 Columns Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Column 1: Authorized PO */}
                <div className="p-3.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span className="font-semibold text-[#1E293B]">1. Purchase Order</span>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="font-mono text-xs text-[#64748B]">{currentMatch.poNumber}</div>
                  <div className="mt-2 text-lg font-bold text-[#1E293B] font-mono tabular-nums">
                    ${currentMatch.poAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Authorized baseline cap</div>
                </div>

                {/* Column 2: Goods Receiving Note */}
                <div className="p-3.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span className="font-semibold text-[#1E293B]">2. Goods Receipt</span>
                    <Truck className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div className="font-mono text-xs text-[#64748B]">{currentMatch.receiptNumber || 'None On File'}</div>
                  <div className="mt-2 text-lg font-bold text-teal-800 font-mono">
                    {currentMatch.receiptNumber ? 'Certified' : 'Pending Slip'}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Warehouse dock check</div>
                </div>

                {/* Column 3: Vendor Invoiced Amount */}
                <div className="p-3.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span className="font-semibold text-[#1E293B]">3. Vendor Invoice</span>
                    <Receipt className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="font-mono text-xs text-[#64748B]">{currentMatch.invoiceNumber}</div>
                  <div className="mt-2 text-lg font-bold text-[#1E293B] font-mono tabular-nums">
                    ${currentMatch.invoicedAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Billed by supplier</div>
                </div>
              </div>

              {/* Forensic Details Callout */}
              <div className={`p-4 rounded border text-xs leading-relaxed ${
                currentMatch.status === 'PERFECT_MATCH'
                  ? 'bg-teal-50/60 border-teal-200 text-teal-900'
                  : 'bg-rose-50/60 border-rose-200 text-rose-900'
              }`}>
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  {currentMatch.status === 'PERFECT_MATCH' ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>Reconciliation Verdict</span>
                </div>
                <p>{currentMatch.details}</p>
                {currentMatch.varianceAmount !== 0 && (
                  <div className="mt-2 pt-2 border-t border-rose-200 font-mono text-[11px] flex justify-between font-semibold">
                    <span>Variance Amount: +${currentMatch.varianceAmount.toLocaleString()}</span>
                    <span>Deviation: {currentMatch.variancePercent.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                <span className="text-[11px] text-[#64748B] font-mono">
                  Matching Engine: SOX §404 Automated 3-Way Pass
                </span>

                {currentMatch.reconciliationFindingId && onSelectFinding && (
                  <button
                    onClick={() => onSelectFinding(currentMatch.reconciliationFindingId!)}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Audit Finding</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-white">
            Select a 3-way reconciliation pair to inspect line items and variances.
          </div>
        )}
      </div>
    </div>
  );
};
