import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getExams,
  createExam,
  updateExam,
  toggleExamStatus,
  deleteExam,
  getExamLeaderboard,
  getExamSubmissions,
} from '../../api/exams';
import { getBatches } from '../../api/batches';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileCheck,
  Plus,
  Search,
  Clock,
  Layers,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Eye,
  Trophy,
  TableProperties,
  UserCheck,
  ShieldAlert,
  Play,
  Pause,
  HelpCircle,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'General',
  'Linux',
  'AWS',
  'DevOps',
  'AI',
  'Full Stack',
  'Python',
  'Communication',
];

const EMPTY_QUESTION = {
  questionText: '',
  codeSnippet: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  explanation: '',
};

export default function ManageExamsPage() {
  const [exams, setExams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Exam Create/Edit Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    duration: 30,
    passPercentage: 50,
    isAllBatches: true,
    targetBatches: [],
    status: 'draft',
    questions: [
      {
        questionText: 'What is the primary function of the Linux kernel?',
        codeSnippet: '',
        options: [
          'Resource management between hardware and user space',
          'Web browser rendering',
          'Compiling JavaScript code',
          'Database querying',
        ],
        correctOptionIndex: 0,
        explanation: 'The kernel is the core interface between computer hardware and user software.',
      },
    ],
  });

  // Leaderboard modal state
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardBatch, setLeaderboardBatch] = useState('all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [examsRes, batchesRes] = await Promise.all([
        getExams(),
        getBatches(),
      ]);
      setExams(examsRes.data?.exams || []);
      setBatches(batchesRes.data?.batches || []);
    } catch {
      toast.error('Failed to load exams or batches data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingExamId(null);
    setFormData({
      title: '',
      description: '',
      category: 'General',
      duration: 30,
      passPercentage: 50,
      isAllBatches: true,
      targetBatches: [],
      status: 'draft',
      questions: [
        {
          questionText: '',
          codeSnippet: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        },
      ],
    });
    setFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exam) => {
    setEditingExamId(exam._id);
    setFormData({
      title: exam.title || '',
      description: exam.description || '',
      category: exam.category || 'General',
      duration: exam.duration || 30,
      passPercentage: exam.passPercentage || 50,
      isAllBatches: !!exam.isAllBatches,
      targetBatches: (exam.targetBatches || []).map((b) => b._id || b),
      status: exam.status || 'draft',
      questions: (exam.questions || []).map((q) => ({
        questionText: q.questionText || '',
        codeSnippet: q.codeSnippet || '',
        options: Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ['', '', '', ''],
        correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
        explanation: q.explanation || '',
      })),
    });
    setFormOpen(true);
  };

  // Questions manipulation in form
  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          codeSnippet: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        },
      ],
    }));
  };

  const handleRemoveQuestion = (qIndex) => {
    if (formData.questions.length <= 1) {
      toast.error('An exam must have at least 1 question.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== qIndex),
    }));
  };

  const handleQuestionChange = (qIndex, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return { ...prev, questions: updated };
    });
  };

  const handleSetCorrectOption = (qIndex, optIndex) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], correctOptionIndex: optIndex };
      return { ...prev, questions: updated };
    });
  };

  // Batch selection toggle
  const toggleBatch = (batchId) => {
    setFormData((prev) => {
      const current = prev.targetBatches || [];
      const exists = current.includes(batchId);
      const updated = exists ? current.filter((id) => id !== batchId) : [...current, batchId];
      return { ...prev, targetBatches: updated, isAllBatches: false };
    });
  };

  // Submit form (Create / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Exam title is required.');
      return;
    }

    if (!formData.isAllBatches && formData.targetBatches.length === 0) {
      toast.error('Please select at least one batch or choose "All Batches".');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question #${i + 1} prompt cannot be empty.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          toast.error(`Question #${i + 1}, Option ${String.fromCharCode(65 + j)} cannot be empty.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      if (editingExamId) {
        await updateExam(editingExamId, formData);
        toast.success('Exam updated successfully!');
      } else {
        await createExam(formData);
        toast.success('Exam created & scheduled successfully!');
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (exam) => {
    const nextStatus = exam.status === 'active' ? 'inactive' : 'active';
    try {
      await toggleExamStatus(exam._id, nextStatus);
      toast.success(
        nextStatus === 'active'
          ? `Exam is now ACTIVE! Students can take this exam.`
          : `Exam has been deactivated.`
      );
      setExams((prev) =>
        prev.map((e) => (e._id === exam._id ? { ...e, status: nextStatus } : e))
      );
    } catch {
      toast.error('Failed to change exam status.');
    }
  };

  // Delete Exam
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}" and all student submissions?`)) {
      return;
    }
    try {
      await deleteExam(id);
      toast.success('Exam deleted successfully.');
      setExams((prev) => prev.filter((e) => e._id !== id));
    } catch {
      toast.error('Failed to delete exam.');
    }
  };

  // View Leaderboard
  const handleViewLeaderboard = async (exam, batch = 'all') => {
    setSelectedExam(exam);
    setLeaderboardBatch(batch);
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    try {
      const res = await getExamLeaderboard(exam._id, { batch: batch !== 'all' ? batch : undefined });
      setLeaderboardData(res.data?.leaderboard || []);
    } catch {
      toast.error('Failed to load leaderboard data.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (statusFilter !== 'all' && exam.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && exam.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = exam.title?.toLowerCase().includes(q);
        const matchCat = exam.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [exams, statusFilter, categoryFilter, search]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = exams.length;
    const active = exams.filter((e) => e.status === 'active').length;
    const totalSubmissions = exams.reduce((sum, e) => sum + (e.stats?.totalSubmissions || 0), 0);
    const totalTerminated = exams.reduce((sum, e) => sum + (e.stats?.terminatedCount || 0), 0);
    return { total, active, totalSubmissions, totalTerminated };
  }, [exams]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Quick Navigation */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md">
              <FileCheck className="h-4 w-4 text-cyan-400" />
              <span>Assessment & Proctoring Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Exam Scheduler & Question Bank
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-2xl leading-relaxed">
              Schedule MCQ exams (1 mark per question), target cohorts, and enforce strict proctoring (tab-switch detection limit of 5, AI webcam phone detection with 2 warnings).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/trainer/marks-matrix"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <TableProperties className="h-4 w-4" />
              <span>Marks Matrix (Excel)</span>
            </Link>

            <Link
              to="/trainer/student-progress"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <UserCheck className="h-4 w-4" />
              <span>Track Student Progress</span>
            </Link>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-teal-400 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule New Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Exams</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live Active Exams</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Student Attempts</p>
          <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">{stats.totalSubmissions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-rose-500 dark:text-rose-400">Cheating Violations</p>
          <p className="mt-1 text-2xl font-black text-rose-500 dark:text-rose-400">{stats.totalTerminated}</p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exam by title or category..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-sm">
            {['all', 'active', 'draft', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-4">
            <FileCheck className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Scheduled Exams Found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'No exams match your search or filter criteria.'
              : 'Create your first MCQ exam to schedule assessments for student batches.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Exam</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => {
            const isLive = exam.status === 'active';
            const totalQ = exam.questions?.length || exam.totalMarks || 0;
            const subCount = exam.stats?.totalSubmissions || 0;
            const passCount = exam.stats?.passedCount || 0;
            const terminatedCount = exam.stats?.terminatedCount || 0;

            return (
              <div
                key={exam._id}
                className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 dark:bg-slate-900/90 ${
                  isLive
                    ? 'border-emerald-500/40 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/80 hover:shadow-xl hover:shadow-cyan-500/10'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header: Badges & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-400/20">
                        {exam.category || 'General'}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {exam.isAllBatches
                          ? 'All Batches'
                          : exam.targetBatches?.map((b) => b.name).join(', ') || 'Custom Batches'}
                      </span>
                    </div>

                    {/* Status Pill Toggle */}
                    <button
                      onClick={() => handleToggleStatus(exam)}
                      title={isLive ? 'Click to deactivate exam' : 'Click to make exam live for students'}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        isLive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : exam.status === 'draft'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                          : 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300 hover:bg-amber-500/25'
                      }`}
                    >
                      {isLive ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3" />}
                      <span className="capitalize">{exam.status}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Details Pill grid */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                      <Clock className="h-3.5 w-3.5 text-cyan-500" />
                      <span className="font-semibold">{exam.duration} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                      <HelpCircle className="h-3.5 w-3.5 text-teal-500" />
                      <span className="font-semibold">{totalQ} MCQs ({totalQ} Pts)</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold">{exam.passPercentage}% Pass Mark</span>
                    </div>
                  </div>

                  {/* Submissions & Telemetry Stats Bar */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-950/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Total Attempts: </span>
                      <strong className="text-slate-900 dark:text-white font-bold">{subCount}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {passCount} Passed
                      </span>
                      {terminatedCount > 0 && (
                        <span className="text-rose-500 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {terminatedCount} Terminated
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewLeaderboard(exam)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors cursor-pointer"
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      <span>Leaderboard</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(exam)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isLive ? 'Deactivate' : 'Activate Exam'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(exam)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-cyan-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Exam"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(exam._id, exam.title)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Exam"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT EXAM MODAL ── */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingExamId ? 'Edit Scheduled Examination' : 'Schedule New MCQ Examination'}
        size="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Metadata Section */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Exam Details & Configuration
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Linux System Administration & Shell Scripting Assessment"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructions / Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Guidelines, topic scope, or instructions for the student..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={formData.passPercentage}
                  onChange={(e) => setFormData({ ...formData, passPercentage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Target Batches Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Batches
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAllBatches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isAllBatches: e.target.checked,
                        targetBatches: e.target.checked ? [] : formData.targetBatches,
                      })
                    }
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>All Batches (Cohorts)</span>
                </label>
              </div>

              {!formData.isAllBatches && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {batches.map((batch) => {
                    const selected = formData.targetBatches?.includes(batch._id);
                    return (
                      <button
                        type="button"
                        key={batch._id}
                        onClick={() => toggleBatch(batch._id)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          selected
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {batch.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Initial Status:
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800 text-xs">
                {['draft', 'active'].map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setFormData({ ...formData, status: st })}
                    className={`rounded-lg px-3 py-1 font-bold capitalize transition-all cursor-pointer ${
                      formData.status === st
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st === 'active' ? 'Active (Live)' : 'Draft (Saved)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Questions Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Questions Pool ({formData.questions.length} Marks Total)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each MCQ is worth 1 mark. Select the radio corresponding to the correct answer.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-cyan-600 dark:text-cyan-400">
                      <span>Question #{qIdx + 1}</span>
                      <span className="text-slate-400 font-normal">(1 Mark)</span>
                    </span>
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Question Prompt *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                      placeholder="e.g. Which command is used to display disk space usage in human-readable format in Linux?"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Optional Code Snippet */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Code Snippet / Terminal Output (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={q.codeSnippet}
                      onChange={(e) => handleQuestionChange(qIdx, 'codeSnippet', e.target.value)}
                      placeholder="e.g. ls -la /var/log | grep auth"
                      className="w-full font-mono rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-cyan-300"
                    />
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Options & Correct Answer Selection:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctOptionIndex === optIdx;
                        const labelChar = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 rounded-xl border p-2 transition-all ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-500/80 dark:bg-emerald-950/30'
                                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <span className="text-xs font-black text-slate-400 dark:text-slate-500">
                              {labelChar}.
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${labelChar}`}
                              className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none dark:text-white"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                Correct ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Explanation */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Explanation (shown to student after submission)
                    </label>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                      placeholder="e.g. df -h outputs disk usage in megabytes and gigabytes."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/25 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving Exam...' : editingExamId ? 'Update Exam' : 'Schedule & Publish Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── LEADERBOARD MODAL ── */}
      <Modal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        title={selectedExam ? `Leaderboard: ${selectedExam.title}` : 'Exam Leaderboard'}
        size="xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Batch Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch/Batch:</span>
            <button
              onClick={() => handleViewLeaderboard(selectedExam, 'all')}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                leaderboardBatch === 'all'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Batches
            </button>
            {batches.map((b) => (
              <button
                key={b._id}
                onClick={() => handleViewLeaderboard(selectedExam, b._id)}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  leaderboardBatch === b._id
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {leaderboardLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <Skeleton key={n} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No completed student submissions for this batch yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4 text-center">Time Spent</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboardData.map((row) => {
                    const isTerminated = row.status === 'terminated';
                    const isGold = row.rank === 1 && row.passed;
                    const isSilver = row.rank === 2 && row.passed;
                    const isBronze = row.rank === 3 && row.passed;

                    return (
                      <tr
                        key={row.submissionId}
                        className={`transition-colors ${
                          isGold
                            ? 'bg-amber-500/10 font-bold'
                            : isTerminated
                            ? 'bg-rose-500/5 text-rose-500'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-extrabold">
                          {isGold ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs shadow-sm">
                              🥇
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-slate-900 text-xs">
                              🥈
                            </span>
                          ) : isBronze ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-white text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-500">#{row.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            {row.studentName}
                          </p>
                          <p className="text-[10px] text-slate-400">{row.studentEmail}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {row.batchName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900 dark:text-white text-sm">
                          {row.score} / {row.totalMarks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                              row.passed
                                ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400'
                            }`}
                          >
                            {row.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {Math.floor(row.timeSpentSeconds / 60)}m {row.timeSpentSeconds % 60}s
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {isTerminated ? (
                            <span
                              title={row.terminationReason}
                              className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-extrabold"
                            >
                              <ShieldAlert className="h-3 w-3" /> Terminated (0 Pts)
                            </span>
                          ) : row.passed ? (
                            <span className="text-[11px] text-emerald-600">Passed ✓</span>
                          ) : (
                            <span className="text-[11px] text-rose-500">Failed ✗</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
