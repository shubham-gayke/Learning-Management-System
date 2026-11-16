import { useState, useEffect } from 'react';
import {
  getLectureQuestions,
  askQuestion,
  addQuestionMessage,
  updateQuestion,
  deleteQuestion,
} from '../../api/questions';
import { useSocket } from '../../contexts/SocketContext';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  MessageSquare,
  Send,
  Clock,
  EyeOff,
  Lock,
  CheckCircle2,
  Trash2,
  Share2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function AskTrainerTab({
  lectureId,
  lecture,
  user,
  getCurrentVideoTime,
  onSeekToTime,
}) {
  const socket = useSocket();
  const isTrainer = user?.role === 'trainer';

  const instructorName = lecture?.createdBy
    ? `${lecture.createdBy.firstName} ${lecture.createdBy.lastName || ''}`.trim()
    : (lecture?.category === 'DevOps Lectures'
        ? 'Suraj Bele'
        : (['Linux Lectures', 'AWS Lectures'].includes(lecture?.category)
            ? 'Shrikant Somwanshi'
            : 'Shubham Gayke'));

  const isAssignedTrainer =
    isTrainer &&
    (!lecture?.createdBy ||
      (lecture.createdBy?._id || lecture.createdBy)?.toString() === user?._id?.toString() ||
      (Array.isArray(user?.allowedCategories) &&
        user.allowedCategories.includes(lecture?.category)) ||
      (!user?.allowedCategories?.length && !lecture?.createdBy));

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New question form
  const [questionText, setQuestionText] = useState('');
  const [attachedTimestamp, setAttachedTimestamp] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active reply thread ID and reply text
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyingMap, setReplyingMap] = useState({});

  // Fetch questions
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await getLectureQuestions(lectureId);
      setQuestions(res.data?.questions || []);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [lectureId]);

  // Socket.IO real-time subscriptions
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_lecture', lectureId);

    const handleNewQuestion = ({ question }) => {
      setQuestions((prev) => [question, ...prev]);
    };

    const handleQuestionUpdated = ({ question }) => {
      setQuestions((prev) =>
        prev.map((q) => (q._id === question._id ? question : q))
      );
    };

    const handleQuestionDeleted = ({ questionId }) => {
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    };

    socket.on('new_question', handleNewQuestion);
    socket.on('question_updated', handleQuestionUpdated);
    socket.on('question_deleted', handleQuestionDeleted);

    return () => {
      socket.emit('leave_lecture', lectureId);
      socket.off('new_question', handleNewQuestion);
      socket.off('question_updated', handleQuestionUpdated);
      socket.off('question_deleted', handleQuestionDeleted);
    };
  }, [socket, lectureId]);

  // Attach current timestamp
  const handleAttachCurrentTime = () => {
    if (getCurrentVideoTime) {
      const current = Math.round(getCurrentVideoTime());
      setAttachedTimestamp(current);
      toast.success(`Attached timestamp: ${formatTimestamp(current)}`);
    }
  };

  // Submit new question
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    try {
      setSubmitting(true);
      const res = await askQuestion(lectureId, {
        text: questionText.trim(),
        videoTimestamp: attachedTimestamp,
        isAnonymous,
        isPrivate,
      });

      // Optimistically insert if not already received via socket
      setQuestions((prev) => {
        const exists = prev.some((q) => q._id === res.data.question._id);
        return exists ? prev : [res.data.question, ...prev];
      });

      setQuestionText('');
      setAttachedTimestamp(null);
      setIsAnonymous(false);
      setIsPrivate(false);
      toast.success('Question posted to trainer!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  // Send message reply in thread
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
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplyingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Toggle resolved
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

  // Toggle private/public (trainer only)
  const handleTogglePrivacy = async (q) => {
    try {
      const res = await updateQuestion(q._id, { isPrivate: !q.isPrivate });
      setQuestions((prev) =>
        prev.map((item) => (item._id === q._id ? res.data.question : item))
      );
      toast.success(!q.isPrivate ? 'Question made private' : 'Question made public to batch');
    } catch {
      toast.error('Failed to change privacy');
    }
  };

  // Delete question (trainer only)
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
      {/* Question Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Ask Trainer {instructorName}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Have a question about this lecture? Post it below for {instructorName} and attach your timestamp.
        </p>

        <form onSubmit={handleSubmitQuestion} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              maxLength={1000}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type your question or clarification here..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
              required
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] text-slate-400 dark:text-slate-500">
              {questionText.length}/1000
            </span>
          </div>

          {/* Form Actions & Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {/* Attach Timestamp Button */}
              <button
                type="button"
                onClick={handleAttachCurrentTime}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  attachedTimestamp !== null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {attachedTimestamp !== null
                  ? `At ${formatTimestamp(attachedTimestamp)} (Click to clear)`
                  : 'Attach Video Time'}
              </button>
              {attachedTimestamp !== null && (
                <button
                  type="button"
                  onClick={() => setAttachedTimestamp(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}

              {/* Anonymous Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <EyeOff className="h-3 w-3 text-slate-400" />
                <span>Ask anonymously</span>
              </label>

              {/* Private Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Ask privately</span>
              </label>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={Send}
              type="submit"
              isLoading={submitting}
              disabled={!questionText.trim()}
            >
              Post Question
            </Button>
          </div>
        </form>
      </div>

      {/* Questions Thread List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>Discussion & Questions ({questions.length})</span>
          <span className="text-xs font-normal text-slate-500">Live Socket Updates</span>
        </h4>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No questions yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Be the first to ask a question about this lecture!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const studentName =
                q.isAnonymous && !isTrainer && q.student?._id !== user?._id
                  ? 'Anonymous Student'
                  : `${q.student?.firstName || 'Student'} ${q.student?.lastName || ''}`;

              return (
                <div
                  key={q._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800 space-y-4"
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {studentName}
                          </span>
                          {q.isAnonymous && isTrainer && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              <EyeOff className="h-2.5 w-2.5" /> Anonymous to students (Actual: {q.student?.firstName} {q.student?.lastName})
                            </span>
                          )}
                          {q.isPrivate && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              <Lock className="h-2.5 w-2.5" /> Private
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp Jump Pill */}
                    <div className="flex items-center gap-2">
                      {q.videoTimestamp !== null && q.videoTimestamp !== undefined && (
                        <button
                          onClick={() => onSeekToTime && onSeekToTime(q.videoTimestamp)}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition dark:bg-indigo-950/70 dark:text-indigo-400"
                          title="Click to jump video to this moment"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(q.videoTimestamp)}
                        </button>
                      )}

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          q.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Question Text */}
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap pl-1">
                    {q.text}
                  </p>

                  {/* Threaded Chat Messages */}
                  {q.messages && q.messages.length > 1 && (
                    <div className="space-y-2.5 pl-4 border-l-2 border-indigo-100 dark:border-indigo-950">
                      {q.messages.slice(1).map((msg, i) => {
                        const isMsgTrainer = msg.role === 'trainer';
                        const trainerMsgLabel =
                          (q.trainer?.firstName
                            ? `${q.trainer.firstName} ${q.trainer.lastName || ''}`.trim()
                            : null) || instructorName;

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
                                {isMsgTrainer ? `${trainerMsgLabel} (Trainer)` : `${msg.sender?.firstName || 'Student'}`}
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

                  {/* Reply Input */}
                  {(!isTrainer || isAssignedTrainer) && (
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        placeholder={isTrainer ? 'Reply as trainer...' : 'Type a reply...'}
                        value={replyTextMap[q._id] || ''}
                        onChange={(e) =>
                          setReplyTextMap({ ...replyTextMap, [q._id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(q._id);
                        }}
                        className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReply(q._id)}
                        isLoading={replyingMap[q._id]}
                        disabled={!replyTextMap[q._id]?.trim()}
                        className="text-xs"
                      >
                        Reply
                      </Button>
                    </div>
                  )}

                  {/* Trainer Management Controls */}
                  {isTrainer && isAssignedTrainer && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleResolve(q)}
                          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {q.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                        </button>
                        <button
                          onClick={() => handleTogglePrivacy(q)}
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {q.isPrivate ? 'Make Public' : 'Make Private'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(q._id)}
                        className="text-rose-600 hover:text-rose-500 dark:text-rose-400"
                        title="Delete Question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
