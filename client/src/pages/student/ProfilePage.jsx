import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getBatches } from '../../api/batches';
import { updateBatch } from '../../api/students';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  User,
  Mail,
  Layers,
  AlertTriangle,
  RefreshCw,
  Shield,
  Smartphone,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getInitials } from '../../lib/utils';

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const [changeBatchOpen, setChangeBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isStudent = user?.role === 'student';
  const batchChangesUsed = user?.batchChangesUsed ?? 0;
  const canChangeBatch = batchChangesUsed < 1;
  const batchChangesRemaining = Math.max(0, 1 - batchChangesUsed);

  const batchName =
    typeof user?.batch === 'object'
      ? user.batch.name
      : user?.batch
        ? 'Assigned Batch'
        : 'No batch';

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
    enabled: changeBatchOpen && isStudent,
  });

  const mutation = useMutation({
    mutationFn: (batchId) => updateBatch(batchId),
    onSuccess: async () => {
      toast.success('Batch changed successfully!');
      await refetchUser();
      setConfirmOpen(false);
      setChangeBatchOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change batch');
    },
  });

  const handleBatchClick = (batch) => {
    setSelectedBatch(batch);
    setChangeBatchOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (selectedBatch) mutation.mutate(selectedBatch._id);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Profile Settings
      </h1>

      {/* Profile info card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
            {getInitials(`${user?.firstName} ${user?.lastName}`)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h2>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-primary dark:bg-primary/20 dark:text-primary-light">
              <Shield className="h-3 w-3" />
              {user?.role}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <Mail className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Email
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Student batch details */}
          {isStudent && (
            <>
              {/* Batch */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Current Batch
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {batchName}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Active
                </span>
              </div>

              {/* Batch changes */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Batch Changes Remaining
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {batchChangesRemaining} of 1
                    </p>
                  </div>
                </div>
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    canChangeBatch ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Change Batch button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  icon={RefreshCw}
                  disabled={!canChangeBatch}
                  onClick={() => setChangeBatchOpen(true)}
                >
                  {canChangeBatch ? 'Change Batch' : 'No Changes Remaining'}
                </Button>
                {!canChangeBatch && (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    You have already used your one-time batch change.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Security & 2FA card (students only) */}
      {isStudent && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Security Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your two-factor authentication and account security
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Authenticator App (TOTP)
                  </p>
                  {user?.twoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.twoFactorEnabled
                    ? 'Your account is protected by a 6-digit verification code.'
                    : 'Two-factor authentication is required to access course content.'}
                </p>
              </div>
            </div>

            {!user?.twoFactorEnabled ? (
              <div className="flex-shrink-0">
                <Link to="/setup-2fa">
                  <Button size="sm">Set Up 2FA</Button>
                </Link>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Mandatory & Active
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch selection modal (students only) */}
      {isStudent && (
        <Modal
          isOpen={changeBatchOpen}
          onClose={() => setChangeBatchOpen(false)}
          title="Select New Batch"
          size="md"
        >
          <div className="space-y-3">
            {batchesLoading && (
              <p className="py-8 text-center text-sm text-slate-500">Loading batches…</p>
            )}
            {(batchesData?.data?.batches || batchesData?.batches || []).map((batch) => {
              const isCurrent = user?.batch === batch._id || user?.batch?._id === batch._id;
              return (
                <button
                  key={batch._id}
                  disabled={isCurrent}
                  onClick={() => handleBatchClick(batch)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-primary/30 bg-primary/5 opacity-60 cursor-not-allowed dark:bg-primary/10'
                      : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {batch.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-primary">CURRENT</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Confirm batch change modal (students only) */}
      {isStudent && (
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Confirm Batch Change"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Switch to{' '}
              <strong className="text-slate-900 dark:text-white">
                {selectedBatch?.name}
              </strong>
              ?
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-xs text-red-700 dark:text-red-400">
                ⚠️ This is your <strong>LAST</strong> batch change. You will not be able to switch again after this.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                isLoading={mutation.isPending}
                onClick={handleConfirm}
              >
                Confirm Change
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
