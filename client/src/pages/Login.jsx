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
      {/* Main Container */}
      <div className="relative w-full max-w-md p-8 rounded-lg border border-border bg-card shadow-premium text-foreground z-10 mx-4">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-12 h-12 object-contain mb-3 rounded-md border border-border p-1" />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {appName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Smart Inventory Management System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-3.5 mb-6 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
              <input
                type="email"
                required
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
              <input
                type="password"
                required
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
