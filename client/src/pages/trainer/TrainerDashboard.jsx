import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTrainerStats } from '../../api/students';
import { getBatches } from '../../api/batches';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Video, 
  MessageSquare, 
  Layers, 
  Upload, 
  Plus, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Radio,
  Clock,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import toast from 'react-hot-toast';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

function formatVideoTimestamp(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TrainerDashboard() {
  const socket = useSocket();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats and batches (silent = background update without skeletons)
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [statsRes, batchesRes] = await Promise.allSettled([
        getTrainerStats(),
        getBatches(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
        if (statsRes.value.data?.recentQuestions) {
          setRecentQuestions(statsRes.value.data.recentQuestions);
        }
      }
      if (batchesRes.status === 'fulfilled') {
        setBatches(batchesRes.value.data?.batches || []);
      }
    } catch (err) {
      if (isInitial) setError('Failed to load dashboard data');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Real-time live socket listener for instant dashboard updates
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = () => {
      loadData(false);
    };

    const handleStudentEnrolled = (data) => {
      loadData(false);
      const studentName = data.student
        ? `${data.student.firstName} ${data.student.lastName}`
        : 'New student';
      const batchText = data.batchName ? ` to Batch ${data.batchName}` : '';
      toast.success(`🎓 ${studentName} enrolled${batchText}!`, {
        duration: 5000,
      });
    };

    const handleTrainerNewQuestion = (data) => {
      if (data?.question) {
        setRecentQuestions((prev) => [
          data.question,
          ...prev.filter((q) => q._id !== data.question._id),
        ]);
        setStats((prev) =>
          prev
            ? { ...prev, unansweredQuestions: (prev.unansweredQuestions || 0) + 1 }
            : prev
        );
      }
      loadData(false);
      const studentName = data.question?.student
        ? `${data.question.student.firstName} ${data.question.student.lastName || ''}`.trim()
        : 'A student';
      const qText = data.question?.text
        ? `"${data.question.text.slice(0, 45)}${data.question.text.length > 45 ? '...' : ''}"`
        : 'New question posted';
      toast(`❓ ${studentName}: ${qText}`, {
        duration: 6000,
      });
    };

    const handleTrainerQuestionUpdated = (data) => {
      if (data?.question) {
        setRecentQuestions((prev) =>
          prev.map((q) => (q._id === data.question._id ? data.question : q))
        );
      }
      loadData(false);
    };

    const handleTrainerQuestionDeleted = (data) => {
      if (data?.questionId) {
        setRecentQuestions((prev) => prev.filter((q) => q._id !== data.questionId));
      }
      loadData(false);
    };

    socket.on('stats_update', handleStatsUpdate);
    socket.on('student_enrolled', handleStudentEnrolled);
    socket.on('trainer_new_question', handleTrainerNewQuestion);
    socket.on('trainer_question_updated', handleTrainerQuestionUpdated);
    socket.on('trainer_question_deleted', handleTrainerQuestionDeleted);

    return () => {
      socket.off('stats_update', handleStatsUpdate);
      socket.off('student_enrolled', handleStudentEnrolled);
      socket.off('trainer_new_question', handleTrainerNewQuestion);
      socket.off('trainer_question_updated', handleTrainerQuestionUpdated);
      socket.off('trainer_question_deleted', handleTrainerQuestionDeleted);
    };
  }, [socket, loadData]);

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      link: '/trainer/students',
    },
    {
      title: 'Total Lectures',
      value: stats?.totalLectures ?? 0,
      icon: Video,
      color: 'from-indigo-500 to-purple-600',
      link: '/trainer/lectures',
    },
    {
      title: 'Unanswered Q&A',
      value: stats?.unansweredQuestions ?? 0,
      icon: MessageSquare,
      color: 'from-amber-500 to-rose-600',
      link: '/trainer/questions',
    },
    {
      title: 'Active Batches',
      value: batches.filter(b => b.isActive).length,
      icon: Layers,
      color: 'from-emerald-500 to-teal-600',
      link: '/trainer/batches',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Trainer Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-xl">
              Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Trainer'}! Here is an overview of your batches, lectures, and students.
            </p>
            {Array.isArray(user?.allowedCategories) && user.allowedCategories.length > 0 && (
              <div className="pt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                  🎯 Assigned Track{user.allowedCategories.length > 1 ? 's' : ''}: {user.allowedCategories.join(', ')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-cyan-100 border border-white/20">
                  📁 Notes Upload: {user.canUploadNotes ? 'Enabled' : 'Disabled (Videos Only)'}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/trainer/upload">
              <Button variant="primary" icon={Upload}>
                Upload Lecture
              </Button>
            </Link>
            <Link to="/trainer/batches">
              <Button variant="secondary" icon={Plus}>
                New Batch
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              to={card.link}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-cyan-500/40 dark:hover:shadow-cyan-500/15"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {loading ? <Skeleton className="h-9 w-16" /> : card.value}
                  </p>
                </div>
                <div className={`rounded-xl bg-gradient-to-tr ${card.color} p-3.5 text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-cyan-600 dark:text-cyan-400">
                <span>View details</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Batch Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Batch Enrollment Overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current student distribution across active batches</p>
          </div>
          <Link to="/trainer/batches" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Manage All Batches &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No active batches found</p>
            <Link to="/trainer/batches" className="mt-2 inline-block text-xs font-semibold text-indigo-600">
              Create your first batch
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div
                key={batch._id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-indigo-500/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {batch.name}
                    </span>
                    <h3 className="mt-2 font-bold text-slate-800 dark:text-slate-200">
                      {batch.description || 'Standard Training Batch'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {batch.studentCount ?? 0}
                    </span>
                    <p className="text-[11px] text-slate-500">students</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Status: <strong className={batch.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>{batch.isActive ? 'Active' : 'Inactive'}</strong>
                  </span>
                  <Link
                    to={`/trainer/students?batch=${batch._id}`}
                    className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    View Students &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Student Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Student Questions</h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              Live Feed
            </span>
          </div>
          <Link
            to="/trainer/questions"
            className="text-xs font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 flex items-center gap-1"
          >
            <span>View All in Q&A Inbox</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : recentQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/30">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-400 mb-2 opacity-60" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No student questions yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              When students post questions during lectures, they will appear here in real time without refreshing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentQuestions.map((q) => {
              const studentName = q.isAnonymous
                ? 'Anonymous Student'
                : q.student
                ? `${q.student.firstName} ${q.student.lastName || ''}`.trim()
                : 'Student';
              const isOpen = q.status === 'open';

              return (
                <div
                  key={q._id}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-400/50 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-cyan-500/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-cyan-500/20">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {studentName}
                          </span>
                          {q.batch?.name && (
                            <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              {q.batch.name}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isOpen
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}
                          >
                            {isOpen ? 'Needs Reply' : 'Resolved'}
                          </span>
                        </div>

                        {q.lecture?.title && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Video className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                            <span className="truncate">{q.lecture.title}</span>
                            {q.videoTimestamp !== null && q.videoTimestamp !== undefined && (
                              <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                                @ {formatVideoTimestamp(q.videoTimestamp)}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-sm text-slate-700 dark:text-slate-300 pt-1 line-clamp-2">
                          {q.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(q.createdAt)}
                      </span>
                      <Link
                        to="/trainer/questions"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs transition-colors border border-cyan-500/30"
                      >
                        <span>Reply in Inbox</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
