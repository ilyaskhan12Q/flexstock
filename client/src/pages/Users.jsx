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
  Lock,
  Mail
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
    <div className="space-y-6">
      
      {/* Users Control Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/40 p-6 border border-border rounded-xl glass-panel shadow-premium">
        <div>
          <h2 className="text-base font-semibold text-foreground">System Operator Accounts</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage operator credentials, levels, and statuses.</p>
        </div>
        
        <button
          onClick={handleOpenCreateForm}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-semibold transition cursor-pointer shadow-premium"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Operator</span>
        </button>
      </div>

      {/* Message alert */}
      {message && (
        <div className="p-4 rounded-xl bg-card border border-border flex justify-between items-center text-sm glass-panel">
          <div className="flex items-center gap-2 text-foreground">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Users Table list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-border bg-card/50 glass-panel shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3 text-center">System Role</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-muted-foreground" />
                      <span>{usr.name}</span>
                      {usr.id === currentUser?.id && (
                        <span className="text-[9px] bg-background text-primary border border-primary/30 px-1 py-0.5 rounded font-mono">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{usr.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        usr.role === 'ADMIN' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        usr.role === 'MANAGER' ? 'bg-primary/10 text-primary border-primary/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(usr)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 mx-auto transition cursor-pointer ${
                          usr.isActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                        }`}
                      >
                        {usr.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        <span>{usr.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEditForm(usr)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition"
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
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-glass space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">{selectedUser ? 'Modify Operator Account' : 'Register Operator'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="email"
                    required
                    placeholder="operator@company.com"
                    className="input-field pl-9"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">System Privilege Level</label>
                <select
                  className="input-field"
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
                <label className="label-text">
                  {selectedUser ? 'Change Password (Leave blank for no change)' : 'Account Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="password"
                    required={!selectedUser}
                    placeholder="••••••••"
                    className="input-field pl-9"
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
                    className="w-4 h-4 rounded bg-background border border-border text-primary focus:ring-0 cursor-pointer"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActive" className="text-xs text-muted-foreground cursor-pointer select-none">Account is Active</label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition cursor-pointer shadow-premium"
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
