import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HeartHandshake, LogIn, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showToast('Please enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(cleanEmail, password);
      showToast('Welcome back to HAATEMALO!', 'success');

      if (['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(loggedUser?.role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid email or password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl relative">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="हातेमालो (HAATEMALO)" className="h-16 mx-auto w-auto object-contain" />
          </Link>
          <h2 className="text-2xl font-black text-slate-900">Log In to HAATEMALO</h2>
          <p className="text-xs text-slate-500 font-medium">"मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।"</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>256-Bit SSL Encrypted & Protected Login</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] focus:ring-1 focus:ring-[#C8382C] rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] focus:ring-1 focus:ring-[#C8382C] rounded-2xl pl-10 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold terracotta-btn text-white shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {loading ? 'Authenticating...' : 'Log In Safely'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-[#C8382C] hover:underline">
              Register now
            </Link>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            🔒 All login attempts are rate-limited & monitored for account safety.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
