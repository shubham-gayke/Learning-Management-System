import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [eligibilityError, setEligibilityError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = {
    minLength: form.password.length >= 8,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /[0-9]/.test(form.password),
  };
  const passwordStrong = Object.values(passwordRules).every(Boolean);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (!passwordStrong) e.password = 'Password does not meet requirements';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) e.terms = 'You must agree to the Terms & Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
    if (field === 'email' && eligibilityError) setEligibilityError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setEligibilityError('');
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate('/setup-2fa', { replace: true });
    } catch (err) {
      if (err.response?.data?.errors?.length) {
        const fieldErrors = {};
        err.response.data.errors.forEach((item) => {
          if (item.field) fieldErrors[item.field] = item.message;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.map((item) => item.message).join(', ') ||
        'Registration failed. Please try again.';

      if (err.response?.status === 403 || msg.toLowerCase().includes('eligible')) {
        setEligibilityError(msg);
      }
      toast.error(msg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password &&
    form.confirmPassword &&
    agreedToTerms &&
    passwordStrong &&
    form.password === form.confirmPassword;

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

      {/* Crystal Clear Transparent Glass Registration Card */}
      <div className="relative z-10 w-full max-w-[460px] animate-slide-up">
        <div className="overflow-hidden rounded-[32px] border border-white/25 bg-black/15 sm:bg-white/[0.04] p-7 sm:p-10 shadow-2xl shadow-black/50 backdrop-blur-[2px]">

          {/* Header Title */}
          <div className="mb-7 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              Registration
            </h1>
            <p className="mt-1 text-xs text-white/90 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              Join Mentore Solution LMS Network
            </p>
          </div>

          {/* Eligibility Restriction Warning Banner */}
          {eligibilityError && (
            <div className="mb-5 rounded-2xl border border-rose-300/40 bg-rose-950/70 p-4 text-rose-200 shadow-xl backdrop-blur-md animate-slide-down">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-300 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Access Restricted
                  </h3>
                  <p className="text-xs leading-relaxed text-rose-200/90">
                    {eligibilityError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form with Clean Floating Underline Inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  First Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder="Shubham"
                    autoComplete="given-name"
                    className={`w-full bg-transparent border-b-2 pb-1.5 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.firstName
                      ? 'border-rose-400'
                      : 'border-white/40 focus:border-white'
                      }`}
                  />
                  <User className="absolute right-0 bottom-2 h-3.5 w-3.5 text-white/70 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                </div>
                {errors.firstName && (
                  <p className="text-[10px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  placeholder="Gayke"
                  autoComplete="family-name"
                  className={`w-full bg-transparent border-b-2 pb-1.5 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.lastName
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                {errors.lastName && (
                  <p className="text-[10px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

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
                  className={`w-full bg-transparent border-b-2 pb-1.5 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.email
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                <Mail className="absolute right-0 bottom-2 h-4 w-4 text-white/70 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              </div>
              {errors.email && (
                <p className="text-[10px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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
                  autoComplete="new-password"
                  className={`w-full bg-transparent border-b-2 pb-1.5 pr-7 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.password
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2 text-white/70 hover:text-white cursor-pointer transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Minimalist Live Password Requirements Guide */}
              {form.password && (
                <div className="pt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {[
                    { label: '8+ chars', met: passwordRules.minLength },
                    { label: 'Uppercase', met: passwordRules.hasUpper },
                    { label: 'Lowercase', met: passwordRules.hasLower },
                    { label: 'Number', met: passwordRules.hasNumber },
                  ].map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1 ${rule.met ? 'text-emerald-300 font-semibold' : 'text-white/60'
                        }`}
                    >
                      <span>{rule.met ? '✓' : '○'}</span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {errors.password && (
                <p className="text-[10px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className={`w-full bg-transparent border-b-2 pb-1.5 pr-7 text-sm text-white placeholder-white/50 focus:outline-none transition-colors ${errors.confirmPassword
                    ? 'border-rose-400'
                    : 'border-white/40 focus:border-white'
                    }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 bottom-2 text-white/70 hover:text-white cursor-pointer transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] font-medium text-rose-300 animate-slide-down drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/40 bg-black/20 text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span>I agree to the Terms & Conditions</span>
              </label>
              {errors.terms && (
                <p className="text-[10px] font-medium text-rose-300 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {errors.terms}
                </p>
              )}
            </div>

            {/* Solid White Rounded Pill Button matching Reference */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <span>Already have an account?</span>{' '}
              <Link
                to="/login"
                className="font-extrabold text-amber-300 hover:text-amber-100 underline decoration-amber-400 decoration-2 underline-offset-4 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] hover:drop-shadow-[0_0_18px_rgba(251,191,36,1)] transition-all ml-1"
              >
                Login
              </Link>
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span>Two-Factor Authentication Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
