import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLecture, getProgress, saveProgress } from '../../api/lectures';
import { useAuth } from '../../contexts/AuthContext';
import CustomVideoPlayer from '../../components/player/CustomVideoPlayer';
import NotesTab from '../../components/lecture/NotesTab';
import AskTrainerTab from '../../components/lecture/AskTrainerTab';
import LectureInfoTab from '../../components/lecture/LectureInfoTab';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  MessageSquare,
  Info,
  ChevronLeft,
  AlertCircle,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LecturePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerRef = useRef(null);

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialProgress, setInitialProgress] = useState(0);

  // Active Tab
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'ask' | 'info'

  // Load Lecture and Saved Progress
  useEffect(() => {
    async function fetchLectureData() {
      try {
        setLoading(true);
        setError(null);

        const [lecRes, progRes] = await Promise.allSettled([
          getLecture(id),
          getProgress(id),
        ]);

        if (lecRes.status === 'fulfilled') {
          setLecture(lecRes.value.data?.lecture);
        } else {
          setError(
            lecRes.reason?.response?.data?.message || 'Failed to load lecture.'
          );
        }

        if (progRes.status === 'fulfilled') {
          const pos = progRes.value.data?.lastPosition || 0;
          setInitialProgress(pos);
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchLectureData();
  }, [id]);

  const handleProgressUpdate = async (seconds, completed) => {
    try {
      await saveProgress(id, { lastPosition: seconds, completed });
    } catch {
      // Background auto-save, non-blocking
    }
  };

  const handleSeekToTime = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
      // Smooth scroll back to top of video on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getCurrentVideoTime = () => {
    if (playerRef.current) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <EmptyState
          icon={AlertCircle}
          title="Lecture Not Found or Restricted"
          description={error || 'You might not have permission to view this lecture.'}
          actionText="Back to Lectures"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const streamSrc = `/api/stream/${lecture._id}/video`;

  return (
    <div className="space-y-6">
      {/* Back button link */}
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400"
        >
          <ChevronLeft className="h-4 w-4" /> Back to All Lectures
        </Link>
      </div>

      {/* Video Container (Mobile Sticky at top: sticky top-14 z-30 on mobile, standard on md+) */}
      <div className="sticky top-14 md:static z-20 -mx-4 sm:mx-0 bg-black sm:rounded-2xl overflow-hidden shadow-2xl">
        <CustomVideoPlayer
          ref={playerRef}
          src={streamSrc}
          user={user}
          initialProgress={initialProgress}
          onProgressUpdate={handleProgressUpdate}
          title={lecture.title}
        />
      </div>

      {/* Lecture Title Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
            Batch {lecture.batch?.name}
          </span>
          <span
            className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
              lecture.category === 'Linux Lectures'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                : lecture.category === 'AWS Lectures'
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400'
                : lecture.category === 'DevOps Lectures'
                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400'
                : lecture.category === 'AI Lectures'
                ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300'
                : lecture.category === 'Communication Skill Lectures'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300'
                : lecture.category === 'Job Portal Optimization + Resume Building Session'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {lecture.category || 'Linux Lectures'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
          {lecture.title}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Instructor: {lecture.createdBy ? `${lecture.createdBy.firstName} ${lecture.createdBy.lastName}` : 'Mentore Solution'}
        </p>
      </div>

      {/* Tabs navigation under video */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2 sm:gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Notes & Resources</span>
          </button>

          <button
            onClick={() => setActiveTab('ask')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'ask'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Ask Trainer</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Info className="h-4 w-4" />
            <span>Lecture Info</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'notes' && (
          <NotesTab lectureId={lecture._id} isTrainer={user?.role === 'trainer'} />
        )}

        {activeTab === 'ask' && (
          <AskTrainerTab
            lectureId={lecture._id}
            user={user}
            getCurrentVideoTime={getCurrentVideoTime}
            onSeekToTime={handleSeekToTime}
          />
        )}

        {activeTab === 'info' && <LectureInfoTab lecture={lecture} />}
      </div>
    </div>
  );
}
