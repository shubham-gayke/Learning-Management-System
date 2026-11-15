import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudents, updateStudent } from '../../api/students';
import { getBatches } from '../../api/batches';
import { useSocket } from '../../contexts/SocketContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentsPage() {
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBatch = searchParams.get('batch') || '';

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(initialBatch);

  // Modals
  const [moveModalStudent, setMoveModalStudent] = useState(null);
  const [targetBatchId, setTargetBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load batches once
  useEffect(() => {
    getBatches()
      .then((res) => setBatches(res.data?.batches || []))
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(async (page = 1, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (selectedBatch) params.batch = selectedBatch;

      const res = await getStudents(params);
      setStudents(res.data?.students || []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load students');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, selectedBatch]);

  useEffect(() => {
    fetchStudents(1, false);
  }, [fetchStudents]);

  // Real-time live socket listener for students list
  useEffect(() => {
    if (!socket) return;

    const handleStudentEnrolled = () => {
      fetchStudents(pagination.page || 1, true);
    };

    socket.on('student_enrolled', handleStudentEnrolled);
    socket.on('stats_update', handleStudentEnrolled);

    return () => {
      socket.off('student_enrolled', handleStudentEnrolled);
      socket.off('stats_update', handleStudentEnrolled);
    };
  }, [socket, fetchStudents, pagination.page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleResetAllowance = async (student) => {
    if (!window.confirm(`Reset batch change allowance for ${student.firstName} ${student.lastName}?`)) {
      return;
    }
    try {
      await updateStudent(student._id, { action: 'resetBatchChange' });
      toast.success(`Reset change allowance for ${student.firstName}`);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset allowance');
    }
  };

  const handleOpenMove = (student) => {
    setMoveModalStudent(student);
    setTargetBatchId(student.batch?._id || '');
  };

  const handleMoveBatch = async (e) => {
    e.preventDefault();
    if (!targetBatchId) {
      toast.error('Please select a target batch');
      return;
    }
    try {
      setSubmitting(true);
      await updateStudent(moveModalStudent._id, {
        action: 'moveBatch',
        batchId: targetBatchId,
      });
      toast.success(`Moved ${moveModalStudent.firstName} to selected batch`);
      setMoveModalStudent(null);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View enrolled students, manage batch assignments, and reset change allowances.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <Button variant="secondary" type="submit" size="md">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setSearchParams(e.target.value ? { batch: e.target.value } : {});
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

      {/* Students List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={search || selectedBatch ? 'Try clearing your filters or search terms.' : 'No students have registered yet.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Changes Used</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {students.map((st) => (
                  <tr key={st._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {st.firstName} {st.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {st.email}
                    </td>
                    <td className="px-6 py-4">
                      {st.batch ? (
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                          {st.batch.name}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          No batch selected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (st.batchChangesUsed ?? 0) >= 1
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        }`}
                      >
                        {st.batchChangesUsed ?? 0} / 1 used
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ArrowRightLeft}
                          onClick={() => handleOpenMove(st)}
                          title="Move to another batch"
                          className="text-xs"
                        >
                          Move
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={RotateCcw}
                          onClick={() => handleResetAllowance(st)}
                          disabled={(st.batchChangesUsed ?? 0) === 0}
                          title="Reset batch change allowance to 0"
                          className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
                        >
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {pagination.page} of {pagination.pages} ({pagination.total} students)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={pagination.page <= 1}
                  onClick={() => fetchStudents(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronRight}
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchStudents(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Move Batch Modal */}
      <Modal
        isOpen={!!moveModalStudent}
        onClose={() => setMoveModalStudent(null)}
        title={`Move Batch for ${moveModalStudent?.firstName} ${moveModalStudent?.lastName}`}
      >
        <form onSubmit={handleMoveBatch} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Current Batch: <strong className="text-indigo-600">{moveModalStudent?.batch?.name || 'None'}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Destination Batch
            </label>
            <select
              value={targetBatchId}
              onChange={(e) => setTargetBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            >
              <option value="">-- Choose Batch --</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.studentCount ?? 0} students)
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setMoveModalStudent(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              Confirm Move
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
