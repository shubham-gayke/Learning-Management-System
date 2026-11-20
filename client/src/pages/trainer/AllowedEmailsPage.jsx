import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllowedEmails,
  addAllowedEmails,
  deleteAllowedEmail,
} from '../../api/allowedEmails';
import { getBatches } from '../../api/batches';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AllowedEmailsPage() {
  const [allowedList, setAllowedList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ total: 0, registered: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'registered'
  const [batchFilter, setBatchFilter] = useState('');

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('bulk'); // 'single' | 'bulk'
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [targetBatchId, setTargetBatchId] = useState('');
  const [note, setNote] = useState('');

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Load batches for dropdown
  useEffect(() => {
    getBatches()
      .then((res) => setBatches(res.data?.batches || []))
      .catch(() => {});
  }, []);

  // Fetch allowed emails list
  const fetchEmails = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = { page, limit: 20 };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== 'all') params.status = statusFilter;
        if (batchFilter) params.batch = batchFilter;

        const res = await getAllowedEmails(params);
        setAllowedList(res.data?.allowedEmails || []);
        if (res.data?.pagination) setPagination(res.data.pagination);
        if (res.data?.stats) setStats(res.data.stats);
      } catch (err) {
        toast.error('Failed to load allowed emails list');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, batchFilter]
  );

  useEffect(() => {
    fetchEmails(1);
  }, [fetchEmails]);

  // Detected emails preview for bulk mode
  const parsedBulkEmails = useMemo(() => {
    if (!bulkEmails.trim()) return [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const split = bulkEmails
      .split(/[\s,;\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && emailRegex.test(e));
    return Array.from(new Set(split));
  }, [bulkEmails]);

  const handleOpenAddModal = () => {
    setSingleEmail('');
    setBulkEmails('');
    setTargetBatchId('');
    setNote('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    let emailsToSubmit = [];
    if (addMode === 'single') {
      const trimmed = singleEmail.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast.error('Please enter a valid email address');
        return;
      }
      emailsToSubmit = [trimmed];
    } else {
      if (parsedBulkEmails.length === 0) {
        toast.error('Please enter at least one valid email address');
        return;
      }
      emailsToSubmit = parsedBulkEmails;
    }

    try {
      setSubmitting(true);
      const res = await addAllowedEmails({
        emails: emailsToSubmit,
        batchId: targetBatchId || undefined,
        note: note.trim() || undefined,
      });

      toast.success(res.message || 'Emails added successfully');
      setIsAddModalOpen(false);
      fetchEmails(1);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add emails';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await deleteAllowedEmail(deleteTarget._id);
      toast.success(`Removed ${deleteTarget.email} from allowed list`);
      setDeleteTarget(null);
      fetchEmails(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove email');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
              <span>Strict Student Registration Checkpoint</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Student Access Control
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-xl">
              Pre-approve candidate emails in the database. Only students on this list can register and set up 2FA.
            </p>
          </div>

          <Button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 self-start sm:self-auto shadow-lg shadow-cyan-500/25 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Allowed Emails</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Pre-Approved
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300">
              <Mail className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs font-medium text-slate-400">students</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Accounts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.registered}
            </span>
            <span className="text-xs font-medium text-slate-400">active in LMS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Registrations
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.pending}
            </span>
            <span className="text-xs font-medium text-slate-400">yet to sign up</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'registered', label: 'Registered' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-cyan-600 shadow-sm dark:bg-slate-700 dark:text-cyan-300 font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Allowed Emails Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : allowedList.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={UserCheck}
              title={search ? 'No matching emails found' : 'No pre-approved emails yet'}
              description={
                search
                  ? `No email records match "${search}". Try a different search.`
                  : 'Add student emails to the whitelist so they can register and access the LMS.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Student Email</th>
                  <th className="px-5 py-3.5">Registration Status</th>
                  <th className="px-5 py-3.5">Assigned Batch</th>
                  <th className="px-5 py-3.5">Added By / Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allowedList.map((entry) => {
                  const isReg = entry.registered;
                  const addedDate = new Date(entry.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={entry._id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{entry.email}</span>
                          <button
                            onClick={() => copyToClipboard(entry.email)}
                            className="rounded p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:text-cyan-300 dark:hover:bg-cyan-950/40 cursor-pointer transition-colors"
                            title="Copy email"
                          >
                            {copiedEmail === entry.email ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {entry.note && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 italic">
                            {entry.note}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {isReg ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            Pending Sign Up
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {entry.batch?.name ? (
                          <span className="inline-flex items-center rounded-lg border border-cyan-500/20 bg-cyan-50 px-2 py-0.5 text-xs font-bold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-950/60 dark:text-cyan-300">
                            {entry.batch.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Student Chooses
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <div>{addedDate}</div>
                        {entry.addedBy && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            by {entry.addedBy.firstName || 'Trainer'}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                          title="Remove from allowed list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700/80">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchEmails(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchEmails(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Allowed Emails */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Allow Student Emails"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
            Pre-approved emails can create accounts and proceed with 2FA setup. Anyone else will be blocked.
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setAddMode('bulk')}
              className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                addMode === 'bulk'
                  ? 'bg-white text-cyan-600 shadow-sm dark:bg-slate-700 dark:text-cyan-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Bulk Import (Paste List)
            </button>
            <button
              type="button"
              onClick={() => setAddMode('single')}
              className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                addMode === 'single'
                  ? 'bg-white text-cyan-600 shadow-sm dark:bg-slate-700 dark:text-cyan-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Single Email
            </button>
          </div>

          {/* Input based on mode */}
          {addMode === 'single' ? (
            <Input
              label="Student Email Address"
              type="email"
              placeholder="student@example.com"
              icon={Mail}
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              required
            />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Paste Email List
                </label>
                {parsedBulkEmails.length > 0 && (
                  <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                    ✓ {parsedBulkEmails.length} valid email(s) detected
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                placeholder="Paste emails separated by commas, spaces, or line breaks:&#10;student1@gmail.com&#10;student2@yahoo.com, student3@outlook.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
              />
            </div>
          )}

          {/* Pre-assigned Batch */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Batch (Optional)
            </label>
            <select
              value={targetBatchId}
              onChange={(e) => setTargetBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
            >
              <option value="">Let student choose on first login</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  Directly enroll into {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <Input
            label="Internal Note (Optional)"
            placeholder="e.g. November 2026 Batch admission"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {addMode === 'bulk' && parsedBulkEmails.length > 0
                ? `Add ${parsedBulkEmails.length} Email(s)`
                : 'Save to Allowlist'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Email from Allowlist"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove{' '}
            <strong className="text-slate-900 dark:text-white font-mono">
              {deleteTarget?.email}
            </strong>{' '}
            from the allowed list?
          </p>
          {deleteTarget?.registered && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Note: This student has already registered an active account. Removing this record will only prevent re-registration if their account is ever reset.
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={submitting}
            >
              Remove Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
