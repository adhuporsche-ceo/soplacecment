import React, { useState } from 'react';
import { User, UserRole, Department } from '../../types.ts';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Search,
  KeyRound,
  X,
} from 'lucide-react';

interface UserManagementViewProps {
  users: User[];
  departments: Department[];
  isLoading: boolean;
  onCreateUser: (userData: { name: string; email: string; role: string; departmentId?: string; password: string }) => Promise<void>;
  onToggleStatus: (userId: string) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  departments,
  isLoading,
  onCreateUser,
  onToggleStatus,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'FINANCIAL_AUDITOR' as UserRole,
    departmentId: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || formData.password.length < 12) return;

    setIsSubmitting(true);
    try {
      await onCreateUser(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        role: 'FINANCIAL_AUDITOR',
        departmentId: '',
        password: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Identity & RBAC Administration Console</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              Super Administrator
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage authenticated platform users, grant role-based privilege tiers, and enforce access controls.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user by name or email address..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-md text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Administrator</option>
            <option value="CHIEF_AUDITOR">Chief Auditor</option>
            <option value="FINANCIAL_AUDITOR">Financial Auditor</option>
            <option value="DEPARTMENT_MANAGER">Department Manager</option>
            <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Name & Email</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Scoped Department</th>
                <th className="py-2.5 px-3">Last Active Login</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredUsers.map(u => {
                const dept = departments.find(d => d.id === u.departmentId);

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-200">{u.name}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-950 text-cyan-300 border border-slate-800 font-mono">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      {dept ? dept.name : 'All Enterprise Units'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        u.isActive
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      }`}>
                        {u.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <button
                        onClick={() => onToggleStatus(u.id)}
                        className={`text-xs hover:underline ${
                          u.isActive ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 text-xs text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Provision Enterprise User Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Liam Sterling (CISA)"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@auditmind360.io"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Assigned RBAC Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="FINANCIAL_AUDITOR">FINANCIAL_AUDITOR</option>
                  <option value="CHIEF_AUDITOR">CHIEF_AUDITOR</option>
                  <option value="DEPARTMENT_MANAGER">DEPARTMENT_MANAGER</option>
                  <option value="COMPLIANCE_OFFICER">COMPLIANCE_OFFICER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              {formData.role === 'DEPARTMENT_MANAGER' && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Scoped Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={1024}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Use at least 12 characters"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
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
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
