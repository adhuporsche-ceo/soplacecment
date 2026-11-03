import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { AuditWorkpaperPackage } from '../../types.ts';
import {
  FileCheck2,
  ShieldCheck,
  Download,
  Copy,
  Check,
  X,
  Printer,
  FileCode,
  Hash,
} from 'lucide-react';

interface WorkpaperExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkpaperExportModal: React.FC<WorkpaperExportModalProps> = ({ isOpen, onClose }) => {
  const [packageData, setPackageData] = useState<AuditWorkpaperPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkpapers();
    }
  }, [isOpen]);

  const loadWorkpapers = async () => {
    setIsLoading(true);
    try {
      const data = await api.exportWorkpapers();
      setPackageData(data);
    } catch (err) {
      console.error('Failed to generate workpapers package:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHash = () => {
    if (!packageData) return;
    navigator.clipboard.writeText(packageData.sha256Checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!packageData) return;
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packageData.exportId}_Manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-3xl w-full p-6 text-slate-900 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Cryptographic Audit Workpaper Package
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                SOX § 404 & IIA International Standards Electronic Evidence Manifest
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !packageData ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Generating cryptographic workpaper bundle and computing SHA-256 integrity seal...
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Seal & Checksum Banner */}
            <div className="bg-[#F8F9FA] border border-slate-200 rounded p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Electronic Evidentiary Seal
                </span>
                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded">
                  {packageData.tamperProofSeal}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-700 bg-white border border-slate-200 p-2 rounded">
                <div className="flex items-center gap-1.5 truncate">
                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500">SHA-256:</span>
                  <span className="truncate select-all text-slate-900 font-medium">
                    {packageData.sha256Checksum}
                  </span>
                </div>
                <button
                  onClick={handleCopyHash}
                  className="p-1 text-slate-500 hover:text-slate-800 shrink-0 cursor-pointer"
                  title="Copy SHA-256 Digest"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Scope & Attestation Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white border border-slate-200 p-3.5 rounded">
              <div>
                <span className="text-slate-500">Audit Dossier:</span>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {packageData.exportId}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Fiscal Period:</span>
                <div className="font-mono text-slate-900 mt-0.5">
                  {packageData.fiscalYear}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Lead Signatory:</span>
                <div className="font-medium text-slate-900 mt-0.5">
                  {packageData.generatedBy}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Certified Date:</span>
                <div className="font-mono text-slate-700 mt-0.5">
                  {new Date(packageData.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F8F9FA] border border-slate-200 p-3 rounded text-center">
                <div className="text-[11px] text-slate-500">Total Spend Examined</div>
                <div className="font-mono text-base font-bold text-slate-900 mt-1 tabular-nums">
                  ${(packageData.summary.totalSpendYTD / 1000000).toFixed(2)}M
                </div>
              </div>

              <div className="bg-[#F8F9FA] border border-slate-200 p-3 rounded text-center">
                <div className="text-[11px] text-slate-500">Active Findings</div>
                <div className="font-mono text-base font-bold text-amber-700 mt-1 tabular-nums">
                  {packageData.summary.totalFindings}
                </div>
              </div>

              <div className="bg-[#F8F9FA] border border-slate-200 p-3 rounded text-center">
                <div className="text-[11px] text-slate-500">SOX Deficiencies</div>
                <div className="font-mono text-base font-bold text-rose-700 mt-1 tabular-nums">
                  {packageData.summary.soxDeficiencies}
                </div>
              </div>

              <div className="bg-[#F8F9FA] border border-slate-200 p-3 rounded text-center">
                <div className="text-[11px] text-slate-500">Benford Conformity</div>
                <div className="font-mono text-xs font-bold text-slate-900 mt-1.5">
                  {packageData.summary.benfordConformity}
                </div>
              </div>
            </div>

            {/* Official Legal Attestation Statement */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs text-slate-700 leading-relaxed">
              <div className="font-semibold text-slate-900 mb-1">
                Auditor Statement of Independence & Attestation:
              </div>
              <p className="italic">
                "{packageData.attestationStatement}"
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Sign-off: {packageData.signOffLeadAuditor}</span>
                <span>Audit Committee Copy · Strict Confidentiality</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white bg-sky-600 rounded hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Workpapers (JSON)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
