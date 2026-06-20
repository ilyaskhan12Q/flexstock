import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuthStore } from '../store/authStore';
import { 
  Users as UsersIcon, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Edit, 
  X, 
  Check, 
  Lock,
  Mail,
  ShieldAlert
} from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Modal forms
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('STAFF');
  const [formPassword, setFormPassword] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('STAFF');
    setFormPassword('');
    setFormIsActive(true);
    setFormOpen(true);
  };

  const handleOpenEditForm = (usr) => {
    setSelectedUser(usr);
    setFormName(usr.name);
    setFormEmail(usr.email);
    setFormRole(usr.role);
    setFormPassword(''); // leave blank for no change
    setFormIsActive(usr.isActive);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: formName,
      email: formEmail,
      role: formRole,
      isActive: formIsActive
    };

    if (formPassword) {
      payload.password = formPassword;
    }

    try {
      if (selectedUser) {
        await API.patch(`/users/${selectedUser.id}`, payload);
        setMessage('User account updated successfully');
      } else {
        if (!formPassword) {
          alert('Password is required for new accounts');
          return;
        }
        payload.password = formPassword;
        await API.post('/users', payload);
        setMessage('User account created successfully');
      }
      setFormOpen(false);
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleToggleActive = async (usr) => {
    if (usr.id === currentUser?.id) {
      alert('You cannot deactivate your own admin session.');
      return;
    }

    const confirmMsg = usr.isActive 
      ? `Are you sure you want to deactivate ${usr.name}'s account?` 
      : `Reactivate ${usr.name}'s account?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await API.patch(`/users/${usr.id}`, { isActive: !usr.isActive });
      setMessage(`User account ${usr.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Users Control Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl glass-panel">
        <div>
          <h2 className="text-base font-semibold text-slate-200">System Operator Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage operator credentials, levels, and statuses.</p>
        </div>
        
        <button
          onClick={handleOpenCreateForm}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Create Operator</span>
        </button>
      </div>

      {/* Message alert */}
      {message && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-xs font-semibold text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      {/* Users Table list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3 text-center">System Role</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-slate-500" />
                      <span>{usr.name}</span>
                      {usr.id === currentUser?.id && (
                        <span className="text-[9px] bg-slate-950 text-blue-400 border border-blue-900 px-1 py-0.5 rounded font-mono">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{usr.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        usr.role === 'ADMIN' ? 'bg-red-950 text-red-400 border border-red-900' :
                        usr.role === 'MANAGER' ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(usr)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 mx-auto transition cursor-pointer ${
                          usr.isActive 
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-900' 
                            : 'bg-red-950 text-red-400 border-red-900'
                        }`}
                      >
                        {usr.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        <span>{usr.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEditForm(usr)}
                        className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">{selectedUser ? 'Modify Operator Account' : 'Register Operator'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="email"
                    required
                    placeholder="operator@company.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 outline-none"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">System Privilege Level</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  disabled={selectedUser?.id === currentUser?.id}
                >
                  <option value="ADMIN">ADMIN (Full Config & Schemas)</option>
                  <option value="MANAGER">MANAGER (Products Catalog & Inventory)</option>
                  <option value="STAFF">STAFF (Cashier POS & Inventory movements)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {selectedUser ? 'Change Password (Leave blank for no change)' : 'Account Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="password"
                    required={!selectedUser}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 outline-none"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>
              </div>

              {selectedUser && selectedUser.id !== currentUser?.id && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="w-4 h-4 rounded bg-slate-950 border border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActive" className="text-xs text-slate-400 cursor-pointer select-none">Account is Active</label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Users;
