import React, { useState } from 'react';
import { FinancialTransaction } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Search,
  Plus,
  FileCheck,
  FileWarning,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface TransactionManagementProps {
  transactions: FinancialTransaction[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateTransaction: (tx: Partial<FinancialTransaction>) => Promise<void>;
  onSelectDocument: (docId: string, txId: string) => void;
}

export const TransactionManagement: React.FC<TransactionManagementProps> = ({
  transactions,
  isLoading,
  onCreateTransaction,
  onSelectDocument,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Transaction Form State
  const [formData, setFormData] = useState({
    vendorName: '',
    amount: '',
    category: 'OPEX' as any,
    glAccount: 'GL-6100-ADMIN',
    invoiceNumber: '',
    purchaseOrderNumber: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      t.transactionRef.toLowerCase().includes(search.toLowerCase()) ||
      t.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName || !formData.amount) return;

    setIsSubmitting(true);
    try {
      await onCreateTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setIsModalOpen(false);
      setFormData({
        vendorName: '',
        amount: '',
        category: 'OPEX',
        glAccount: 'GL-6100-ADMIN',
        invoiceNumber: '',
        purchaseOrderNumber: '',
        description: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'CHIEF_AUDITOR' || user?.role === 'FINANCIAL_AUDITOR';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Treasury & Disbursements</span>
            <span>·</span>
            <span>General Ledger</span>
            <span>·</span>
            <span className="font-mono text-sky-700">{filteredTransactions.length} Verified Entries</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            General Ledger Financial Transactions
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Certified financial disbursements, bank wire releases, purchase order encumbrances, and invoice documentation linkages.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post New Voucher</span>
          </button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-md border border-[#E2E8F0] shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by reference, vendor, invoice #, or GL description..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded text-xs text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E293B] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="FLAGGED">Flagged / Anomaly</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="CLEARED">Cleared</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E293B] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="CAPEX">CAPEX</option>
            <option value="OPEX">OPEX</option>
            <option value="SOFTWARE">Software / Cloud</option>
            <option value="LOGISTICS">Logistics & Freight</option>
            <option value="CONSULTING">Advisory & Legal</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] text-[#64748B] font-medium select-none">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Transaction Ref</th>
                <th className="py-2.5 px-3">Vendor / Beneficiary</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Invoice & PO Match</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Supporting Doc</th>
                <th className="py-2.5 px-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[#1E293B]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    Loading financial ledger records...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isFlagged = tx.status === 'FLAGGED';
                  const isReconciled = tx.status === 'RECONCILED';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isFlagged ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#64748B] tabular-nums">
                        {tx.date.split('T')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-sky-700 font-semibold tabular-nums">
                        {tx.transactionRef}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[#1E293B]">
                        <div className="font-semibold truncate max-w-[200px]">{tx.vendorName}</div>
                        <div className="text-[11px] text-[#64748B] truncate max-w-[200px]">{tx.description}</div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[#64748B]">
                        <span className="text-[11px] font-mono text-slate-600">
                          {tx.category} · {tx.glAccount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{tx.invoiceNumber || 'No Invoice'}</span>
                          {tx.purchaseOrderNumber && (
                            <>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500">{tx.purchaseOrderNumber}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#1E293B] tabular-nums">
                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {tx.hasDocument ? (
                          <button
                            onClick={() => onSelectDocument(tx.documentId || '', tx.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Attached</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans text-rose-600 font-medium">
                            <FileWarning className="w-3.5 h-3.5 text-rose-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-700">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>{tx.discrepancyType || 'FLAGGED'}</span>
                          </span>
                        ) : isReconciled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>RECONCILED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{tx.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Voucher Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-lg max-w-lg w-full p-6 text-xs text-[#1E293B] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-base font-semibold text-[#1E293B]">Post Financial Voucher to General Ledger</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[#64748B] font-medium mb-1">Vendor / Beneficiary Name *</label>
                <input
                  type="text"
                  required
                  value={formData.vendorName}
                  onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="e.g. Titan Cloud Systems LLC"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-medium mb-1">Amount ($ USD) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="25000.00"
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="OPEX">OPEX</option>
                    <option value="CAPEX">CAPEX</option>
                    <option value="SOFTWARE">Software & Cloud</option>
                    <option value="LOGISTICS">Logistics & Freight</option>
                    <option value="CONSULTING">Consulting & Legal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] font-medium mb-1">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-99"
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] font-medium mb-1">Purchase Order Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.purchaseOrderNumber}
                    onChange={e => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                    placeholder="e.g. PO-2026-401"
                    className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">General Ledger Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Purpose of disbursement, authorization trail, department details..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Posting Voucher...' : 'Confirm & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
