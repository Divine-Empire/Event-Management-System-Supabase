import React, { useState, useEffect } from 'react';
import { Settings, Plus, Users, Edit2, Trash2, Check, X, Eye, EyeOff, ShieldCheck, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

export const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // Add User Form State
  const [addForm, setAddForm] = useState({
    username: '',
    password: '',
    role: 'Admin',
    is_active: true
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit User State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    role: 'Admin',
    is_active: true
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getAllAdmins();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching admins:', err);
      toast.error('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const togglePasswordVisibility = (id) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.username.trim() || !addForm.password.trim()) {
      toast.error('Username and Password are required.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await authService.addAdmin(addForm);
      if (res.success) {
        toast.success(`User "${addForm.username}" added successfully!`);
        setAddForm({ username: '', password: '', role: 'Admin', is_active: true });
        setShowAddForm(false);
        await fetchUsers();
      } else {
        toast.error(res.message || 'Failed to add user.');
      }
    } catch (err) {
      toast.error('An error occurred while adding the user.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      username: user.username || '',
      password: user.password || '',
      role: user.role || 'Admin',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowEditPassword(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ username: '', password: '', role: 'Admin', is_active: true });
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    if (!editForm.username.trim() || !editForm.password.trim()) {
      toast.error('Username and Password cannot be empty.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await authService.updateAdmin(id, editForm);
      if (res.success) {
        toast.success('User updated successfully!');
        setEditingId(null);
        await fetchUsers();
      } else {
        toast.error(res.message || 'Failed to update user.');
      }
    } catch (err) {
      toast.error('Error updating user.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.username === 'admin') {
      toast.error('The primary system "admin" account cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      const res = await authService.deleteAdmin(user.id);
      if (res.success) {
        toast.success(`User "${user.username}" deleted.`);
        await fetchUsers();
      } else {
        toast.error(res.message || 'Failed to delete user.');
      }
    } catch (err) {
      toast.error('Error deleting user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Top Right Add User Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings size={26} className="text-blue-600" /> System Settings & User Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage admin users, credentials, assigned roles, and active statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddForm({ username: '', password: '', role: 'Admin', is_active: true });
            setShowAddPassword(false);
            setShowAddForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Add User Popup Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Admin User</h3>
                  <p className="text-xs text-slate-500 font-medium">Create user account in database table event_admins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form - Prevent Browser Autofill */}
            <form onSubmit={handleAddSubmit} autoComplete="off" className="space-y-4">
              {/* Fake hidden inputs to trick browser password managers */}
              <input type="text" name="fake_username_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} />
              <input type="password" name="fake_password_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} />

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Username *</label>
                <input
                  type="text"
                  name="new_username_input"
                  autoComplete="off"
                  required
                  placeholder="e.g. manager1"
                  value={addForm.username}
                  onChange={e => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    name="new_user_password_field"
                    autoComplete="new-password"
                    required
                    placeholder="Enter password"
                    value={addForm.password}
                    onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role *</label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>
              </div>

              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                <input
                  id="add_is_active_modal"
                  type="checkbox"
                  checked={addForm.is_active}
                  onChange={e => setAddForm({ ...addForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="add_is_active_modal" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account Active (User can sign in)
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <UserCheck size={16} />
                  <span>{isSubmittingAdd ? 'Saving...' : 'Save User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Popup Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <Edit2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit User Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Update account information for "{editForm.username}"</p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e) => handleEditSubmit(e, editingId)} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role *</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>
              </div>

              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                <input
                  id="edit_is_active_modal"
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="edit_is_active_modal" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account Active (User can sign in)
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">User Accounts List ({users.length})</h3>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            Loading user list...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No users found in database. Click "Add New User" above to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                  <th className="py-3 px-4">Serial No. (#)</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {users.map((user, index) => {
                  const isVisiblePassword = Boolean(showPasswordMap[user.id]);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{user.username}</td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-semibold">
                            {isVisiblePassword ? user.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isVisiblePassword ? 'Hide Password' : 'Show Password'}
                          >
                            {isVisiblePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                          {user.role || 'Admin'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.is_active !== false ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className="bg-white border border-slate-200 hover:border-blue-400 text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={user.username === 'admin'}
                            className="bg-white border border-slate-200 hover:border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
  );
};
