import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Layers,
  Upload,
  Video,
  Users,
  ShieldCheck,
  MessageSquare,
  Menu,
  X,
  ChevronLeft,
  Bug,
  GraduationCap,
  Briefcase,
} from 'lucide-react';

const sidebarLinks = [
  { to: '/trainer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trainer/batches', icon: Layers, label: 'Batches' },
  { to: '/trainer/upload', icon: Upload, label: 'Upload Lecture' },
  { to: '/trainer/lectures', icon: Video, label: 'Manage Lectures' },
  { to: '/trainer/students', icon: Users, label: 'Students' },
  { to: '/trainer/allowed-emails', icon: ShieldCheck, label: 'Allowed Emails' },
  { to: '/trainer/jobs', icon: Briefcase, label: 'Job Portal' },
  { to: '/trainer/questions', icon: MessageSquare, label: 'Q&A Inbox' },
  { to: '/trainer/report-bug', icon: Bug, label: 'Bug Reports' },
];

export default function TrainerLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 pb-16 md:pb-0">
      {/* Top Navbar with mobile sidebar toggle */}
      <Navbar onToggleSidebar={() => setMobileOpen(true)} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 md:block',
            collapsed ? 'w-[72px]' : 'w-64'
          )}
        >
          <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col p-3">
            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mb-2 flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft
                className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
              />
            </button>

            <nav className="flex flex-1 flex-col gap-1">
              {sidebarLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600/15 via-cyan-600/10 to-transparent text-cyan-600 dark:from-cyan-500/25 dark:via-cyan-500/15 dark:to-transparent dark:text-cyan-300 font-semibold shadow-sm border-l-4 border-cyan-500 dark:border-cyan-400'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white hover:translate-x-0.5',
                      collapsed && 'justify-center px-2 border-l-0'
                    )
                  }
                >
                  <link.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile slide-over drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-slide-right flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/30">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        Trainer Portal
                      </span>
                      <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                        Mentore Solution LMS
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col gap-1">
                  {sidebarLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-cyan-600/15 via-cyan-600/10 to-transparent text-cyan-600 dark:from-cyan-500/25 dark:via-cyan-500/15 dark:to-transparent dark:text-cyan-300 font-semibold shadow-sm border-l-4 border-cyan-500 dark:border-cyan-400'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                        )
                      }
                    >
                      <link.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Drawer footer */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-400">
                <span>Mentore Solution LMS • Trainer Access</span>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden px-4 py-6 pb-20 sm:px-6 md:pb-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation bar for trainers */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/95 md:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          <NavLink
            to="/trainer"
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5',
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-400 dark:text-slate-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-xl p-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 scale-105 shadow-sm'
                      : 'hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/trainer/batches"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5',
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-400 dark:text-slate-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-xl p-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 scale-105 shadow-sm'
                      : 'hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                >
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">Batches</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/trainer/students"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5',
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-400 dark:text-slate-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-xl p-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 scale-105 shadow-sm'
                      : 'hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                >
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">Students</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/trainer/allowed-emails"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5',
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-400 dark:text-slate-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-xl p-1.5 transition-all duration-200',
                    isActive
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 scale-105 shadow-sm'
                      : 'hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">Emails</span>
              </>
            )}
          </NavLink>

          {/* More menu trigger for full drawer */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            <div className="rounded-xl p-1.5 transition-all duration-200">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
