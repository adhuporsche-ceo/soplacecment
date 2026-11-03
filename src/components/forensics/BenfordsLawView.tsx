import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { api } from '../../services/api.ts';
import { BenfordAnalysisResult } from '../../types.ts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  Info,
  ExternalLink,
} from 'lucide-react';

export const BenfordsLawView: React.FC = () => {
  const [data, setData] = useState<BenfordAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);

  const loadBenford = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBenfordAnalysis();
      setData(res);
    } catch (err) {
      console.error('Failed to load Benford analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBenford();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
          <span>Running forensic first-digit distribution analysis...</span>
        </div>
      </div>
    );
  }

  const chartData = data.digitStats.map(stat => ({
    digit: `Digit ${stat.digit}`,
    digitNum: stat.digit,
    Observed: stat.observedFrequency,
    Expected: stat.theoreticalFrequency,
    isAnomalous: stat.isAnomalous,
    diff: stat.difference,
  }));

  const filteredTransactions = selectedDigit
    ? data.highRiskTransactions.filter(t => t.firstDigit === selectedDigit)
    : data.highRiskTransactions;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Forensic Intelligence</span>
            <span>·</span>
            <span>Benford's Law (First-Digit Test)</span>
            <span>·</span>
            <span className="font-mono text-sky-700">P(d) = log₁₀(1 + 1/d)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Statistical Ledger Anomaly & Threshold Avoidance Analysis
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Compares 1st-digit frequencies of general ledger disbursements and vendor invoices against theoretical logarithmic distributions to uncover manual manipulations and invoice splitting.
          </p>
        </div>

        <button
          onClick={loadBenford}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Evaluated Sample Size
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {data.totalSampleCount}
            </span>
            <span className="text-xs text-slate-500">ledger records</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Vouchers & Purchase Invoices
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Chi-Square Statistic (χ²)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {data.chiSquareStatistic}
            </span>
            <span className="text-xs font-mono text-slate-500">
              (Critical: {data.criticalThreshold95})
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Degrees of freedom: 8 · α = 0.05
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Conformity Rating
          </div>
          <div className="mt-2 flex items-center gap-2">
            {data.conformityRating === 'CONFORMING' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span className="text-sm font-semibold font-mono tracking-tight text-slate-900">
              {data.conformityRating.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {data.conformityRating === 'CONFORMING'
              ? 'Conforms to natural financial curve'
              : 'Statistical deviation detected'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Anomalous Digits Flagged
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {data.digitStats.filter(s => s.isAnomalous).length}
            </span>
            <span className="text-xs text-slate-500">
              of 9 testable digits
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Exceeding ±5.5% deviation bound
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Observed Disbursement Frequency vs Theoretical Benford Expectation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any digit bar to inspect underlying transactions that skew the sample.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-sky-600 rounded-xs" />
              <span className="text-slate-600">Observed Sample %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-slate-300 rounded-xs" />
              <span className="text-slate-600">Theoretical Benford %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded-xs" />
              <span className="text-slate-600">Anomalous Spike</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const digit = e.activePayload[0].payload.digitNum;
                  setSelectedDigit(selectedDigit === digit ? null : digit);
                }
              }}
            >
              <XAxis dataKey="digit" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                        <div className="font-semibold text-slate-900">{d.digit}</div>
                        <div className="text-slate-600 mt-1">
                          Observed: <span className="font-mono font-medium text-slate-900">{d.Observed}%</span>
                        </div>
                        <div className="text-slate-600">
                          Expected: <span className="font-mono text-slate-700">{d.Expected}%</span>
                        </div>
                        <div className={`mt-1 font-mono font-medium ${d.diff > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          Difference: {d.diff > 0 ? `+${d.diff}%` : `${d.diff}%`}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="Observed" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isAnomalous ? '#F59E0B' : selectedDigit === entry.digitNum ? '#0284C7' : '#0EA5E9'}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                ))}
              </Bar>
              <Bar dataKey="Expected" fill="#E2E8F0" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Digit Breakdown Grid */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Digit Distribution Details
          </h3>
          <span className="text-xs text-slate-500">
            Click row to filter anomalous transactions below
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-slate-600 border-b border-slate-200 font-medium">
              <tr>
                <th className="py-2.5 px-4">Leading Digit</th>
                <th className="py-2.5 px-4 text-right">Observed Count</th>
                <th className="py-2.5 px-4 text-right">Observed Freq (%)</th>
                <th className="py-2.5 px-4 text-right">Theoretical Benford (%)</th>
                <th className="py-2.5 px-4 text-right">Deviation</th>
                <th className="py-2.5 px-4">Diagnostic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {data.digitStats.map((stat) => {
                const isSelected = selectedDigit === stat.digit;
                return (
                  <tr
                    key={stat.digit}
                    onClick={() => setSelectedDigit(isSelected ? null : stat.digit)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      Digit {stat.digit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {stat.observedCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                      {stat.observedFrequency}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                      {stat.theoreticalFrequency}%
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono tabular-nums font-medium ${
                      stat.difference > 5.5 ? 'text-amber-700' : stat.difference < -5.5 ? 'text-slate-500' : 'text-slate-700'
                    }`}>
                      {stat.difference > 0 ? `+${stat.difference}%` : `${stat.difference}%`}
                    </td>
                    <td className="py-2.5 px-4">
                      {stat.isAnomalous ? (
                        <span className="font-mono text-amber-700 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ANOMALOUS SPIKE</span>
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500">CONFORMING</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagged Transactions for Anomaly Digits */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Transactions Skewing Distribution
              {selectedDigit && (
                <span className="ml-2 font-normal text-xs text-sky-700">
                  (Filtered by Digit {selectedDigit})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Disbursements located near internal approval thresholds ($5,000, $7,500, $10,000) that artificially elevate leading digits.
            </p>
          </div>
          {selectedDigit && (
            <button
              onClick={() => setSelectedDigit(null)}
              className="text-xs text-sky-700 hover:text-sky-800 font-medium cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-slate-600 border-b border-slate-200 font-medium">
              <tr>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4">Vendor</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-center">Digit</th>
                <th className="py-2.5 px-4">Forensic Risk Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No transactions currently matching the selected digit filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-sky-700">
                      {tx.transactionRef}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {tx.vendorName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {tx.category}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                      {tx.firstDigit}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px] max-w-md">
                      {tx.deviationReason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
