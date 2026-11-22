import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getExams, getMyExamHistory, getExamLeaderboard } from '../../api/exams';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import {
  FileCheck,
  Play,
  Clock,
  Award,
  Layers,
  Trophy,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  HelpCircle,
  History,
  Calendar,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentExamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leaderboard modal
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [leaderboardList, setLeaderboardList] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const batchName =
    typeof user?.batch === 'object'
      ? user.batch?.name
      : user?.batch || 'General Batch';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [examsRes, historyRes] = await Promise.all([
        getExams(),
        getMyExamHistory(),
      ]);
      setExams(examsRes.data?.exams || []);
      setHistory(historyRes.data?.submissions || []);
    } catch {
      toast.error('Failed to load examination catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenLeaderboard = async (exam) => {
    setSelectedExam(exam);
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    try {
      const res = await getExamLeaderboard(exam._id || exam.id);
      setLeaderboardList(res.data?.leaderboard || []);
    } catch {
      toast.error('Failed to load leaderboard.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md shadow-sm">
              <Layers className="h-3.5 w-3.5 text-cyan-300" />
              <span>Cohort: Batch {batchName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mentore Assessment & Testing Portal
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-xl">
              Access scheduled MCQ examinations, test your technical proficiency, and view branch-wide rankings on the Leaderboard.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/40 p-4 text-left sm:text-right backdrop-blur-sm shadow-inner">
            <span className="text-3xl font-black text-cyan-100">{exams.length}</span>
            <p className="text-xs font-medium text-cyan-300">Active Exams Available</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('active')}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Scheduled Exams ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>My Exam History ({history.length})</span>
        </button>
      </div>

      {/* Tab 1: Scheduled Active Exams */}
      {activeTab === 'active' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-60 rounded-3xl" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-3">
                <FileCheck className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Active Exams Right Now</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your trainers have not activated any examinations for Batch {batchName} at this time. Please check back when announced.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {exams.map((exam) => {
                const sub = exam.mySubmission;
                const isCompleted = sub && (sub.status === 'completed' || sub.status === 'terminated');
                const isTerminated = sub?.status === 'terminated';

                return (
                  <div
                    key={exam._id}
                    className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:border-cyan-400/80 hover:shadow-xl hover:shadow-cyan-500/10 dark:border-slate-800/90 dark:bg-slate-900/90 transition-all duration-300"
                  >
                    <div className="space-y-4">
                      {/* Category & Status */}
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-400/20">
                          {exam.category || 'General'}
                        </span>
                        {isCompleted ? (
                          isTerminated ? (
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-black text-rose-600 flex items-center gap-1 border border-rose-400/30">
                              <ShieldAlert className="h-3.5 w-3.5" /> Terminated (0 Pts)
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black flex items-center gap-1 ${
                                sub.passed
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {sub.passed ? '✓ Completed (Passed)' : '✗ Completed (Failed)'}
                            </span>
                          )
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Exam
                          </span>
                        )}
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

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                          <Clock className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="font-semibold">{exam.duration} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                          <HelpCircle className="h-3.5 w-3.5 text-teal-500" />
                          <span className="font-semibold">{exam.totalMarks} Questions</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold">{exam.passPercentage}% Pass</span>
                        </div>
                      </div>

                      {/* Previous Result Summary Banner if already completed */}
                      {isCompleted && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400">Your Score: </span>
                            <strong className="text-slate-900 dark:text-white font-black text-sm">
                              {sub.score} / {sub.totalMarks} ({sub.percentage}%)
                            </strong>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleOpenLeaderboard(exam)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors cursor-pointer"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        <span>Leaderboard</span>
                      </button>

                      {isCompleted ? (
                        <span className="text-xs font-bold text-slate-400">
                          Attempt Finalized
                        </span>
                      ) : (
                        <Link
                          to={`/exams/${exam._id}/take`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/25 hover:from-cyan-500 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Start Proctored Exam</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Exam History */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              You haven&apos;t completed any scheduled examinations yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Exam Title</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Score Obtained</th>
                    <th className="py-3.5 px-4 text-center">Percentage</th>
                    <th className="py-3.5 px-4 text-center">Time Spent</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((sub) => {
                    const isTerminated = sub.status === 'terminated';
                    return (
                      <tr key={sub._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            {sub.exam?.title || 'Examination'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Pending'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {sub.exam?.category || 'General'}
                          </span>
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
                        <td className="py-3.5 px-4 text-center text-slate-500">
                          {Math.floor((sub.timeSpentSeconds || 0) / 60)}m {(sub.timeSpentSeconds || 0) % 60}s
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {isTerminated ? (
                            <span
                              title={sub.terminationReason}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-600 border border-rose-400/20"
                            >
                              <ShieldAlert className="h-3 w-3" /> Terminated (0 Pts)
                            </span>
                          ) : sub.passed ? (
                            <span className="text-emerald-600">Passed ✓</span>
                          ) : (
                            <span className="text-rose-500">Failed ✗</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {sub.exam && (
                            <button
                              onClick={() => handleOpenLeaderboard(sub.exam)}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors cursor-pointer"
                            >
                              <Trophy className="h-3 w-3" /> Leaderboard
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
      )}

      {/* Leaderboard Modal */}
      <Modal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        title={selectedExam ? `Batch Standings: ${selectedExam.title}` : 'Exam Standings'}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {leaderboardLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : leaderboardList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No results recorded for this examination yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Rank</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboardList.map((row) => (
                    <tr
                      key={row.submissionId}
                      className={row.studentId === user?._id ? 'bg-cyan-500/10 font-bold' : ''}
                    >
                      <td className="py-3 px-3 text-center font-black">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {row.studentName} {row.studentId === user?._id && '(You)'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {row.batchName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white">
                        {row.score} / {row.totalMarks}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            row.passed
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-rose-500/15 text-rose-600'
                          }`}
                        >
                          {row.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {row.status === 'terminated' ? (
                          <span className="text-[10px] text-rose-500">Violated (0 Pts)</span>
                        ) : row.passed ? (
                          <span className="text-[10px] text-emerald-600">Passed ✓</span>
                        ) : (
                          <span className="text-[10px] text-rose-500">Failed ✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
