import { useState, useEffect, useCallback } from 'react';
import {
  getTrainerQuestions,
  addQuestionMessage,
  updateQuestion,
  deleteQuestion,
} from '../../api/questions';
import { getBatches } from '../../api/batches';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  EyeOff,
  Clock,
  Trash2,
  Send,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function QAInboxPage() {
  const socket = useSocket();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Reply states
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyingMap, setReplyingMap] = useState({});

  const fetchQuestions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = {};
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedStatus) params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await getTrainerQuestions(params);
      setQuestions(res.data?.questions || []);
    } catch {
      if (!silent) toast.error('Failed to load questions');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedBatch, selectedStatus, search]);

  useEffect(() => {
    getBatches()
      .then((res) => setBatches(res.data?.batches || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchQuestions(false);
  }, [fetchQuestions]);

  // Real-time live socket listener for Q&A inbox
  useEffect(() => {
    if (!socket) return;

    const handleNewQuestion = (data) => {
      if (data?.question) {
        setQuestions((prev) => [
          data.question,
          ...prev.filter((q) => q._id !== data.question._id),
        ]);
      }
      fetchQuestions(true);
      const name = data.question?.student?.firstName || 'A student';
      toast(`💬 New question from ${name}`, { duration: 4000 });
    };

    const handleUpdate = () => {
      fetchQuestions(true);
    };

    socket.on('trainer_new_question', handleNewQuestion);
    socket.on('question_message', handleUpdate);
    socket.on('trainer_question_updated', handleUpdate);
    socket.on('trainer_question_deleted', handleUpdate);

    return () => {
      socket.off('trainer_new_question', handleNewQuestion);
      socket.off('question_message', handleUpdate);
      socket.off('trainer_question_updated', handleUpdate);
      socket.off('trainer_question_deleted', handleUpdate);
    };
  }, [socket, fetchQuestions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleSendReply = async (questionId) => {
    const text = replyTextMap[questionId]?.trim();
    if (!text) return;

    try {
      setReplyingMap((prev) => ({ ...prev, [questionId]: true }));
      const res = await addQuestionMessage(questionId, { text });

      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? res.data.question : q))
      );

      setReplyTextMap((prev) => ({ ...prev, [questionId]: '' }));
      toast.success('Reply sent to student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplyingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleToggleResolve = async (q) => {
    const newStatus = q.status === 'open' ? 'resolved' : 'open';
    try {
      const res = await updateQuestion(q._id, { status: newStatus });
      setQuestions((prev) =>
        prev.map((item) => (item._id === q._id ? res.data.question : item))
      );
      toast.success(newStatus === 'resolved' ? 'Marked resolved' : 'Reopened question');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleTogglePrivacy = async (q) => {
    try {
      const res = await updateQuestion(q._id, { isPrivate: !q.isPrivate });
      setQuestions((prev) =>
        prev.map((item) => (item._id === q._id ? res.data.question : item))
      );
      toast.success(!q.isPrivate ? 'Question marked private' : 'Question made public to batch');
    } catch {
      toast.error('Failed to update privacy');
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Delete this question thread?')) return;
    try {
      await deleteQuestion(questionId);
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Q&A Inbox</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Answer student queries, clarify concepts, and share public solutions with batches.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search question text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <Button variant="secondary" type="submit" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Unresolved (Open)</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Questions Thread List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No questions in inbox"
          description="Student questions will appear here for you to answer."
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const studentLabel = `${q.student?.firstName || 'Student'} ${q.student?.lastName || ''} (${q.student?.email || ''})`;

            return (
              <div
                key={q._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                        {q.batch?.name || 'Batch'}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {q.lecture?.title || 'Lecture'}
                      </span>
                      {q.videoTimestamp !== null && q.videoTimestamp !== undefined && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(q.videoTimestamp)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>Asked by: <strong className="text-slate-800 dark:text-slate-200">{studentLabel}</strong></span>
                      {q.isAnonymous && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          <EyeOff className="h-2.5 w-2.5" /> Hidden from students
                        </span>
                      )}
                      {q.isPrivate && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                          <Lock className="h-2.5 w-2.5" /> Private
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      q.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap pl-1 font-medium">
                  {q.text}
                </p>

                {/* Conversation History */}
                {q.messages && q.messages.length > 1 && (
                  <div className="space-y-2.5 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900">
                    {q.messages.slice(1).map((msg, i) => {
                      const isMsgTrainer = msg.role === 'trainer';
                      return (
                        <div
                          key={i}
                          className={`rounded-xl p-3 text-xs ${
                            isMsgTrainer
                              ? 'bg-indigo-50/80 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50'
                              : 'bg-slate-50 text-slate-800 dark:bg-slate-700/50 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold">
                              {isMsgTrainer
                                ? `${user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Trainer'} (You)`
                                : `${msg.sender?.firstName || 'Student'}`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply Form */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type your response to the student..."
                    value={replyTextMap[q._id] || ''}
                    onChange={(e) =>
                      setReplyTextMap({ ...replyTextMap, [q._id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply(q._id);
                    }}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Send}
                    onClick={() => handleSendReply(q._id)}
                    isLoading={replyingMap[q._id]}
                    disabled={!replyTextMap[q._id]?.trim()}
                    className="text-xs"
                  >
                    Reply
                  </Button>
                </div>

                {/* Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleResolve(q)}
                      className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      {q.status === 'resolved' ? 'Reopen Thread' : 'Mark Resolved'}
                    </button>
                    <button
                      onClick={() => handleTogglePrivacy(q)}
                      className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {q.isPrivate ? 'Make Public to Batch' : 'Make Private'}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="text-rose-600 hover:text-rose-500 dark:text-rose-400"
                    title="Delete Question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
