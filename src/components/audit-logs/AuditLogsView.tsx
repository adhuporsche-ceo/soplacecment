import React, { useState } from 'react';
import { AuditLog } from '../../types.ts';
import { ScrollText, Search, Shield, Filter, Eye } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
  isLoading: boolean;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, isLoading }) => {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.entityType.toLowerCase().includes(search.toLowerCase()) ||
    log.ipAddress.includes(search)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Immutable System Audit Trail</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
              SOX §404 Verified
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cryptographically timestamped user actions, permission checks, workflow transitions, and ledger mutations.
          </p>
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
            placeholder="Search action code, auditor name, entity ID, or IP..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">User & Persona</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Network IP</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold text-slate-200">{log.userName}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{log.userRole}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-cyan-300 border border-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {log.entityType} <span className="text-slate-600">·</span> {log.entityId}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {log.ipAddress}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      View Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 text-xs text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Log Event Metadata Payload</h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Action: {selectedLog.action}</span>
                <span>User: {selectedLog.userName}</span>
              </div>
              <pre className="p-4 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-80">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="text-right pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
