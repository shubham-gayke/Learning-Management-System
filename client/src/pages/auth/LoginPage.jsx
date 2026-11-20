import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await login({ email: form.email.trim(), password: form.password });
      if (result?.role === 'trainer') {
        navigate('/trainer', { replace: true });
      } else if (result?.requiresTwoFactor) {
        navigate('/verify-2fa', { state: { twoFactorToken: result.twoFactorToken }, replace: true });
      } else if (result?.twoFactorEnabled === false) {
        navigate('/setup-2fa', { replace: true });
      } else if (result?.batch) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/select-batch', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.email.trim() && form.password;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 select-none overflow-x-hidden">
      {/* 16:9 Aesthetic Animated Vector Landscape Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/cabin_dusk_animated.svg"
          alt="Cozy Cabin at Dusk"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Crystal Clear Transparent Glass Login Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        <div className="overflow-hidden rounded-[32px] border border-white/25 bg-black/15 sm:bg-white/[0.04] p-7 sm:p-10 shadow-2xl shadow-black/50 backdrop-blur-[2px]">

          {/* Header Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              Login
            </h1>
            <p className="mt-1 text-xs text-white/90 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              Mentore Solution LMS
            </p>
          </div>

          {/* Form with Clean Floating Underline Inputs */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="shubhamgayke2001@gmail.com"
                  autoComplete="email"
                  className={`w-full bg-transparent border-b-2 pb-2 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.email
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                <Mail className="absolute right-0 bottom-2.5 h-4 w-4 text-white/70 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              </div>
              {errors.email && (
                <p className="text-[11px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className={`w-full bg-transparent border-b-2 pb-2 pr-7 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.password
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2.5 text-white/70 hover:text-white cursor-pointer transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs text-white/90 pt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/40 bg-black/20 text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span>Remember Me</span>
              </label>
              <a
                href="mailto:admin@mentoresolution.com"
                className="hover:text-white hover:underline transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* Solid White Rounded Pill Button matching Reference */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="mt-7 text-center">
            <p className="text-sm font-semibold text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <span>Don&apos;t have an account?</span>{' '}
              <Link
                to="/register"
                className="font-extrabold text-amber-300 hover:text-amber-100 underline decoration-amber-400 decoration-2 underline-offset-4 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] hover:drop-shadow-[0_0_18px_rgba(251,191,36,1)] transition-all ml-1"
              >
                Register
              </Link>
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span>Two-Factor Authentication Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
