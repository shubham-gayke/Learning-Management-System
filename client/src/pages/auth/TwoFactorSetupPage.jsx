import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as authApi from '../../api/auth';
import Button from '../../components/common/Button';
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Two-Factor Authentication
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
              Protect your account with an Authenticator app
            </p>
          </div>

          {generating ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-slate-500">Generating secure key...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Scan QR */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>Step 1: Scan QR Code with Authenticator</span>
                </div>
                <div className="flex justify-center rounded-xl border border-slate-100 bg-white p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  {qrCode ? (
                    <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg" />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center text-slate-400">
                      QR code unavailable
                    </div>
                  )}
                </div>
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
                    className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
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

              {/* Step 2: Verification Code */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Step 2: Enter 6-digit code</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
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
          )}

          {/* Info Banner */}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/30 dark:bg-blue-900/10">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
              Compatible with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong>. 
              Please keep your authenticator safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
