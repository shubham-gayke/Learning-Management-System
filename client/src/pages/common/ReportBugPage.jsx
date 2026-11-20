import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { submitBugReport, getBugReports, updateBugReport } from '../../api/bugReport';
import toast from 'react-hot-toast';
import {
  Bug,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Laptop,
  ArrowLeft,
  Loader2,
  Clock,
  Eye,
  Filter,
  Check,
  ChevronDown,
  Volume2,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ui_glitch', label: 'UI / Visual Glitch' },
  { id: 'video_playback', label: 'Video Playback Issue' },
  { id: 'auth_login', label: 'Login / Account / 2FA' },
  { id: 'audio_issue', label: 'Audio / Sound Issue' },
  { id: 'batch_assignment', label: 'Batch / Lecture Access' },
  { id: 'performance', label: 'Lag / Slow Loading' },
  { id: 'other', label: 'Other Issue' },
];

const SEVERITIES = [
  { id: 'low', label: 'Low', desc: 'Cosmetic or minor typo', color: 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30' },
  { id: 'medium', label: 'Medium', desc: 'Feature flawed, workaround exists', color: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30' },
  { id: 'high', label: 'High', desc: 'Major feature broken', color: 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30' },
  { id: 'critical', label: 'Critical', desc: 'System blocking / crash / data issue', color: 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30' },
];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ReportBugPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTrainer = user?.role === 'trainer';

  // Trainer tab toggle
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'list'

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ui_glitch');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [reporterName, setReporterName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
  const [reporterEmail, setReporterEmail] = useState(user ? user.email || '' : '');

  // Screenshot State
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Voice Recording State
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'recording' | 'recorded'
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceUrl, setVoiceUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const durationCounterRef = useRef(0);

  // Telemetry info
  const [deviceInfo, setDeviceInfo] = useState({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  // Trainer Review State
  const [trainerReports, setTrainerReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // 1. Detect device & telemetry on mount
  useEffect(() => {
    try {
      const info = {
        userAgent: navigator.userAgent || 'Unknown',
        platform: navigator.userAgentData?.platform || navigator.platform || 'Unknown',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        language: navigator.language || 'en',
        url: window.location.href,
        pathname: window.location.pathname,
      };
      setDeviceInfo(info);
    } catch {}
  }, []);

  // 2. Global Clipboard Paste Listener for quick screenshots
  useEffect(() => {
    const handlePaste = (e) => {
      // Don't intercept paste if user is typing text in an input or textarea
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageFile(blob);
            toast.success('Screenshot captured from clipboard!');
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Clean up audio streams and object URLs on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (voiceUrl) {
        URL.revokeObjectURL(voiceUrl);
      }
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [voiceUrl, screenshotPreview]);

  // Load reports for trainers when switching to list tab
  useEffect(() => {
    if (isTrainer && activeTab === 'list') {
      fetchTrainerReports();
    }
  }, [isTrainer, activeTab, statusFilter]);

  const fetchTrainerReports = async () => {
    try {
      setLoadingReports(true);
      const res = await getBugReports(statusFilter !== 'all' ? { status: statusFilter } : {});
      setTrainerReports(res.data?.reports || []);
    } catch {
      toast.error('Failed to load bug reports.');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await updateBugReport(reportId, { status: newStatus });
      toast.success(`Report marked as ${newStatus}`);
      fetchTrainerReports();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Image File Handling
  const handleImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Screenshot size should be under 15MB.');
      return;
    }
    setScreenshotFile(file);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Voice recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setVoiceBlob(audioBlob);
        setVoiceUrl(url);
        setRecordingDuration(durationCounterRef.current);
        setRecordingState('recorded');

        // Stop all mic tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250); // Slice every 250ms
      durationCounterRef.current = 0;
      setRecordingDuration(0);
      setRecordingState('recording');

      timerIntervalRef.current = setInterval(() => {
        durationCounterRef.current += 1;
        setRecordingDuration(durationCounterRef.current);

        // Auto stop after 5 minutes
        if (durationCounterRef.current >= 300) {
          stopRecording();
          toast('Maximum recording limit reached (5 min).');
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Could not access microphone. Please check browser microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const discardVoiceNote = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (voiceUrl) {
      URL.revokeObjectURL(voiceUrl);
    }
    setVoiceBlob(null);
    setVoiceUrl(null);
    setRecordingDuration(0);
    durationCounterRef.current = 0;
    setRecordingState('idle');
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a brief title for the bug.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe what happened.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('severity', severity);
      formData.append('description', description.trim());
      formData.append('stepsToReproduce', stepsToReproduce.trim());
      formData.append('reporterName', reporterName.trim());
      formData.append('reporterEmail', reporterEmail.trim());
      formData.append('deviceInfo', JSON.stringify(deviceInfo));

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      if (voiceBlob) {
        formData.append('voiceNote', voiceBlob, `voicenote-${Date.now()}.${voiceBlob.type.includes('mp4') ? 'mp4' : 'webm'}`);
        formData.append('voiceNoteDuration', recordingDuration.toString());
      }

      const res = await submitBugReport(formData);
      setSubmittedReport(res.data?.report || { title, createdAt: new Date() });
      toast.success('Bug report submitted to the Dev Team!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setCategory('ui_glitch');
    setSeverity('medium');
    setDescription('');
    setStepsToReproduce('');
    removeScreenshot();
    discardVoiceNote();
    setSubmittedReport(null);
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedReport) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
        <div className="rounded-3xl border border-emerald-500/30 bg-white/95 p-6 sm:p-10 text-center shadow-2xl backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-900/90">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
            Bug Report Dispatched to Dev Team!
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Thank you for helping us polish Mentore Solution LMS. Our engineering team has received your report with attached telemetry and media.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-left dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Report Reference:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                #{submittedReport._id ? submittedReport._id.slice(-8).toUpperCase() : 'PENDING'}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {submittedReport.title}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-600 dark:text-cyan-300">
                Category: {CATEGORIES.find((c) => c.id === submittedReport.category)?.label || submittedReport.category}
              </span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300 capitalize">
                Severity: {submittedReport.severity}
              </span>
              {screenshotFile && (
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-600 dark:text-indigo-300">
                  📷 Screenshot Attached
                </span>
              )}
              {voiceBlob && (
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-medium text-rose-600 dark:text-rose-300">
                  🎙️ Voice Note ({formatTime(recordingDuration)})
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Submit Another Report
            </button>
            <Link
              to={isTrainer ? '/trainer' : '/dashboard'}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 hover:from-cyan-600 hover:to-blue-700 transition-all cursor-pointer"
            >
              Back to LMS Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-8 animate-fade-in">
      {/* Top Breadcrumb & Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="group mb-2 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Report a Bug or Glitch
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Mentore Solution Dev Team Channel • Real-time Diagnostic Support
              </p>
            </div>
          </div>
        </div>

        {/* Trainer Tab Switcher */}
        {isTrainer && (
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('report')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Submit Bug
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Review Reports
            </button>
          </div>
        )}
      </div>

      {/* TRAINER REPORTS LIST VIEW */}
      {isTrainer && activeTab === 'list' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Filter className="h-4 w-4 text-cyan-500" />
              <span>Status Filter:</span>
              <div className="flex gap-1">
                {['all', 'open', 'investigating', 'resolved'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      statusFilter === s
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={fetchTrainerReports}
              className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400 cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : trainerReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <Bug className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-medium">No bug reports matching the current filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainerReports.map((report) => (
                <div
                  key={report._id}
                  className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{report._id.slice(-6).toUpperCase()}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {report.title}
                        </h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            report.severity === 'critical'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : report.severity === 'high'
                              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                              : report.severity === 'medium'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reported by <span className="font-semibold text-slate-700 dark:text-slate-200">{report.reporterName}</span> ({report.reporterEmail}) • {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={report.status}
                        onChange={(e) => handleUpdateStatus(report._id, e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                    {report.description}
                  </p>

                  {report.stepsToReproduce && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-bold">Steps:</span> {report.stepsToReproduce}
                    </div>
                  )}

                  {/* Media Attachments */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {/* Voice Note player */}
                    {report.voiceNoteFileName && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 dark:bg-rose-950/30">
                        <Volume2 className="h-4 w-4 text-rose-500" />
                        <audio
                          controls
                          src={`/api/bug-reports/${report._id}/attachment/voice`}
                          className="h-7 w-48 sm:w-60"
                        />
                        {report.voiceNoteDuration > 0 && (
                          <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                            {formatTime(report.voiceNoteDuration)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Screenshot Viewer */}
                    {report.screenshotFileName && (
                      <button
                        onClick={() => setPreviewModalImg(`/api/bug-reports/${report._id}/attachment/screenshot`)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-cyan-600 hover:bg-slate-50 dark:border-slate-700 dark:text-cyan-400 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ImageIcon className="h-4 w-4" />
                        View Screenshot
                      </button>
                    )}

                    {/* Device telemetry tag */}
                    {report.deviceInfo && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                        <Laptop className="h-3.5 w-3.5" />
                        {report.deviceInfo.platform || 'Desktop'} • {report.deviceInfo.screenWidth ? `${report.deviceInfo.screenWidth}x${report.deviceInfo.screenHeight}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal for viewing screenshots */}
          {previewModalImg && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setPreviewModalImg(null)}
            >
              <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-2">
                <img
                  src={previewModalImg}
                  alt="Bug attachment preview"
                  className="max-h-[85vh] w-auto rounded-lg object-contain"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* BUG REPORT FORM (STUDENTS & TRAINERS) */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 sm:p-7 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 space-y-6">
            {/* User identification bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Reporting as: <strong className="text-slate-900 dark:text-white">{reporterName || 'Guest User'}</strong>
                </span>
                {reporterEmail && <span className="text-slate-400">({reporterEmail})</span>}
                {user?.role && (
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    {user.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Laptop className="h-3.5 w-3.5" />
                <span>Auto-diagnostics active</span>
              </div>
            </div>

            {/* 1. Title */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Issue Summary / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Video player paused unexpectedly on AWS Lecture 3"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                required
              />
            </div>

            {/* 2. Category & Severity in responsive 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITIES.map((s) => {
                    const isSelected = severity === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSeverity(s.id)}
                        className={`rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${s.color} border-2 shadow-sm scale-[1.02]`
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                        }`}
                        title={s.desc}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Description */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Description of What Happened <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Explain what you were doing, what error or behavior occurred, and what you expected to see..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 resize-y"
                required
              />
            </div>

            {/* 4. Steps to Reproduce (Optional) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Steps to Reproduce <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                rows={2}
                placeholder="1. Go to AWS lectures&#10;2. Click on lecture 3&#10;3. Click play button..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 resize-y"
              />
            </div>

            {/* 5. MULTIMEDIA ATTACHMENTS (Voice Recording & Screenshot) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
              {/* Option A: Voice Recording */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      <Mic className="h-4 w-4 text-rose-500" />
                      Record Voice Note
                    </span>
                    <span className="text-[11px] text-slate-400">Explain by speaking</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Record your microphone to speak freely about what went wrong.
                  </p>
                </div>

                {/* Voice recording controls based on state */}
                <div className="mt-2">
                  {recordingState === 'idle' && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="group flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition-all cursor-pointer"
                    >
                      <Mic className="h-4 w-4 transition-transform group-hover:scale-110" />
                      Start Voice Recording
                    </button>
                  )}

                  {recordingState === 'recording' && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-500 bg-rose-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          Recording Live
                        </span>
                        <span className="font-mono text-sm font-black text-rose-700 dark:text-rose-300">
                          {formatTime(recordingDuration)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-1.5 text-xs font-bold text-white shadow transition-all cursor-pointer"
                      >
                        <Square className="h-3.5 w-3.5 fill-white" />
                        Stop & Attach
                      </button>
                    </div>
                  )}

                  {recordingState === 'recorded' && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Voice Note Attached ({formatTime(recordingDuration)})
                        </span>
                        <button
                          type="button"
                          onClick={discardVoiceNote}
                          className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Discard
                        </button>
                      </div>
                      {voiceUrl && (
                        <audio controls src={voiceUrl} className="h-8 w-full" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Option B: Screenshot Upload with Drag & Drop & Clipboard Paste */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      <ImageIcon className="h-4 w-4 text-cyan-500" />
                      Attach Screenshot
                    </span>
                    <span className="text-[11px] text-slate-400">Or press Ctrl + V</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Drag an image, browse your device, or simply paste from clipboard.
                  </p>
                </div>

                {screenshotPreview ? (
                  <div className="relative rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="h-28 w-full rounded-lg object-contain bg-slate-100 dark:bg-slate-950"
                    />
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate max-w-[200px]">
                        {screenshotFile?.name || 'pasted-screenshot.png'}
                      </span>
                      <button
                        type="button"
                        onClick={removeScreenshot}
                        className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-300 hover:border-cyan-500 dark:border-slate-700 dark:hover:border-cyan-400'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFile(e.target.files?.[0])}
                    />
                    <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Click to browse or drop image here
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Tip: Take a screenshot (Win+Shift+S) and press Ctrl+V
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostics Auto-Detection Preview */}
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                <span>
                  Auto-detected environment: <strong>{deviceInfo.platform || 'Desktop'}</strong> • Viewport:{' '}
                  {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight} • URL: {deviceInfo.pathname || '/'}
                </span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Will be sent automatically
              </span>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4" />
                    Submit Bug Report to Dev Team
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
