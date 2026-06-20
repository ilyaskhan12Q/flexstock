import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import API from '../api';
import { KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const loginStore = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const appName = import.meta.env.VITE_APP_NAME || 'FlexStock';
  const logoUrl = import.meta.env.VITE_LOGO_URL || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      loginStore(user, accessToken, refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden font-sans">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />

      {/* Main Container */}
      <div className="relative w-full max-w-md p-8 rounded-2xl glass-panel shadow-glass text-foreground z-10 mx-4">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-16 h-16 object-contain mb-3 rounded-xl border border-border p-1" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center mb-3 shadow-premium">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-100 dark:to-emerald-300 bg-clip-text text-transparent">
            {appName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Smart Inventory Management System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <input
                type="email"
                required
                className="w-full bg-muted/40 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder-muted-foreground/50 outline-none transition"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <input
                type="password"
                required
                className="w-full bg-muted/40 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder-muted-foreground/50 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold transition shadow-premium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
