import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLectures } from '../../api/lectures';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Video,
  Search,
  Calendar,
  PlayCircle,
  Layers,
  Sparkles,
  ArrowUpDown,
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
  return diffHours <= 48; // Within 48 hours
}

const CATEGORIES = [
  {
    id: 'Linux Lectures',
    name: 'Linux Lectures',
    shortName: 'Linux',
    description: 'Linux OS, bash shell scripting, system admin & permissions',
    icon: Terminal,
  },
  {
    id: 'AWS Lectures',
    name: 'AWS Lectures',
    shortName: 'AWS Lectures',
    description: 'Cloud computing, EC2, S3, IAM, VPC & Cloud Architecture',
    icon: Cloud,
  },
  {
    id: 'DevOps Lectures',
    name: 'DevOps Lectures',
    shortName: 'DevOps Lectures',
    description: 'CI/CD Pipelines, Docker, Kubernetes & Infrastructure as Code',
    icon: Server,
  },
  {
    id: 'AI Lectures',
    name: 'AI Lectures',
    shortName: 'AI Lectures',
    description: 'Artificial Intelligence, Machine Learning & Modern AI Tools',
    icon: Sparkles,
  },
  {
    id: 'Communication Skill Lectures',
    name: 'Communication Skill Lectures',
    shortName: 'Communication Skills',
    description: 'Soft skills, corporate communication & professional speaking',
    icon: MessageSquare,
  },
  {
    id: 'Job Portal Optimization + Resume Building Session',
    name: 'Job Portal & Resume',
    fullName: 'Job Portal Optimization + Resume Building Session',
    description: 'LinkedIn, Naukri, ATS resume formatting & interview prep',
    icon: Briefcase,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active module: defaults to 'Linux Lectures'
  const [activeCategory, setActiveCategory] = useState('Linux Lectures');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

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

  const batchName =
    typeof user?.batch === 'object'
      ? user.batch?.name
      : user?.batch || 'Your Batch';

  // Count per category
  const countByCategory = {
    'Linux Lectures': lectures.filter((l) => (l.category || 'Linux Lectures') === 'Linux Lectures').length,
    'AWS Lectures': lectures.filter((l) => l.category === 'AWS Lectures').length,
    'DevOps Lectures': lectures.filter((l) => l.category === 'DevOps Lectures').length,
    'AI Lectures': lectures.filter((l) => l.category === 'AI Lectures').length,
    'Communication Skill Lectures': lectures.filter(
      (l) => l.category === 'Communication Skill Lectures'
    ).length,
    'Job Portal Optimization + Resume Building Session': lectures.filter(
      (l) => l.category === 'Job Portal Optimization + Resume Building Session'
    ).length,
  };

  // Client-side category filter, search, and sort
  const filteredLectures = lectures
    .filter((l) => {
      // Category filter (Exact match)
      const cat = l.category || 'Linux Lectures';
      if (cat !== activeCategory) return false;

      // Text search
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

  const getCategoryBadge = (category) => {
    if (category === 'Linux Lectures') {
      return {
        label: 'Linux Lectures',
        classes:
          'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
      };
    }
    if (category === 'AWS Lectures') {
      return {
        label: 'AWS Lectures',
        classes:
          'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
      };
    }
    if (category === 'DevOps Lectures') {
      return {
        label: 'DevOps Lectures',
        classes:
          'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
      };
    }
    if (category === 'AI Lectures') {
      return {
        label: 'AI Lectures',
        classes:
          'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/60',
      };
    }
    if (category === 'Communication Skill Lectures') {
      return {
        label: 'Communication Skills',
        classes:
          'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/60',
      };
    }
    if (category === 'Job Portal Optimization + Resume Building Session') {
      return {
        label: 'Job Portal & Resume',
        classes:
          'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60',
      };
    }
    return {
      label: 'Linux Lectures',
      classes:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
  };

  const activeCategoryObj =
    CATEGORIES.find((c) => (c.fullName || c.id) === activeCategory) || CATEGORIES[0];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md shadow-sm">
              <Layers className="h-3.5 w-3.5 text-cyan-300" />
              <span>Enrolled in Batch {batchName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hello, {user?.firstName || 'Student'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-xl">
              Welcome to Mentore Solution LMS. Choose a lecture module below to start learning.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/40 p-4 text-left sm:text-right backdrop-blur-sm shadow-inner">
            <span className="text-3xl font-black text-cyan-100">
              {lectures.length}
            </span>
            <p className="text-xs font-medium text-cyan-300">Total Lectures</p>
          </div>
        </div>
      </div>

      {/* Course Modules / Track Selector Cards (6 Categories) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Course Module
          </h2>
          <span className="text-xs font-medium text-slate-400">
            6 Tracks Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const fullCatId = cat.fullName || cat.id;
            const isSelected = activeCategory === fullCatId;
            const count = countByCategory[fullCatId] ?? 0;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(fullCatId)}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50/90 shadow-lg shadow-cyan-500/15 dark:border-cyan-400 dark:bg-cyan-950/50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        isSelected
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold">
                  <span
                    className={
                      isSelected
                        ? 'text-cyan-700 dark:text-cyan-300 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }
                  >
                    {isSelected ? 'Active Track' : 'View Sessions'}
                  </span>
                  <span
                    className={
                      isSelected
                        ? 'text-cyan-700 dark:text-cyan-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }
                  >
                    &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search in ${activeCategoryObj.shortName}...`}
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
              : `No sessions in ${activeCategoryObj.shortName} yet`
          }
          description={
            search
              ? `No sessions matching "${search}" in this track.`
              : `Trainer Shubham Gayke will upload ${activeCategoryObj.shortName} videos soon. Check back shortly!`
          }
        />
      ) : (
        <div>
          {/* Active category heading indicator */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{activeCategoryObj.name}</span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-normal">
                ({filteredLectures.length} {filteredLectures.length === 1 ? 'session' : 'sessions'})
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lec) => {
              const isNew = isNewLecture(lec.recordedAt);
              const recordedLabel = formatRecordedDate(lec.recordedAt);
              const catBadge = getCategoryBadge(lec.category);

              return (
                <Link
                  key={lec._id}
                  to={`/lecture/${lec._id}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-cyan-500/40 dark:hover:shadow-cyan-500/20"
                >
                  {/* Thumbnail Header Area */}
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      src={`/api/stream/${lec._id}/thumbnail`}
                      alt={lec.title}
                      className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-95"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10" />

                    {/* Play Overlay Icon on hover */}
                    <div className="z-20 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-600/90 text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:shadow-[0_0_24px_rgba(6,182,212,0.6)]">
                      <PlayCircle className="h-8 w-8" />
                    </div>

                    {/* New Badge */}
                    {isNew && (
                      <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg shadow-cyan-500/30">
                        <Sparkles className="h-3 w-3" /> NEW
                      </span>
                    )}

                    {/* Duration Badge */}
                    {lec.duration && (
                      <span className="absolute bottom-3 right-3 z-20 rounded-md bg-black/85 px-2 py-0.5 text-[11px] font-mono font-medium text-white backdrop-blur-md shadow-sm">
                        {formatDuration(lec.duration)}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category track pill */}
                      <div className="mb-2">
                        <span
                          className={`inline-block border px-2 py-0.5 rounded-md text-[11px] font-bold ${catBadge.classes}`}
                        >
                          {catBadge.label}
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
                      <span className="text-slate-400 font-medium">Shubham Gayke</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
