import React, { useState } from 'react';
import { EvidenceDocument, FinancialTransaction } from '../../types.ts';
import {
  FileText,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  Eye,
  ShieldCheck,
  X,
} from 'lucide-react';

interface EvidenceIntelligenceProps {
  documents: EvidenceDocument[];
  transactions: FinancialTransaction[];
  isLoading: boolean;
  onUploadDocument: (doc: {
    fileName: string;
    ocrText: string;
    fileType: string;
    fileSize: number;
    transactionId?: string;
  }) => Promise<void>;
}

export const EvidenceIntelligence: React.FC<EvidenceIntelligenceProps> = ({
  documents,
  transactions,
  isLoading,
  onUploadDocument,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDocument | null>(documents[0] || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form State
  const [fileName, setFileName] = useState('');
  const [selectedTxId, setSelectedTxId] = useState('');
  const [ocrText, setOcrText] = useState('');

  // Sample templates to simulate realistic OCR receipts/invoices
  const sampleTemplates = [
    {
      label: 'Titan Cloud Compute Invoice (Clean Match)',
      fileName: 'Titan_Cloud_Invoice_TCS8900.pdf',
      ocrText: `TITAN CLOUD SYSTEMS LLC\nTax ID: US-94-2819034\nInvoice Number: INV-TCS-8900\nDate: 2026-03-14\nBill To: Apex Global Corporation\nDescription: Quarterly CDN bandwidth and multi-region redundancy pool\nSubtotal: $45,000.00\nTotal Due: $45,000.00\nTerms: Net 30 - Direct Wire`,
    },
    {
      label: 'Nordic Logistics Surcharge (Demurrage Anomaly)',
      fileName: 'Nordic_Freight_INV9044_Discrepant.pdf',
      ocrText: `NORDIC SUPPLY & FREIGHT LOGISTICS\nInvoice Number: INV-NSF-9044\nDate: 2026-03-12\nBase Drayage: $32,000.00\nFuel Surcharge: $4,200.00\nUnapproved Port Detention: $8,900.00\nTotal Invoiced: $45,100.00\nNOTICE: Carrier claims terminal congestion demurrage. Driver log unsigned.`,
    },
    {
      label: 'Emergency Spindle Overhaul (Unusual Amount)',
      fileName: 'ApexPrecision_Spindle_INV1200.pdf',
      ocrText: `APEX PRECISION EQUIPMENT\nInvoice Number: INV-APE-1200\nPO Number: PO-2026-5100\nDate: 2026-03-12\nMachinery Part: Emergency hydraulic spindle overhaul for Assembly Line 3\nLabor & Overtime expedite fee: $145,000.00\nParts Total: $330,000.00\nTotal Payable: $475,000.00\nAuthorized by: Plant Detroit Ops`,
    },
  ];

  const handleTemplateSelect = (tpl: typeof sampleTemplates[0]) => {
    setFileName(tpl.fileName);
    setOcrText(tpl.ocrText);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !ocrText) return;

    setIsUploading(true);
    try {
      await onUploadDocument({
        fileName,
        ocrText,
        fileType: 'application/pdf',
        fileSize: Math.floor(200000 + Math.random() * 400000),
        transactionId: selectedTxId || undefined,
      });
      setShowUploadModal(false);
      setFileName('');
      setOcrText('');
      setSelectedTxId('');
    } finally {
      setIsUploading(false);
    }
  };

  const currentDoc = documents.find(d => d.id === selectedDoc?.id) || documents[0] || null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Document Intelligence & OCR Vault</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              {documents.length} Verified Evidence Records
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-assisted OCR text extraction, automated ledger matching, and forensic discrepancy identification.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Verify Document</span>
        </button>
      </div>

      {/* Main Grid: Document List on Left, OCR & AI Verification on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Documents List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Archived Evidence Documents
          </div>

          <div className="space-y-2.5">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-slate-800">
                No evidence documents uploaded yet.
              </div>
            ) : (
              documents.map(doc => {
                const isSelected = currentDoc?.id === doc.id;
                const isSuspicious = doc.aiVerification?.isSuspicious;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate max-w-[200px]">
                        <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{doc.fileName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        isSuspicious
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                      }`}>
                        {isSuspicious ? 'Anomaly Flagged' : 'Verified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                      <span>By: {doc.uploadedBy}</span>
                      <span>{(doc.fileSize / 1024).toFixed(0)} KB · {doc.uploadedAt.split('T')[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep OCR & AI Verification View */}
        {currentDoc ? (
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-cyan-400 font-bold">{currentDoc.fileName}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400 font-mono">PDF Document</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Uploaded by {currentDoc.uploadedBy} on {currentDoc.uploadedAt.split('T')[0]}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    Match Confidence: {((currentDoc.aiVerification?.confidenceScore || 0.95) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* AI Verification Results Card */}
              {currentDoc.aiVerification && (
                <div className={`p-4 rounded-lg border ${
                  currentDoc.aiVerification.isSuspicious
                    ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                    : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                } space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-xs">
                      {currentDoc.aiVerification.isSuspicious ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>
                        {currentDoc.aiVerification.isSuspicious
                          ? 'Forensic Anomaly Detected in Document'
                          : 'Valid Supporting Documentation'}
                      </span>
                    </div>

                    <span className="font-mono text-xs tabular-nums font-bold">
                      Detected: ${currentDoc.aiVerification.amountDetected?.toLocaleString() || 'N/A'}
                    </span>
                  </div>

                  {currentDoc.aiVerification.discrepanciesNoted.length > 0 && (
                    <div className="pt-2 border-t border-rose-900/40 space-y-1 text-xs">
                      <div className="font-semibold text-rose-300 text-[11px]">Audit Exceptions:</div>
                      {currentDoc.aiVerification.discrepanciesNoted.map((d, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-rose-200/90 text-[11px]">
                          <span className="text-rose-400 font-bold">·</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OCR Text Viewer */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>OCR Extracted Text Stream</span>
                  <span className="text-[10px] text-slate-500 font-mono">UTF-8 Optical Transcribe</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed border border-slate-800/80">
                  {currentDoc.ocrExtractedText || 'No text extracted.'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-xs text-slate-500 rounded-lg border border-slate-800">
            Select a document to inspect OCR text stream and forensic verification.
          </div>
        )}
      </div>

      {/* Upload Modal with Simulated OCR Samples */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 text-xs text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Upload Financial Document & Extract OCR</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Demo Templates */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">
                Load Realistic Audit Test Document:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {sampleTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTemplateSelect(tpl)}
                    className="p-2 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center justify-between"
                  >
                    <span className="text-slate-300 font-medium">{tpl.label}</span>
                    <span className="text-cyan-400 text-[10px] font-mono">Load Sample →</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="e.g. Invoice_2026_Titan.pdf"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Link to Financial Transaction (Optional)</label>
                <select
                  value={selectedTxId}
                  onChange={e => setSelectedTxId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="">None / Independent Evidence</option>
                  {transactions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.transactionRef} · {t.vendorName} (${t.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">OCR Document Content Stream *</label>
                <textarea
                  rows={6}
                  required
                  value={ocrText}
                  onChange={e => setOcrText(e.target.value)}
                  placeholder="Paste or edit extracted OCR text here..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded disabled:opacity-50"
                >
                  {isUploading ? 'Verifying with Gemini...' : 'Upload & Verify with AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
