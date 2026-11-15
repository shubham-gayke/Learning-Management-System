import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { getBatches } from '../../api/batches';
import { updateBatch } from '../../api/students';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { Layers, Users, AlertTriangle, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SelectBatchPage() {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasBatch = !!user?.batch;
  const batchChangesUsed = user?.batchChangesUsed ?? 0;
  const canChange = hasBatch && batchChangesUsed < 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
  });

  const mutation = useMutation({
    mutationFn: (batchId) => updateBatch(batchId),
    onSuccess: async () => {
      toast.success('Batch joined successfully!');
      await refetchUser();
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to join batch');
    },
  });

  const batches = data?.data?.batches || data?.batches || [];

  const handleSelect = (batch) => {
    setSelectedBatch(batch);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (selectedBatch) mutation.mutate(selectedBatch._id);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
            <GraduationCap className="h-8 w-8 text-primary dark:text-primary-light" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {hasBatch ? 'Change Your Batch' : 'Choose Your Batch'}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {hasBatch
              ? 'Select a different batch to switch to.'
              : 'Select the batch you want to join to get started.'}
          </p>
          {hasBatch && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              You have {1 - batchChangesUsed} batch change remaining
            </div>
          )}
        </div>
      </div>

      {/* Batch grid */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="card" className="h-40" />
            ))}
          </div>
        )}

        {error && (
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load batches"
            description="Something went wrong. Please try again."
          />
        )}

        {!isLoading && batches.length === 0 && (
          <EmptyState
            icon={Layers}
            title="No Batches Available"
            description="No batches are available right now. Please check back later."
          />
        )}

        {!isLoading && batches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => {
              const isCurrentBatch = user?.batch === batch._id || user?.batch?._id === batch._id;
              return (
                <button
                  key={batch._id}
                  disabled={isCurrentBatch || (!canChange && hasBatch)}
                  onClick={() => handleSelect(batch)}
                  className={`group relative rounded-2xl border-2 bg-white p-6 text-left shadow-lg transition-all duration-200 dark:bg-slate-800 cursor-pointer ${
                    isCurrentBatch
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 dark:border-primary-light'
                      : 'border-slate-200 hover:border-primary/50 hover:shadow-xl dark:border-slate-700 dark:hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isCurrentBatch && (
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white">
                      CURRENT
                    </span>
                  )}
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:bg-primary/20 dark:text-primary-light">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {batch.name}
                  </h3>
                  {batch.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {batch.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{batch.studentCount ?? 0} students</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Trainer: Shubham Gayke
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Batch Selection"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to join{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {selectedBatch?.name}
            </span>
            ?
          </p>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ You can change your batch only <strong>ONE</strong> time later. Choose carefully!
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              isLoading={mutation.isPending}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
