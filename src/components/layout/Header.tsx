import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  ShieldCheck,
  Activity,
  Bell,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types.ts';
import { NavModule } from './Sidebar.tsx';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  referenceId?: string;
}

interface HeaderProps {
  currentModule: string;
  onOpenReport: () => void;
  onTriggerReconciliation: () => void;
  isScanning: boolean;
  liveSocketConnected: boolean;
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  onNavigateToModule: (mod: NavModule) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  CHIEF_AUDITOR: 'Chief Auditor',
  FINANCIAL_AUDITOR: 'Financial Auditor',
  DEPARTMENT_MANAGER: 'Department Manager',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  FACULTY: 'Faculty',
  STUDENT: 'Student',
};

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onOpenReport,
  onTriggerReconciliation,
  isScanning,
  liveSocketConnected,
  notifications = [],
  onMarkNotificationRead,
  onNavigateToModule,
}) => {
  const { user, logout } = useAuth();
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="site-header">
      {/* Zone 1: Single-element Brand Wordmark */}
      <button className="brand-lockup" onClick={() => onNavigateToModule('DASHBOARD')} aria-label="AuditMind 360 home">
        <span className="brand-mark"><ShieldCheck className="w-4.5 h-4.5" /></span>
        <span className="brand-name">AuditMind 360</span>
      </button>

      {/* Zone 2: Navigation Breadcrumb & Live Socket Status */}
      <nav className="header-links" aria-label="Page sections">
        <button onClick={() => onNavigateToModule('DASHBOARD')} aria-current={currentModule === 'Executive Overview' ? 'location' : undefined}>Overview</button>
        <button onClick={() => onNavigateToModule('TRANSACTIONS')}>Audit workspace</button>
        <button onClick={() => onNavigateToModule('SOX_CONTROLS')}>Controls</button>
      </nav>

      {/* Zone 3: Primary Actions & Instant Role Switcher */}
      <div className="header-actions">
        <span className="header-live-status" title={liveSocketConnected ? 'Live Socket Sync' : 'Polling'}>
          <span className={`inline-block w-2 h-2 rounded-full ${liveSocketConnected ? 'bg-teal-600' : 'bg-slate-400'}`} />
          <span>{liveSocketConnected ? 'Live' : 'Polling'}</span>
        </span>
        {/* Quick Reconcile CTA (Auditor roles) */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'CHIEF_AUDITOR' || user?.role === 'FINANCIAL_AUDITOR') && (
          <button
            onClick={onTriggerReconciliation}
            disabled={isScanning}
            className="header-scan-button px-3 py-1.5 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Activity className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-sky-600' : 'text-sky-600'}`} />
            <span>{isScanning ? 'Scanning...' : 'Run Audit Scan'}</span>
          </button>
        )}

        {/* Generate Report Button */}
        <button
          onClick={onOpenReport}
          className="px-3 py-1.5 text-xs font-medium text-[#1E293B] bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
        >
          Audit Dossier
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
            className="relative p-2 rounded bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] transition-colors cursor-pointer shadow-2xs"
            title="Real-Time Audit Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky-600 text-white rounded-full font-mono text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Drawer */}
          {notifDrawerOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-md bg-white border border-[#E2E8F0] shadow-lg p-3 z-50 text-xs text-[#1E293B]">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <span className="font-semibold text-[#1E293B]">Audit Notifications</span>
                <span className="font-mono text-[10px] text-sky-700 font-medium">{unreadCount} unread</span>
              </div>

              <div className="space-y-2 mt-2">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-[#64748B] text-xs">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map(n => {
                    const isFinding = n.type === 'FINDING';
                    const isCase = n.type === 'CASE';
                    const isAction = n.type === 'ACTION';

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (onMarkNotificationRead) onMarkNotificationRead(n.id);
                          if (onNavigateToModule) {
                            if (isFinding) onNavigateToModule('RECONCILIATION');
                            else if (isCase) onNavigateToModule('CASES');
                            else if (isAction) onNavigateToModule('ACTIONS');
                          }
                          setNotifDrawerOpen(false);
                        }}
                        className={`p-2.5 rounded border transition-colors cursor-pointer ${
                          n.isRead
                            ? 'bg-[#F8F9FA] border-slate-100 text-[#64748B]'
                            : 'bg-white border-sky-200 text-[#1E293B]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-sky-700 font-semibold">{n.type}</span>
                          <span className="text-[#64748B]">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-semibold text-[#1E293B] truncate text-xs">{n.title}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">{n.message}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-account">
          <div className="header-account-avatar" aria-hidden="true">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="header-account-copy">
            <span>{user?.name}</span>
            <small>{user?.role ? ROLE_LABELS[user.role] : ''}</small>
          </div>
          <button
            className="header-signout"
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
