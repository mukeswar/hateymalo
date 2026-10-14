import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

const PANEL_IMAGE = 'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=1200&q=75';

// Desktop-only photo panel beside the form
const PhotoPanel = () => (
  <aside className="hidden lg:block relative overflow-hidden rounded-[2rem] min-h-[36rem] bg-night" aria-hidden="true">
    <img src={PANEL_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-10 text-white">
      <p className="deva font-display text-2xl xl:text-[1.75rem] font-semibold leading-snug">
        मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।
      </p>
      <p className="mt-2 text-white/85 text-lg">Ask for help. Offer help. Change things together.</p>
    </div>
  </aside>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setFormError('Please enter your email and password.');
      showToast('Please enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password);
      const role = result?.data?.role || result?.role;
      showToast('Welcome back to HATEYMALO!', 'success');

      // Return to the page that asked for a login (internal paths only)
      const from = location.state?.from;
      const fromPath = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}` : '';
      if (fromPath.startsWith('/') && !fromPath.startsWith('//') && fromPath !== '/login') {
        navigate(fromPath, { replace: true });
      } else if (['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid email or password. Please try again.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-stretch">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md animate-rise">
            <p className="eyebrow deva">फेरि स्वागत छ</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-bold text-ink">Welcome back</h1>
            <p className="mt-3 text-muted text-lg">Log in to see your requests, the drives you've joined and new activity.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {formError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-brand-tint text-brand-dark border border-brand/20 px-4 py-3 text-sm font-medium">
                  <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="field-label">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="field-label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="field pl-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" /> : <Eye className="w-[18px] h-[18px]" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                {loading ? 'Logging in…' : 'Log in'}
                {!loading && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
              </button>
            </form>

            <p className="mt-8 pt-6 border-t border-sand text-ink-soft">
              New to Hateymalo?{' '}
              <Link to="/register" className="font-semibold text-brand hover:text-brand-dark underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <PhotoPanel />
      </div>
    </div>
  );
};

export default Login;
