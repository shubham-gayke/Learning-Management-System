import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as authApi from '../../api/auth';
import Button from '../../components/common/Button';
import {
  Shield,
  Smartphone,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  KeyRound,
  QrCode,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorSetupPage() {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [copied, setCopied] = useState(false);

  // Trainers skip 2FA
  if (user?.role === 'trainer') {
    return <Navigate to="/trainer" replace />;
  }

  // If already enabled, redirect away
  if (user?.twoFactorEnabled) {
    if (user.batch) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/select-batch" replace />;
  }

  useEffect(() => {
    let mounted = true;
    const generate = async () => {
      try {
        const res = await authApi.generate2FA();
        if (mounted) {
          setQrCode(res.data?.qrCode || res.qrCode);
          setSecret(res.data?.secret || res.secret);
        }
      } catch (err) {
        if (mounted) {
          toast.error(err.response?.data?.message || 'Failed to initialize 2FA setup');
        }
      } finally {
        if (mounted) {
          setGenerating(false);
        }
      }
    };
    generate();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success('Secret key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy secret key');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifySetup2FA(code);
      toast.success('Two-factor authentication enabled successfully!');
      const updatedUser = await refetchUser();
      if (updatedUser?.role === 'trainer') {
        navigate('/trainer', { replace: true });
      } else if (updatedUser?.batch) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/select-batch', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-slide-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Two-Factor Authentication
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Protect your student account with an Authenticator app
            </p>
          </div>

          {generating ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
              <p className="text-sm font-medium text-slate-500">Generating secure key...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Download Authenticator App */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <Download className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Step 1: Download an Authenticator App</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Install either Google Authenticator or Microsoft Authenticator on your mobile phone:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Google Authenticator Button */}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 hover:border-cyan-500 hover:bg-cyan-50/50 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Google Authenticator</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                  </a>

                  {/* Microsoft Authenticator Button */}
                  <a
                    href="https://play.google.com/store/apps/details?id=com.azure.authenticator&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Microsoft Authenticator</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                  </a>
                </div>

                {/* Important Notice regarding email matching */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5 mt-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <span className="font-bold">Important Requirement:</span>
                    <p className="text-[11px] opacity-95">
                      Please keep the <strong>same email address</strong> for both your <strong>LMS account creation</strong> and your <strong>Google account</strong> (in Google Authenticator) to ensure cloud backup and smooth synchronization.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Scan QR Code */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <QrCode className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Step 2: Scan QR Code with Authenticator</span>
                </div>
                <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  {qrCode ? (
                    <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg" />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center text-slate-400">
                      QR code unavailable
                    </div>
                  )}
                </div>

                {/* Manual code */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                    <code className="flex-1 break-all text-xs font-mono font-semibold tracking-wide text-slate-800 dark:text-slate-200">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
                      title="Copy Secret"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Verification Code Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <KeyRound className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Step 3: Enter 6-digit code</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={loading}
                  disabled={code.length !== 6}
                >
                  Verify & Activate 2FA
                </Button>
              </form>
            </div>
          )}

          {/* Info Banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-600 dark:text-cyan-400" />
            <p className="leading-relaxed">
              Compatible with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or any standard TOTP app. Please keep your authenticator safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
