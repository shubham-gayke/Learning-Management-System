import { useState, useEffect, useCallback, useMemo } from 'react';
import { getJobs } from '../../api/jobs';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Search,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Coins,
  GraduationCap,
  Share2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobPortalPage() {
  const { user } = useAuth();
  const socket = useSocket();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);

  const batchName =
    typeof user?.batch === 'object'
      ? user.batch?.name
      : user?.batch || 'Your Batch';

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJobs();
      setJobs(res.data?.jobs || []);
    } catch (err) {
      toast.error('Failed to load job opportunities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time synchronization: refresh when trainer publishes new job
  useEffect(() => {
    if (!socket) return;
    const handleNewJob = (newJob) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-cyan-400 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">New Job Posted!</p>
            <p className="text-slate-300 line-clamp-1">{newJob.title} at {newJob.company}</p>
          </div>
        </div>
      ), { duration: 6000, style: { background: '#0f172a', color: '#fff', border: '1px solid #06b6d4' } });
      fetchJobs();
    };

    socket.on('new_job_posted', handleNewJob);
    return () => {
      socket.off('new_job_posted', handleNewJob);
    };
  }, [socket, fetchJobs]);

  // Client-side search and filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.location && job.location.toLowerCase().includes(q)) ||
        (job.skills && job.skills.some((s) => s.toLowerCase().includes(q))) ||
        (job.description && job.description.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || job.jobType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [jobs, search, typeFilter]);

  const handleApply = (applyUrl, jobTitle, company) => {
    if (!applyUrl) {
      toast.error('Application link not provided for this opening.');
      return;
    }
    toast.success(`Redirecting to ${company} application link...`);
    window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = (job) => {
    if (navigator.share) {
      navigator.share({
        title: `${job.title} at ${job.company}`,
        text: `Check out this opening for ${job.title} at ${job.company} on Mentore Solution Job Portal!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(job.applyUrl);
      toast.success('Application link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/30">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md shadow-sm">
              <Briefcase className="h-3.5 w-3.5 text-cyan-300" />
              <span>Mentore Solution Careers & Placements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mentore Solution Job Portal
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 leading-relaxed">
              Curated tech opportunities, direct recruitment drives, and verified application links updated directly by Mentore Solution trainers and admin.
            </p>
          </div>

          {/* Quick Counter Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-950/50 p-4 backdrop-blur-md self-start md:self-auto shadow-inner">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-cyan-100">{jobs.length}</p>
              <p className="text-xs font-medium text-cyan-300">Active Openings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, skill (e.g. Linux, AWS, Docker), or location..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Job Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'Full-time', 'Internship', 'Contract'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === type
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              {type === 'all' ? 'All Roles' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 mb-4">
            <Briefcase className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {search || typeFilter !== 'all'
              ? 'No matching job opportunities found'
              : 'No Active Job Openings Right Now'}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search || typeFilter !== 'all'
              ? 'Try modifying your search keywords or resetting the filter options.'
              : 'Mentore Solution placement coordinators regularly update fresh hiring drives, off-campus links, and partner openings. Please check back soon!'}
          </p>
          {(search || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
              }}
              className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700 transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job._id || job.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:border-cyan-400/80 hover:shadow-xl hover:shadow-cyan-500/10 dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-cyan-500/80 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Header: Company & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-black text-lg shadow-md shadow-cyan-600/20">
                      {job.company ? job.company.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{job.company}</span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                </div>

                {/* Badges Matrix */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {job.location && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <MapPin className="h-3 w-3 text-cyan-500" />
                      {job.location}
                    </span>
                  )}
                  {job.jobType && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Briefcase className="h-3 w-3 text-cyan-500" />
                      {job.jobType}
                    </span>
                  )}
                  {job.experience && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <GraduationCap className="h-3 w-3 text-cyan-500" />
                      {job.experience}
                    </span>
                  )}
                  {job.salary && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {job.salary}
                    </span>
                  )}
                  {job.targetBatch && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-1 font-medium text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                      <Layers className="h-3 w-3 text-purple-400" />
                      Batch: {job.targetBatch}
                    </span>
                  )}
                </div>

                {/* Skills tags */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-cyan-500/20 bg-cyan-50/50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Job Description Preview */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                    {job.description}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {job.createdAt
                      ? new Date(job.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recently Added'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShare(job)}
                    title="Share opening or copy link"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleApply(job.applyUrl, job.title, job.company)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/25 hover:from-cyan-500 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Apply for Job</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
