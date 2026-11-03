import React, { useState } from 'react';
import { Vendor } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Building2,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  AlertTriangle,
  CreditCard,
  FileCheck,
  X,
} from 'lucide-react';

interface VendorManagementViewProps {
  vendors: Vendor[];
  isLoading: boolean;
  onRefresh: () => void;
  onSaveVendor: (vendor: Partial<Vendor>) => Promise<void>;
}

export const VendorManagementView: React.FC<VendorManagementViewProps> = ({
  vendors,
  isLoading,
  onRefresh,
  onSaveVendor,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    category: 'Software & Infrastructure',
    riskRating: 'LOW' as any,
    paymentTerms: 'NET 30',
    bankAccountLast4: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.taxId.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || v.riskRating === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleOpenModal = (v?: Vendor) => {
    if (v) {
      setSelectedVendor(v);
      setFormData({
        name: v.name,
        taxId: v.taxId,
        category: v.category,
        riskRating: v.riskRating,
        paymentTerms: v.paymentTerms,
        bankAccountLast4: v.bankAccountLast4,
      });
    } else {
      setSelectedVendor(null);
      setFormData({
        name: '',
        taxId: '',
        category: 'Software & Infrastructure',
        riskRating: 'LOW',
        paymentTerms: 'NET 30',
        bankAccountLast4: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.taxId) return;

    setIsSubmitting(true);
    try {
      await onSaveVendor({
        id: selectedVendor ? selectedVendor.id : undefined,
        ...formData,
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'CHIEF_AUDITOR' || user?.role === 'FINANCIAL_AUDITOR';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Vendor Risk & Compliance Directory</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              {vendors.length} Verified Vendors
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier due-diligence, tax identification numbers, verified banking settlement routes, and risk ratings.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vendor</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendor name, Tax ID, or category..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Risk Ratings</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map(v => {
          const isHighRisk = v.riskRating === 'HIGH';
          const isMediumRisk = v.riskRating === 'MEDIUM';

          return (
            <div
              key={v.id}
              className="p-5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{v.name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{v.taxId}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    isHighRisk
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      : isMediumRisk
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  }`}>
                    {v.riskRating} RISK
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  {v.category}
                </div>

                {/* Details Matrix */}
                <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Payment Terms:</span>
                    <span className="text-white">{v.paymentTerms}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Settlement Account:</span>
                    <span className="text-cyan-300">•••• •••• {v.bankAccountLast4}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Spend YTD:</span>
                    <span className="text-white font-bold">${v.totalSpendYTD.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Active Discrepancies:</span>
                    <span className={v.activeDiscrepancies > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                      {v.activeDiscrepancies}
                    </span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleOpenModal(v)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Edit Profile & Risk
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 text-xs text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">
                {selectedVendor ? 'Edit Vendor Risk Profile' : 'Register New Vendor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Vendor Entity Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Precision Tools Inc"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Tax ID / EIN *</label>
                  <input
                    type="text"
                    required
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="US-XX-XXXXXXX"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Risk Rating</label>
                  <select
                    value={formData.riskRating}
                    onChange={e => setFormData({ ...formData, riskRating: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="NET 15">NET 15</option>
                    <option value="NET 30">NET 30</option>
                    <option value="NET 45">NET 45</option>
                    <option value="NET 60">NET 60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Bank Acct (Last 4)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.bankAccountLast4}
                    onChange={e => setFormData({ ...formData, bankAccountLast4: e.target.value })}
                    placeholder="9012"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Industry Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Heavy Machinery, Logistics, Cloud"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Vendor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
