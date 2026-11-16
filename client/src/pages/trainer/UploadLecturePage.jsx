import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBatches } from '../../api/batches';
import { uploadLecture, retryLecture } from '../../api/lectures';
import { useSocket } from '../../contexts/SocketContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  Upload,
  Layers,
  Video,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Briefcase,
  Cloud,
  Terminal,
  Server,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatCurrentKolkataTime() {
  const date = new Date();
  const datePart = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart}, ${timePart}`;
}

const CATEGORIES = [
  {
    id: 'Linux Lectures',
    name: 'Linux Lectures',
    description: 'Linux OS, bash shell scripting, system admin & permissions',
    icon: Terminal,
  },
  {
    id: 'AWS Lectures',
    name: 'AWS Lectures',
    description: 'Cloud computing, EC2, S3, IAM, VPC & architecture',
    icon: Cloud,
  },
  {
    id: 'DevOps Lectures',
    name: 'DevOps Lectures',
    description: 'CI/CD pipelines, Docker, Kubernetes, Git & automation',
    icon: Server,
  },
  {
    id: 'AI Lectures',
    name: 'AI Lectures',
    description: 'Artificial Intelligence, Machine Learning & Modern Tools',
    icon: Sparkles,
  },
  {
    id: 'Communication Skill Lectures',
    name: 'Communication Skill Lectures',
    description: 'Soft skills, presentation, corporate communication',
    icon: MessageSquare,
  },
  {
    id: 'Job Portal Optimization + Resume Building Session',
    name: 'Job Portal & Resume',
    fullName: 'Job Portal Optimization + Resume Building Session',
    description: 'LinkedIn, Naukri, resume building & ATS prep',
    icon: Briefcase,
  },
];

export default function UploadLecturePage() {
  const navigate = useNavigate();
  const socket = useSocket();

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Form states
  const [action, setAction] = useState('Upload Video');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Linux Lectures');
  const [videoName, setVideoName] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Read-only server timestamp display
  const [kolkataTimestamp, setKolkataTimestamp] = useState(formatCurrentKolkataTime());

  // Submitting / Processing state
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState(null); // { lectureId, status, progressPercent, errorMessage }

  useEffect(() => {
    // Update live timestamp display every minute
    const interval = setInterval(() => {
      setKolkataTimestamp(formatCurrentKolkataTime());
    }, 60000);

    getBatches()
      .then((res) => {
        const list = res.data?.batches || [];
        setBatches(list);
        if (list.length > 0) setSelectedBatch(list[0]._id);
      })
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoadingBatches(false));

    return () => clearInterval(interval);
  }, []);

  // Listen to live socket transcoding events
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (activeJob && data.lectureId === activeJob.lectureId) {
        setActiveJob((prev) => ({
          ...prev,
          status: data.status,
          progressPercent: data.progressPercent ?? prev.progressPercent,
          errorMessage: data.errorMessage ?? prev.errorMessage,
        }));

        if (data.status === 'ready') {
          toast.success('Lecture transcoding complete and ready!');
        } else if (data.status === 'failed') {
          toast.error(`Processing failed: ${data.errorMessage}`);
        }
      }
    };

    socket.on('lecture_progress', handleProgress);
    return () => socket.off('lecture_progress', handleProgress);
  }, [socket, activeJob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) {
      toast.error('Please select a batch');
      return;
    }
    if (!videoName.trim()) {
      toast.error('Video name is required');
      return;
    }
    if (!driveLink.trim()) {
      toast.error('Google Drive link is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await uploadLecture({
        batchId: selectedBatch,
        category: selectedCategory,
        title: videoName.trim(),
        driveLink: driveLink.trim(),
        isPublished,
      });

      const lecture = res.data?.lecture;
      toast.success('Lecture published and ready to watch!');

      setActiveJob({
        lectureId: lecture._id,
        title: lecture.title,
        status: lecture.status || 'ready',
        progressPercent: 100,
        errorMessage: null,
      });

      // Clear form inputs
      setVideoName('');
      setDriveLink('');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to upload lecture. Check Drive link and permissions.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!activeJob?.lectureId) return;
    try {
      await retryLecture(activeJob.lectureId);
      setActiveJob((prev) => ({ ...prev, status: 'queued', progressPercent: 0, errorMessage: null }));
      toast.success('Retrying video processing...');
    } catch {
      toast.error('Failed to retry');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Upload New Lecture
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Transcode OBS recordings from Google Drive into secure, multi-quality AES-128 encrypted HLS streams.
        </p>
      </div>

      {/* Step-by-Step Form in EXACT required order */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* STEP 1: Choose Action */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Step 1: Choose Action
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAction('Upload Video')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold border-2 transition ${
                  action === 'Upload Video'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <Video className="h-4 w-4" />
                <span>Upload Video</span>
              </button>
            </div>
          </div>

          {/* STEP 2: Select Batch */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Step 2: Select Batch
            </label>
            {loadingBatches ? (
              <div className="h-11 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-700" />
            ) : (
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} — {b.description || 'Active Batch'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* STEP 3: Select Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Step 3: Select Lecture Track / Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === (cat.fullName || cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.fullName || cat.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-md shadow-indigo-500/10 dark:border-indigo-500 dark:bg-indigo-950/50'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {cat.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Video Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Step 4: Video Name
            </label>
            <Input
              placeholder="e.g. Day 14: React Hooks & Custom Hook Architecture"
              value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
              required
            />
          </div>

          {/* STEP 5: Google Drive link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Step 5: Google Drive Link
            </label>
            <Input
              icon={LinkIcon}
              placeholder="https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view?usp=sharing"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Ensure the file's Google Drive folder has been shared with your Google Service Account email.
            </p>
          </div>

          {/* AUTOMATIC DATE & TIME (Server timestamp in Asia/Kolkata) */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>Will be saved as:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {kolkataTimestamp}
              </strong>
              <span className="text-[11px] text-slate-400">(Asia/Kolkata)</span>
            </div>
          </div>

          {/* Published Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="publishNow"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="publishNow" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Publish immediately (visible to enrolled batch students)
            </label>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            type="submit"
            icon={Upload}
            isLoading={submitting}
            className="w-full"
          >
            Save & Publish Lecture
          </Button>
        </form>
      </div>

      {/* Live Processing Status Box */}
      {activeJob && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Transcoding Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activeJob.title}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                activeJob.status === 'ready'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : activeJob.status === 'failed'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 animate-pulse'
              }`}
            >
              {activeJob.status}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-700">
              <div
                className={`h-full transition-all duration-500 ${
                  activeJob.status === 'failed'
                    ? 'bg-rose-500'
                    : activeJob.status === 'ready'
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${activeJob.progressPercent || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>Progress: {activeJob.progressPercent || 0}%</span>
              <span>{activeJob.status === 'ready' ? 'Complete' : 'Processing on background queue'}</span>
            </div>
          </div>

          {/* Failure message & retry */}
          {activeJob.status === 'failed' && (
            <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/40 space-y-2">
              <div className="flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{activeJob.errorMessage || 'Transcoding error. Please verify Google Drive access.'}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={RefreshCw}
                onClick={handleRetry}
                className="text-xs"
              >
                Retry Processing
              </Button>
            </div>
          )}

          {/* Ready action */}
          {activeJob.status === 'ready' && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/trainer/lectures')}
              >
                View in Manage Lectures
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/lecture/${activeJob.lectureId}`)}
              >
                Watch Lecture Player
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
