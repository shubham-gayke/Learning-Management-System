import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getLectures } from '../../api/lectures';
import { apiUrl } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Video,
  Search,
  Calendar,
  PlayCircle,
  Sparkles,
  ArrowUpDown,
  ArrowLeft,
  MessageSquare,
  Briefcase,
  Cloud,
  Terminal,
  Server,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatRecordedDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
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

function isNewLecture(recordedAt) {
  if (!recordedAt) return false;
  const diffHours = (Date.now() - new Date(recordedAt).getTime()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

const CATEGORIES = [
  {
    slug: 'linux',
    id: 'Linux Lectures',
    name: 'Linux Lectures',
    shortName: 'Linux',
    description: 'Linux OS, bash shell scripting, system admin & permissions',
    icon: Terminal,
    badgeClasses:
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  {
    slug: 'aws',
    id: 'AWS Lectures',
    name: 'AWS Lectures',
    shortName: 'AWS',
    description: 'Cloud computing, EC2, S3, IAM, VPC & Cloud Architecture',
    icon: Cloud,
    badgeClasses:
      'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  },
  {
    slug: 'devops',
    id: 'DevOps Lectures',
    name: 'DevOps Lectures',
    shortName: 'DevOps',
    description: 'CI/CD Pipelines, Docker, Kubernetes & Infrastructure as Code',
    icon: Server,
    badgeClasses:
      'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  },
  {
    slug: 'ai',
    id: 'AI Lectures',
    name: 'AI Lectures',
    shortName: 'AI',
    description: 'Artificial Intelligence, Machine Learning & Modern AI Tools',
    icon: Sparkles,
    badgeClasses:
      'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/60',
  },
  {
    slug: 'communication',
    id: 'Communication Skill Lectures',
    name: 'Communication Skill Lectures',
    shortName: 'Communication Skills',
    description: 'Soft skills, corporate communication & professional speaking',
    icon: MessageSquare,
    badgeClasses:
      'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/60',
  },
  {
    slug: 'job-portal',
    id: 'Job Portal Optimization + Resume Building Session',
    name: 'Job Portal & Resume',
    shortName: 'Job Portal & Resume',
    description: 'LinkedIn, Naukri, ATS resume formatting & interview prep',
    icon: Briefcase,
    badgeClasses:
      'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60',
  },
];

export default function CategoryLecturesPage() {
  const { category: categorySlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Resolve category from slug
  const categoryObj = useMemo(
    () => CATEGORIES.find((c) => c.slug === categorySlug),
    [categorySlug]
  );

  // If invalid slug, redirect back to dashboard
  useEffect(() => {
    if (!categoryObj) {
      navigate('/dashboard', { replace: true });
    }
  }, [categoryObj, navigate]);

  useEffect(() => {
    async function loadLectures() {
      try {
        setLoading(true);
        const res = await getLectures();
        setLectures(res.data?.lectures || []);
      } catch {
        toast.error('Failed to load lectures');
      } finally {
        setLoading(false);
      }
    }
    loadLectures();
  }, []);

  const filteredLectures = useMemo(() => {
    if (!categoryObj) return [];
    return lectures
      .filter((l) => {
        const cat = l.category || 'Linux Lectures';
        if (cat !== categoryObj.id) return false;
        if (search.trim()) {
          return l.title.toLowerCase().includes(search.toLowerCase().trim());
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.recordedAt || a.createdAt).getTime();
        const timeB = new Date(b.recordedAt || b.createdAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [lectures, categoryObj, search, sortOrder]);

  if (!categoryObj) return null;

  const Icon = categoryObj.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with Back Button */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm shadow-cyan-500/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                {categoryObj.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                {categoryObj.description}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
            {categoryObj.description}
          </p>
        </div>

        {/* Lecture count badge */}
        <div className="flex-shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-50/60 px-3 py-1.5 text-center dark:border-cyan-500/15 dark:bg-cyan-950/40">
          <span className="text-lg font-black text-cyan-700 dark:text-cyan-300">
            {loading ? '—' : filteredLectures.length}
          </span>
          <p className="text-[10px] font-semibold text-cyan-600/80 dark:text-cyan-400/70">
            Sessions
          </p>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search in ${categoryObj.shortName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Lectures Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filteredLectures.length === 0 ? (
        <EmptyState
          icon={Video}
          title={
            search
              ? 'No matching lectures found'
              : `No sessions in ${categoryObj.shortName} yet`
          }
          description={
            search
              ? `No sessions matching "${search}" in this track.`
              : `Trainer will upload ${categoryObj.shortName} videos soon. Check back shortly!`
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredLectures.map((lec) => {
            const isNew = isNewLecture(lec.recordedAt);
            const recordedLabel = formatRecordedDate(lec.recordedAt);

            return (
              <Link
                key={lec._id}
                to={`/lecture/${lec._id}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-cyan-500/40 dark:hover:shadow-cyan-500/20"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={apiUrl(`/api/stream/${lec._id}/thumbnail`)}
                    alt={lec.title}
                    className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-95"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10" />

                  {/* Play icon */}
                  <div className="z-20 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-600/90 text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:shadow-[0_0_24px_rgba(6,182,212,0.6)]">
                    <PlayCircle className="h-8 w-8" />
                  </div>

                  {/* New badge */}
                  {isNew && (
                    <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg shadow-cyan-500/30">
                      <Sparkles className="h-3 w-3" /> NEW
                    </span>
                  )}

                  {/* Duration badge */}
                  {lec.duration && (
                    <span className="absolute bottom-3 right-3 z-20 rounded-md bg-black/85 px-2 py-0.5 text-[11px] font-mono font-medium text-white backdrop-blur-md shadow-sm">
                      {formatDuration(lec.duration)}
                    </span>
                  )}
                </div>

                {/* Card content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category badge */}
                    <div className="mb-2">
                      <span
                        className={`inline-block border px-2 py-0.5 rounded-md text-[11px] font-bold ${categoryObj.badgeClasses}`}
                      >
                        {categoryObj.shortName}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 group-hover:text-cyan-600 transition-colors duration-200 dark:text-white dark:group-hover:text-cyan-400 line-clamp-2">
                      {lec.title}
                    </h3>

                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                      <span>{recordedLabel}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      Watch Lecture &rarr;
                    </span>
                    <span className="text-slate-400 font-medium">
                      {lec.createdBy
                        ? `${lec.createdBy.firstName} ${lec.createdBy.lastName}`
                        : 'Mentore Solution'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
