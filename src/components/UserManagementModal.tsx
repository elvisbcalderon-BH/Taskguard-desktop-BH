import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  created_at: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for creating a new user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error loading profiles:', err);
      setErrorMsg(err.message || 'Error loading user profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      // Registro en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: {
            full_name: newFullName.trim(),
            role: newRole,
          },
        },
      });

      if (authError) throw authError;

      // Si el trigger ya insertó el perfil o para asegurar que rol coincida
      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: newEmail.trim(),
          full_name: newFullName.trim() || splitEmail(newEmail),
          role: newRole,
          status: 'active',
        });
      }

      setSuccessMsg(`User ${newEmail} created successfully.`);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('member');
      loadProfiles();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setErrorMsg(err.message || 'Could not create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const splitEmail = (email: string) => email.split('@')[0];

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === currentUserProfile?.id) {
      alert('You cannot deactivate your own admin account.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: nextStatus })
        .eq('id', user.id);

      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleRoleChange = async (user: UserProfile, newRole: 'admin' | 'member') => {
    if (user.id === currentUserProfile?.id && newRole !== 'admin') {
      alert('You cannot remove admin privileges from yourself.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert('Error changing role: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-blue-400 text-xl font-bold">
              👥
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>User & Access Management</span>
                <span className="bg-blue-900/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-700/60 uppercase">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Create user accounts, set access roles, and control active permissions across PCs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-medium">
              ✓ {successMsg}
            </div>
          )}

          {/* Form Create User */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <span>➕ Register New User</span>
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Gonzalez"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@blessinghands.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="member">👤 Member (Standard Access)</option>
                  <option value="admin">🛡️ Admin (Full Control)</option>
                </select>
              </div>

              <div className="md:col-span-4 flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md transition cursor-pointer flex items-center space-x-1.5"
                >
                  <span>{isSubmitting ? 'Creating User...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Organization Members & Roles</span>
                <span className="text-xs text-slate-400">({users.length} accounts)</span>
              </h3>
              <button
                onClick={loadProfiles}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition"
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading user list...</div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-slate-800">
                No users found. Create the first team member above.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    {users.map((u) => {
                      const isMe = u.id === currentUserProfile?.id;
                      const isActive = u.status === 'active';

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <span>{u.full_name || 'No Name'}</span>
                              {isMe && (
                                <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          </td>

                          <td className="py-3 px-4">
                            {isMe ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80">
                                <span>🛡️</span>
                                <span>Admin (Master)</span>
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u, e.target.value as any)}
                                className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 font-medium focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="member">👤 Member</option>
                                <option value="admin">🛡️ Admin</option>
                              </select>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  isActive ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              ></span>
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {!isMe && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                  isActive
                                    ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Role changes and account status apply instantly across all connected workstations.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
