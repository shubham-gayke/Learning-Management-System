import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getStudentProgress } from '../../api/exams';
import { getStudents } from '../../api/students';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import {
  UserCheck,
  Search,
  Award,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  HelpCircle,
  TableProperties,
  FileCheck,
  Calendar,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Answer review modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectSubmission, setInspectSubmission] = useState(null);

  // Search candidates
  useEffect(() => {
    async function loadCandidates() {
      try {
        const res = await getStudents({ search: searchQuery.trim() || undefined, limit: 15 });
        setCandidatesList(res.data?.students || []);
      } catch {}
    }
    const timer = setTimeout(loadCandidates, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load selected candidate's progress
  const fetchProgress = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getStudentProgress(id);
      setProgressData(res.data);
    } catch {
      toast.error('Failed to load candidate progress records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchProgress(selectedStudentId);
      setSearchParams({ studentId: selectedStudentId });
    }
  }, [selectedStudentId, fetchProgress, setSearchParams]);

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student._id);
    setSearchQuery(`${student.firstName} ${student.lastName}`);
  };

  const handleInspectAnswers = (submission) => {
    setInspectSubmission(submission);
    setInspectModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md">
              <UserCheck className="h-4 w-4 text-cyan-400" />
              <span>Candidate Analytics & Audit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Track Student Examination Progress
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-2xl leading-relaxed">
              Search any enrolled student candidate to review their individual assessment history, exam-wise score breakdowns, passing milestones, and anti-cheating audit telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/trainer/exams"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <FileCheck className="h-4 w-4" />
              <span>Exam Scheduler</span>
            </Link>

            <Link
              to="/trainer/marks-matrix"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <TableProperties className="h-4 w-4" />
              <span>Marks Matrix</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Candidate Search Box with Instant Autocomplete */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Search Candidate by Name or Email
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type student name (e.g. Akshay, Shubham) or email..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:bg-slate-800 shadow-inner"
          />
        </div>

        {/* Candidate Autocomplete Matches */}
        {candidatesList.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400 py-1">Quick Select:</span>
            {candidatesList.map((st) => (
              <button
                key={st._id}
                onClick={() => handleSelectStudent(st)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedStudentId === st._id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <span>{st.firstName} {st.lastName}</span>
                <span className="text-[10px] opacity-70">({st.batch?.name || 'General'})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Progress Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : !progressData ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-3">
            <UserCheck className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Select a Candidate</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Search for any student in the search box above to inspect all exams taken and performance analytics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Candidate Profile & Analytics Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white text-xl font-black shadow-lg shadow-cyan-600/25">
                  {progressData.student.firstName?.charAt(0)}
                  {progressData.student.lastName?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {progressData.student.firstName} {progressData.student.lastName}
                    </h2>
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                      Cohort: {progressData.student.batch?.name || 'General Batch'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {progressData.student.email} • Enrolled {new Date(progressData.student.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Average Progress Radial / Pill */}
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-50/50 p-4 dark:border-cyan-400/10 dark:bg-cyan-950/30">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cumulative Average</p>
                  <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                    {progressData.summary?.averagePercentage || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Exams Attempted</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {progressData.summary?.totalAttempted || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Exams Passed</p>
                <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {progressData.summary?.totalPassed || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Marks Scored</p>
                <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">
                  {progressData.summary?.totalScore || 0} / {progressData.summary?.totalMaxPossible || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-medium text-rose-500 dark:text-rose-400">Cheating Violations</p>
                <p className="mt-1 text-2xl font-black text-rose-500 dark:text-rose-400">
                  {progressData.summary?.totalTerminated || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Exam-wise Chronological History Table */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Exam-Wise Assessment Records
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All tests taken by this candidate with marks, scores, and security telemetry.
                </p>
              </div>
            </div>

            {progressData.submissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                This student has not attempted any scheduled exams yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Exam Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-center">Date Attempted</th>
                      <th className="py-3.5 px-4 text-center">Score / Marks</th>
                      <th className="py-3.5 px-4 text-center">Percentage</th>
                      <th className="py-3.5 px-4 text-center">Violations</th>
                      <th className="py-3.5 px-4 text-center">Result Status</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {progressData.submissions.map((sub) => {
                      const isTerminated = sub.status === 'terminated';
                      return (
                        <tr
                          key={sub._id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-900 dark:text-white">
                              {sub.exam?.title || 'Examination'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Time taken: {Math.floor((sub.timeSpentSeconds || 0) / 60)}m {(sub.timeSpentSeconds || 0) % 60}s
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {sub.exam?.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500">
                            {sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'In Progress'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-white text-sm">
                            {sub.score} / {sub.totalMarks}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                                sub.passed
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400'
                              }`}
                            >
                              {sub.percentage}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {sub.tabSwitchCount > 0 || sub.phoneDetectionCount > 0 ? (
                              <div className="inline-flex flex-col text-[10px] text-rose-500 font-bold">
                                {sub.tabSwitchCount > 0 && <span>{sub.tabSwitchCount} Tab Switches</span>}
                                {sub.phoneDetectionCount > 0 && <span>{sub.phoneDetectionCount} Phone Flags</span>}
                              </div>
                            ) : (
                              <span className="text-emerald-600 text-[11px]">0 Flags ✓</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            {isTerminated ? (
                              <span
                                title={sub.terminationReason}
                                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] text-rose-600 font-bold border border-rose-400/20"
                              >
                                <ShieldAlert className="h-3 w-3" /> Terminated (0 Pts)
                              </span>
                            ) : sub.passed ? (
                              <span className="text-emerald-600 text-xs">Passed ✓</span>
                            ) : (
                              <span className="text-rose-500 text-xs">Failed ✗</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {sub.answers?.length > 0 && (
                              <button
                                onClick={() => handleInspectAnswers(sub)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Audit</span>
                              </button>
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
        </div>
      )}

      {/* Answers Audit Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={inspectSubmission ? `Exam Answers Audit: ${inspectSubmission.exam?.title}` : 'Answers Audit'}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {inspectSubmission?.terminationReason && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-extrabold">Proctor Security Termination</p>
                <p className="mt-0.5 opacity-90">{inspectSubmission.terminationReason}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {inspectSubmission?.answers?.map((ans, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-4 text-xs space-y-1.5 ${
                  ans.isCorrect
                    ? 'border-emerald-500/40 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                    : 'border-rose-500/40 bg-rose-50/40 dark:border-rose-500/30 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Question #{ans.questionIndex + 1}</span>
                  <span className={ans.isCorrect ? 'text-emerald-600' : 'text-rose-500'}>
                    {ans.isCorrect ? '✓ Correct (+1 Mark)' : '✗ Incorrect (0 Marks)'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Selected Choice: <strong>Option {ans.selectedOptionIndex !== null ? String.fromCharCode(65 + ans.selectedOptionIndex) : 'None (Unattempted)'}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
