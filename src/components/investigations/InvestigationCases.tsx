import React, { useState } from 'react';
import { AuditCase, CaseStatus } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Briefcase,
  Plus,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  XCircle,
  FileText,
  Send,
  X,
} from 'lucide-react';

interface InvestigationCasesProps {
  cases: AuditCase[];
  isLoading: boolean;
  onRefresh: () => void;
  onTransitionStatus: (caseId: string, targetStatus: CaseStatus, reason: string) => Promise<void>;
  onAddNote: (caseId: string, text: string) => Promise<void>;
}

const STATUS_LABELS: Record<CaseStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUBMITTED: { label: 'Submitted', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-sky-100 text-sky-900 border-sky-300' },
  EVIDENCE_REQUIRED: { label: 'Evidence Required', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  APPROVED: { label: 'Approved', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const ALLOWED_NEXT_STATES: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['EVIDENCE_REQUIRED', 'APPROVED', 'REJECTED'],
  EVIDENCE_REQUIRED: ['UNDER_REVIEW', 'REJECTED'],
  APPROVED: ['RESOLVED'],
  REJECTED: ['CLOSED', 'DRAFT'],
  RESOLVED: ['CLOSED', 'UNDER_REVIEW'],
  CLOSED: ['UNDER_REVIEW'],
};

export const InvestigationCases: React.FC<InvestigationCasesProps> = ({
  cases,
  isLoading,
  onTransitionStatus,
  onAddNote,
}) => {
  const { user } = useAuth();
  const [selectedCase, setSelectedCase] = useState<AuditCase | null>(cases[0] || null);
  const [newNoteText, setNewNoteText] = useState('');
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [selectedNextState, setSelectedNextState] = useState<CaseStatus>('UNDER_REVIEW');
  const [transitionReason, setTransitionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedCase if cases update
  const currentCase = cases.find(c => c.id === selectedCase?.id) || cases[0] || null;

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase || !transitionReason.trim()) return;

    setIsSubmitting(true);
    try {
      await onTransitionStatus(currentCase.id, selectedNextState, transitionReason);
      setTransitionModalOpen(false);
      setTransitionReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase || !newNoteText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddNote(currentCase.id, newNoteText);
      setNewNoteText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedNext = currentCase ? (ALLOWED_NEXT_STATES[currentCase.status] || []) : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
            <span>Special Investigations Unit</span>
            <span>·</span>
            <span>Case Management Pipeline</span>
            <span>·</span>
            <span className="font-mono text-sky-700">{cases.length} Formal Investigations</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Audit Investigation Lifecycle
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Strict sequential state machine transitions: DRAFT → SUBMITTED → UNDER REVIEW → EVIDENCE REQUIRED → APPROVED/REJECTED → RESOLVED.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Left Case List, Right Selected Case Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-1">
            Active Investigations
          </div>

          <div className="space-y-2.5">
            {cases.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-white">
                No active audit cases found.
              </div>
            ) : (
              cases.map(c => {
                const isSelected = currentCase?.id === c.id;
                const statusMeta = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50/60 border-sky-400 shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-sky-700 font-semibold">{c.caseNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#1E293B] truncate mb-1">
                      {c.title}
                    </h3>

                    <p className="text-[11px] text-[#64748B] line-clamp-2 mb-2">
                      {c.summary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-slate-100 font-mono">
                      <span>Lead: {c.leadInvestigatorName.split(' ')[0]}</span>
                      <span>Due: {c.dueDate.split('T')[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Deep Dive & Action Workbench */}
        {currentCase ? (
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-md bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-sky-700 font-bold">{currentCase.caseNumber}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-[#64748B] font-mono">Priority: {currentCase.priority}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-[#64748B] font-mono">Due: {currentCase.dueDate.split('T')[0]}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#1E293B] mt-1">
                    {currentCase.title}
                  </h2>
                </div>

                {/* Workflow Transition CTA */}
                {allowedNext.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedNextState(allowedNext[0]);
                      setTransitionModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                  >
                    <span>Advance Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status and Investigator Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="text-[10px] text-[#64748B]">Current Workflow State</div>
                  <div className="font-semibold text-sky-800 mt-0.5">
                    {STATUS_LABELS[currentCase.status]?.label || currentCase.status}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="text-[10px] text-[#64748B]">Lead Investigator</div>
                  <div className="font-semibold text-[#1E293B] mt-0.5 truncate">
                    {currentCase.leadInvestigatorName}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E2E8F0] col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-[#64748B]">Linked Findings</div>
                  <div className="font-semibold text-amber-700 mt-0.5">
                    {currentCase.findingIds.length} Discrepancy Findings
                  </div>
                </div>
              </div>

              {/* Case Summary */}
              <div>
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                  Executive Case Brief
                </div>
                <p className="text-xs text-slate-700 leading-relaxed p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
                  {currentCase.summary}
                </p>
              </div>

              {/* State Transitions Audit Trail */}
              <div>
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                  Workflow History (Audit Trail)
                </div>
                <div className="space-y-1.5">
                  {currentCase.transitions?.map((tr, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-slate-700 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#1E293B]">
                          {tr.from} <span className="text-slate-400">→</span> <span className="text-sky-700 font-semibold">{tr.to}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{tr.reason}</div>
                      </div>
                      <div className="text-right text-[10px] font-mono text-[#64748B] shrink-0">
                        <div>{tr.changedBy}</div>
                        <div>{tr.timestamp.split('T')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Case Notes & Investigator Communication */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Investigation Notes & Inquiries ({currentCase.notes?.length || 0})</span>
                </div>

                <div className="space-y-2 mb-3 pr-1">
                  {currentCase.notes?.map(note => (
                    <div key={note.id} className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#1E293B]">{note.authorName}</span>
                        <span className="text-[#64748B] font-mono text-[10px]">
                          {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {note.timestamp.split('T')[0]}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-sans">{note.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Log formal audit inquiry note, vendor interview notes, or ERP findings..."
                    className="flex-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E293B] focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !newNoteText.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-white">
            Select an investigation case to view details and action workbench.
          </div>
        )}
      </div>

      {/* Transition Modal */}
      {transitionModalOpen && currentCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-lg max-w-md w-full p-6 text-xs text-[#1E293B] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#1E293B]">Advance Audit Workflow State</h2>
              <button onClick={() => setTransitionModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[#64748B] font-medium mb-1">Current State</label>
                <div className="p-2 rounded bg-[#F8F9FA] border border-[#E2E8F0] font-mono text-sky-800 font-semibold">
                  {currentCase.status}
                </div>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">Target State (Backend Enforced)</label>
                <select
                  value={selectedNextState}
                  onChange={e => setSelectedNextState(e.target.value as CaseStatus)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[#1E293B] font-mono focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {allowedNext.map(st => (
                    <option key={st} value={st}>
                      {st} ({STATUS_LABELS[st]?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">Audit Justification / Formal Rationale *</label>
                <textarea
                  rows={3}
                  required
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="State evidence reviewed, regulatory checks, vendor interviews, or compliance sign-off rationale..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-[#1E293B] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setTransitionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !transitionReason.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Recording Transition...' : 'Execute Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
