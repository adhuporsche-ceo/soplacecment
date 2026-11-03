import React, { useState } from 'react';
import { CorrectiveAction } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react';

interface CorrectiveActionsViewProps {
  actions: CorrectiveAction[];
  isLoading: boolean;
  onUpdateMilestone: (actionId: string, milestoneIndex: number, completed: boolean) => Promise<void>;
  onUpdateStatus: (actionId: string, status: string, notes?: string) => Promise<void>;
}

export const CorrectiveActionsView: React.FC<CorrectiveActionsViewProps> = ({
  actions,
  isLoading,
  onUpdateMilestone,
  onUpdateStatus,
}) => {
  const { user } = useAuth();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [verificationNoteInput, setVerificationNoteInput] = useState('');

  const now = new Date();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Corrective Action Tracking (CAPA)</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              {actions.length} Action Plans
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking post-audit remediation milestones, ERP validation rules, and regulatory controls.
          </p>
        </div>
      </div>

      {/* Action Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {actions.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-500 rounded-lg border border-slate-800">
            No corrective actions currently logged.
          </div>
        ) : (
          actions.map(action => {
            const isOverdue = action.status !== 'COMPLETED' && new Date(action.dueDate) < now;
            const completedMilestones = action.milestones.filter(m => m.completed).length;
            const totalMilestones = action.milestones.length;
            const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

            return (
              <div
                key={action.id}
                className="p-5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-400 font-semibold">{action.caseId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      action.status === 'COMPLETED'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                        : isOverdue
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                    }`}>
                      {action.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {action.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {action.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300">{action.assignedToName}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        Due: {action.dueDate.split('T')[0]}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Remediation Progress</span>
                    <span className="text-cyan-300 tabular-nums">{progressPercent}% ({completedMilestones}/{totalMilestones})</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Milestones Checklist
                  </div>
                  <div className="space-y-1.5">
                    {action.milestones.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onUpdateMilestone(action.id, idx, !m.completed)}
                        className={`w-full p-2 rounded text-left flex items-start gap-2.5 transition-colors text-xs ${
                          m.completed
                            ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-900/40'
                            : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800/40 border border-slate-800/80'
                        }`}
                      >
                        {m.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <span className={`flex-1 ${m.completed ? 'line-through opacity-80' : ''}`}>
                          {m.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verification Sign-Off Notes */}
                {action.verificationNotes && (
                  <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Sign-off Note: </span>
                    {action.verificationNotes}
                  </div>
                )}

                {/* Mark as Completed CTA */}
                {action.status !== 'COMPLETED' && completedMilestones === totalMilestones && (
                  <button
                    onClick={() => onUpdateStatus(action.id, 'COMPLETED', 'All internal validation controls deployed & verified by auditor.')}
                    className="w-full py-2 text-xs font-semibold text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-800/80 rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Approve & Mark Action Resolved</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
