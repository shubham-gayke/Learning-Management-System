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
  MessageSquare,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';

const sidebarLinks = [
  { to: '/trainer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trainer/batches', icon: Layers, label: 'Batches' },
  { to: '/trainer/upload', icon: Upload, label: 'Upload Lecture' },
  { to: '/trainer/lectures', icon: Video, label: 'Manage Lectures' },
  { to: '/trainer/students', icon: Users, label: 'Students' },
  { to: '/trainer/questions', icon: MessageSquare, label: 'Q&A Inbox' },
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top navbar with hamburger for mobile */}
      <div className="relative z-40">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <Navbar />
      </div>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 md:block',
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

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-slide-right">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  Menu
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {sidebarLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      )
                    }
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
