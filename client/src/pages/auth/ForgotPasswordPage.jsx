import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  forgotPasswordVerifyEmail,
  forgotPasswordVerify2FA,
  forgotPasswordReset,
} from '../../api/auth';
import toast from 'react-hot-toast';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Step: 1 = Email, 2 = 2FA OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tokens
  const [resetToken, setResetToken] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);

  // Live password validation
  const passwordRules = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /\d/.test(newPassword),
  };
  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // ── Step 1: Verify Email & Checkpoint ──────────────────────────────
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await forgotPasswordVerifyEmail(cleanEmail);

      if (res.requiresTwoFactor) {
        setResetToken(res.data?.resetToken || res.resetToken);
        setStep(2);
        toast.success('Email verified! Please enter your 2FA code.');
      } else {
        // Fallback if 2FA wasn't enabled
        setVerifiedToken(res.data?.verifiedToken || res.verifiedToken);
        setStep(3);
        toast.success('Email verified! You can now set a new password.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Could not verify email. Please check your credentials or contact Admin.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify 2FA OTP ─────────────────────────────────────────
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const code = twoFactorCode.trim();
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await forgotPasswordVerify2FA(resetToken, code);
      setVerifiedToken(res.data?.verifiedToken || res.verifiedToken);
      setStep(3);
      toast.success('2FA verified! You may now set your new password.');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Invalid verification code. Please check your Authenticator app.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Update Password in Database ─────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error('Please meet all password security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await forgotPasswordReset(verifiedToken, newPassword, confirmPassword);
      setStep(4);
      toast.success(res.message || 'Password updated successfully!');
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to update password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Crystal Clear Transparent Glass Card */}
      <div className="relative z-10 w-full max-w-[440px] animate-slide-up">
        <div className="overflow-hidden rounded-[32px] border border-white/25 bg-black/15 sm:bg-white/[0.04] p-7 sm:p-10 shadow-2xl shadow-black/50 backdrop-blur-[2px]">

          {/* Top Return link */}
          {step < 4 && (
            <Link
              to="/login"
              className="group mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </Link>
          )}

          {/* Header Title */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-white/20 text-white shadow-lg backdrop-blur-md">
              <KeyRound className="h-6 w-6 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Two-Factor Check'}
              {step === 3 && 'New Password'}
              {step === 4 && 'Password Updated!'}
            </h1>
            <p className="mt-1 text-xs text-white/90 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {step === 1 && 'Enter your authorized email to verify your account'}
              {step === 2 && 'Enter the 6-digit code from your Authenticator app'}
              {step === 3 && 'Create a strong new password for your account'}
              {step === 4 && 'Your credentials have been updated in the database'}
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="mb-5 rounded-2xl border border-rose-300/40 bg-rose-950/70 p-4 text-rose-200 shadow-xl backdrop-blur-md animate-slide-down">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-300 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-rose-200/90 font-medium">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 1: EMAIL VERIFICATION ──────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleVerifyEmail} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shubhamgayke2001@gmail.com"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent border-b-2 border-white/40 pb-2 text-sm text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors"
                  />
                  <Mail className="absolute right-0 bottom-2.5 h-4 w-4 text-white/70 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="w-full rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking Admin Authorization...
                    </>
                  ) : (
                    'Verify Email & Check Access'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: 2FA TOTP CODE ────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center">
                <p className="text-xs text-white/80">
                  Verifying code for:
                </p>
                <p className="text-sm font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                  {email}
                </p>
              </div>

              <div className="space-y-1 text-center">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  6-Digit Authenticator Code
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    required
                    className="w-full bg-transparent border-b-2 border-white/40 pb-2 text-center text-2xl font-mono tracking-widest text-white placeholder-white/30 focus:border-amber-300 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={twoFactorCode.length !== 6 || loading}
                  className="w-full rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying 2FA Code...
                    </>
                  ) : (
                    'Verify 2FA & Continue'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrorMsg('');
                  }}
                  className="w-full text-center text-xs text-white/70 hover:text-white transition-colors cursor-pointer pt-1"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: SET NEW PASSWORD ─────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-transparent border-b-2 border-white/40 pb-1.5 pr-7 text-sm text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors"
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

                {/* Password requirement guide */}
                {newPassword && (
                  <div className="pt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {[
                      { label: '8+ chars', met: passwordRules.minLength },
                      { label: 'Uppercase', met: passwordRules.hasUpper },
                      { label: 'Lowercase', met: passwordRules.hasLower },
                      { label: 'Number', met: passwordRules.hasNumber },
                    ].map((rule) => (
                      <div
                        key={rule.label}
                        className={`flex items-center gap-1 ${
                          rule.met ? 'text-emerald-300 font-semibold' : 'text-white/50'
                        }`}
                      >
                        <span>{rule.met ? '✓' : '○'}</span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-transparent border-b-2 border-white/40 pb-1.5 pr-7 text-sm text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors"
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
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={!isPasswordValid || newPassword !== confirmPassword || loading}
                  className="w-full rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating Password in Database...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 4: SUCCESS VIEW ─────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center space-y-5 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <p className="text-xs text-white/90 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Your new password has been hashed and updated in the database. You can now log into your account.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white/95 py-3.5 text-sm font-bold text-purple-950 shadow-xl transition-all duration-200 hover:bg-white hover:scale-[1.01] cursor-pointer"
                >
                  Proceed to Login →
                </Link>
              </div>
            </div>
          )}

          {/* Footer protection badge */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span>Two-Factor Authentication Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
