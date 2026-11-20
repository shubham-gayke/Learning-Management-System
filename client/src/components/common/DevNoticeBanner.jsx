import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bug, ArrowRight, X, AlertTriangle } from 'lucide-react';

export default function DevNoticeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('mentore_dev_banner_dismissed');
      if (isDismissed === 'true') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('mentore_dev_banner_dismissed', 'true');
    } catch {}
  };

  if (dismissed) return null;

  const targetReportUrl = user?.role === 'trainer' ? '/trainer/report-bug' : '/report-bug';

  return (
    <div className="relative isolate z-40 bg-gradient-to-r from-amber-500/15 via-cyan-500/15 to-indigo-500/15 border-b border-amber-500/30 dark:border-amber-400/20 backdrop-blur-md px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Left message with badges and icons */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 tracking-wide uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Dev Phase
          </span>
          <span className="inline-flex sm:hidden text-amber-500 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>

          <p className="truncate sm:whitespace-normal font-medium text-slate-700 dark:text-slate-200">
            <span>The web application is still in development phase, so if any bug or glitches are found, please report to the Dev Team.</span>
          </p>
        </div>

        {/* Right CTA button & close */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={targetReportUrl}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-2.5 py-1 text-xs shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
          >
            <Bug className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-12" />
            <span className="whitespace-nowrap">Report Bug</span>
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss development notice"
            className="rounded-md p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
