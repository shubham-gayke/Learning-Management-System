import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';
import { getUnreadNotificationsCount } from '../../api/questions';
import { getInitials } from '../../lib/utils';
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  GraduationCap,
  Bell,
  Bug,
} from 'lucide-react';
import DevNoticeBanner from '../common/DevNoticeBanner';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const socket = useSocket();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Detect scroll for glass-morphism
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch unread count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      getUnreadNotificationsCount()
        .then((res) => setUnreadCount(res.data?.unreadCount || 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time notification updates
  useEffect(() => {
    if (!socket) return;
    const handleNew = () => setUnreadCount((c) => c + 1);
    socket.on('trainer_new_question', handleNew);
    socket.on('question_message', handleNew);
    return () => {
      socket.off('trainer_new_question', handleNew);
      socket.off('question_message', handleNew);
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const isTrainer = user?.role === 'trainer';

  const studentLinks = [
    { to: '/dashboard', label: 'Lectures' },
    { to: '/exams', label: 'Exams' },
    { to: '/jobs', label: 'Job Portal' },
    { to: '/my-questions', label: 'My Questions' },
  ];

  const navLinks = isTrainer ? [] : studentLinks;
  const notificationLink = isTrainer ? '/trainer/questions' : '/my-questions';

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'glass border-slate-200/60 shadow-sm dark:border-slate-800/80'
          : 'border-transparent bg-white/95 dark:bg-slate-900/95 backdrop-blur-md'
      }`}
    >
      <DevNoticeBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden cursor-pointer transition-colors"
            onClick={() => {
              if (isTrainer && onToggleSidebar) {
                onToggleSidebar();
              } else {
                setMobileOpen(!mobileOpen);
              }
            }}
            aria-label="Toggle menu"
          >
            {isTrainer ? (
              <Menu className="h-5 w-5" />
            ) : mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-cyan-500/50">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
              Mentore Solution
            </span>
          </Link>
        </div>

        {/* Center: Desktop nav links (student only) */}
        {navLinks.length > 0 && (
          <nav className="hidden items-center gap-1.5 md:flex">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-cyan-600/10 to-blue-600/10 text-cyan-600 dark:from-cyan-500/20 dark:to-blue-500/20 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white hover:-translate-y-0.5'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Notification Bell + Glacier Theme toggle + user dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          {user && (
            <Link
              to={notificationLink}
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700/80 dark:hover:bg-slate-800/80 dark:hover:text-white transition-all duration-200"
              title="Questions & Notifications"
            >
              <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-[10px] font-extrabold text-white shadow-md shadow-rose-500/40 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Glacier Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 cursor-pointer ${
              theme === 'dark'
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-400/20 hover:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_24px_rgba(6,182,212,0.45)]'
                : 'border-slate-200 bg-white/80 text-cyan-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 shadow-sm hover:shadow'
            } active:scale-90`}
            title={theme === 'dark' ? 'Glacier: Switch to light mode' : 'Glacier: Switch to dark mode'}
            aria-label="Toggle light or dark mode"
          >
            <div className="relative flex items-center justify-center transition-transform duration-500 group-hover:rotate-45">
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
              ) : (
                <Moon className="h-5 w-5 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]" />
              )}
            </div>
            {/* Arctic cyan indicator pill */}
            <span
              className={`absolute -bottom-0.5 h-1 w-3 rounded-full transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                  : 'bg-cyan-600 shadow-[0_0_8px_#0891b2]'
              }`}
            />
          </button>

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 pr-2.5 hover:border-slate-200 hover:bg-slate-100/80 dark:hover:border-slate-700/80 dark:hover:bg-slate-800/80 transition-all duration-200 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-sm font-bold text-white shadow-sm shadow-cyan-500/25">
                  {getInitials(`${user.firstName} ${user.lastName}`)}
                </div>
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
                  {user.firstName}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/95 animate-slide-down">
                  <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-700/60">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    <span className="mt-1 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 capitalize">
                      {user.role}
                    </span>
                  </div>
                  {!isTrainer && (
                    <Link
                      to="/profile"
                      className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/80 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>
                  )}
                  <Link
                    to={isTrainer ? '/trainer/report-bug' : '/report-bug'}
                    className="mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 transition-colors"
                  >
                    <Bug className="h-4 w-4 text-amber-500" />
                    Report a Bug
                  </Link>
                  <button
                    onClick={logout}
                    className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer (student only) */}
      {mobileOpen && navLinks.length > 0 && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 dark:border-slate-700 dark:bg-slate-900 md:hidden animate-slide-down">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
