import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLectures } from '../../api/lectures';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/common/Skeleton';
import {
  Layers,
  MessageSquare,
  Briefcase,
  Cloud,
  Terminal,
  Server,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  {
    id: 'Linux Lectures',
    slug: 'linux',
    name: 'Linux Lectures',
    shortName: 'Linux',
    description: 'Linux OS, bash shell scripting, system admin & permissions',
    icon: Terminal,
  },
  {
    id: 'AWS Lectures',
    slug: 'aws',
    name: 'AWS Lectures',
    shortName: 'AWS Lectures',
    description: 'Cloud computing, EC2, S3, IAM, VPC & Cloud Architecture',
    icon: Cloud,
  },
  {
    id: 'DevOps Lectures',
    slug: 'devops',
    name: 'DevOps Lectures',
    shortName: 'DevOps Lectures',
    description: 'CI/CD Pipelines, Docker, Kubernetes & Infrastructure as Code',
    icon: Server,
  },
  {
    id: 'AI Lectures',
    slug: 'ai',
    name: 'AI Lectures',
    shortName: 'AI Lectures',
    description: 'Artificial Intelligence, Machine Learning & Modern AI Tools',
    icon: Sparkles,
  },
  {
    id: 'Communication Skill Lectures',
    slug: 'communication',
    name: 'Communication Skill Lectures',
    shortName: 'Communication Skills',
    description: 'Soft skills, corporate communication & professional speaking',
    icon: MessageSquare,
  },
  {
    id: 'Job Portal Optimization + Resume Building Session',
    slug: 'job-portal',
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

      {/* Mentore Solution Job Portal Featured Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-5 sm:p-6 shadow-xl transition-all hover:border-amber-400/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Mentore Solution Job Portal
                </h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  NEW
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300 max-w-xl">
                Explore active hiring drives, company links & apply directly. Verified opportunities curated by the Mentore Solution team.
              </p>
            </div>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
          >
            <span>Explore Jobs & Apply</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
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

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Skeleton key={n} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const fullCatId = cat.fullName || cat.id;
              const count = countByCategory[fullCatId] ?? 0;

              return (
                <Link
                  key={cat.id}
                  to={`/lectures/${cat.slug}`}
                  className="relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer border-slate-200 bg-white hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/15 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/50 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors bg-slate-100 text-slate-600 group-hover:bg-cyan-600 group-hover:text-white group-hover:shadow-sm dark:bg-slate-700 dark:text-slate-300">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 group-hover:bg-cyan-600 group-hover:text-white dark:bg-slate-700 dark:text-slate-300">
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
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                      View Sessions
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
