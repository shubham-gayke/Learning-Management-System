import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, MessageCircle, User, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';

const bottomNavItems = [
  { to: '/lectures', icon: BookOpen, label: 'Lectures' },
  { to: '/jobs', icon: Briefcase, label: 'Job Portal' },
  { to: '/my-questions', icon: MessageCircle, label: 'My Questions' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function StudentLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom navigation (students only) */}
      {!isTrainer && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-900/95 md:hidden">
          <div className="mx-auto flex h-16 max-w-md items-center justify-around">
            {bottomNavItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div
                    className={cn(
                      'rounded-xl p-1.5 transition-all duration-200',
                      active
                        ? 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 scale-105 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold transition-colors',
                      active
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
