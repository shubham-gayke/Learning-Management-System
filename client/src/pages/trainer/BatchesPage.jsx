import { useState, useEffect } from 'react';
import { getBatches, createBatch, updateBatch } from '../../api/batches';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { Layers, Plus, Edit2, CheckCircle2, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });
  const [editingId, setEditingId] = useState(null);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await getBatches();
      setBatches(res.data?.batches || []);
    } catch (err) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', isActive: true });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (batch) => {
    setEditingId(batch._id);
    setFormData({
      name: batch.name,
      description: batch.description || '',
      isActive: batch.isActive ?? true,
    });
    setIsEditOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Batch name is required');
      return;
    }
    try {
      setSubmitting(true);
      await createBatch({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      });
      toast.success('Batch created successfully');
      setIsCreateOpen(false);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Batch name is required');
      return;
    }
    try {
      setSubmitting(true);
      await updateBatch(editingId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      });
      toast.success('Batch updated successfully');
      setIsEditOpen(false);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Batch Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, update, and toggle training batches for Mentore Solution.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Create New Batch
        </Button>
      </div>

      {/* Batches List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches found"
          description="Create your first batch to start enrolling students and uploading lectures."
          actionText="Create Batch"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => (
            <div
              key={batch._id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-extrabold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                    {batch.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      batch.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {batch.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </>
                    )}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {batch.description || 'General professional training batch for students.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>{batch.studentCount ?? 0} Students enrolled</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit2}
                  onClick={() => handleOpenEdit(batch)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Batch"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Batch Name"
            placeholder="e.g. B-32"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Full-stack Web Development"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveCreate"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveCreate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active (Visible for student selection)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              Create Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Batch"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Batch Name"
            placeholder="e.g. B-26"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="e.g. MERN Full Stack Track"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveEdit"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveEdit" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active (Students can choose this batch)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
