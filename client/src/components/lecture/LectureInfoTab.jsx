import { Calendar, Clock, Layers, User, ShieldCheck, Video } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatRecordedDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  // Format in Asia/Kolkata timezone
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
  return `${datePart} · ${timePart}`;
}

export default function LectureInfoTab({ lecture }) {
  if (!lecture) return null;

  return (
    <div className="space-y-6 animate-fade-in text-sm text-slate-700 dark:text-slate-300">
      {/* Title & Metadata Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800 space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
            <Layers className="h-3.5 w-3.5" />
            Batch: {lecture.batch?.name || 'Assigned Batch'}
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
            {lecture.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lecture.title} · {formatRecordedDate(lecture.recordedAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Recorded Date & Time</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {formatRecordedDate(lecture.recordedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Lecture Duration</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {formatDuration(lecture.duration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Lead Trainer</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Shubham Gayke (Mentore Solution)
              </p>
            </div>
          </div>
        </div>

        {/* Available Qualities */}
        {lecture.availableQualities && lecture.availableQualities.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Available Stream Qualities:
            </p>
            <div className="flex flex-wrap gap-2">
              {lecture.availableQualities.map((q) => (
                <span
                  key={q}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security & Intellectual Property Notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
        <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-indigo-950 dark:text-indigo-200">
            Secure Streaming & Copyright Protection
          </p>
          <p className="text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
            This lecture is streamed via AES-128 encrypted HLS. Direct downloads and raw video URL sharing are strictly prevented. A dynamic security watermark with your identity is rendered during playback to prevent unauthorized distribution.
          </p>
        </div>
      </div>
    </div>
  );
}
