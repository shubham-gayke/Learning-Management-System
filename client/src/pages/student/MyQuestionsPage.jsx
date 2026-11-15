import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStudentQuestions } from '../../api/questions';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { MessageSquare, ArrowRight, Clock, Lock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MyQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getStudentQuestions();
        setQuestions(res.data?.questions || []);
      } catch {
        toast.error('Failed to load your questions');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Questions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track all questions you have asked trainer Shubham Gayke across your lectures.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No questions asked yet"
          description="When you post questions in any lecture, they will appear here with the trainer's replies."
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const lectureId = q.lecture?._id || q.lecture;
            const lectureTitle = q.lecture?.title || 'Lecture';

            return (
              <div
                key={q._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                      {lectureTitle}
                    </span>
                    {q.videoTimestamp !== null && q.videoTimestamp !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(q.videoTimestamp)}
                      </span>
                    )}
                    {q.isPrivate && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        <Lock className="h-2.5 w-2.5" /> Private
                      </span>
                    )}
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

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {q.text}
                </p>

                {/* Latest message preview */}
                {q.messages && q.messages.length > 1 && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300 border-l-2 border-indigo-500">
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                      Latest Reply ({q.messages[q.messages.length - 1].role === 'trainer' ? 'Shubham Gayke' : 'You'}):
                    </p>
                    <p>{q.messages[q.messages.length - 1].text}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link
                    to={`/lecture/${lectureId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Open Lecture Discussion <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
