import React, { useState } from 'react';
import { InventoryAsset } from '../../types.ts';
import { Boxes, AlertTriangle, CheckCircle, Search, MapPin, Calendar } from 'lucide-react';

interface InventoryAuditViewProps {
  inventory: InventoryAsset[];
  isLoading: boolean;
}

export const InventoryAuditView: React.FC<InventoryAuditViewProps> = ({
  inventory,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalVarianceValue = inventory.reduce((sum, item) => sum + item.varianceValue, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Inventory Physical Audit & Reconciliation</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {inventory.length} Tracked Asset SKUs
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Physical cycle count verification vs ERP inventory ledger balances and shortage risk calculations.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400">Total Asset SKUs Audited</div>
          <div className="mt-1 text-2xl font-bold text-white font-mono tabular-nums">
            {inventory.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">High-value enterprise machinery & hardware</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/80 border border-rose-950/60">
          <div className="text-xs text-rose-300">Net Inventory Variance Exposure</div>
          <div className="mt-1 text-2xl font-bold text-rose-400 font-mono tabular-nums">
            ${Math.abs(totalVarianceValue).toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-300/70 mt-0.5">Physical count shortfall exposure</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400">Warehouses Covered</div>
          <div className="mt-1 text-2xl font-bold text-cyan-300 font-mono tabular-nums">
            3 Facilities
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Chicago, Detroit, IT Sec Vault</div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, component name, or facility location..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-medium">
                <th className="py-2.5 px-3">SKU & Part Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Ledger Qty</th>
                <th className="py-2.5 px-3 text-right">Physical Count</th>
                <th className="py-2.5 px-3 text-right">Variance Units</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-3 text-right">Exposure Value</th>
                <th className="py-2.5 px-3">Audit Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map(item => {
                const hasVariance = item.discrepancyUnits !== 0;

                return (
                  <tr key={item.id} className={`hover:bg-slate-800/40 transition-colors ${hasVariance ? 'bg-rose-950/10' : ''}`}>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-200">{item.name}</div>
                      <div className="font-mono text-cyan-400 text-[11px]">{item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      {item.ledgerQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      {item.physicalQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {hasVariance ? (
                        <span className="text-rose-400 font-bold">{item.discrepancyUnits} units</span>
                      ) : (
                        <span className="text-emerald-400">0 (Match)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      ${item.unitCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                      {hasVariance ? (
                        <span className="text-rose-400">${Math.abs(item.varianceValue).toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">$0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{item.location}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
