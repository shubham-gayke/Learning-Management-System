import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import TwoFactorSetupPage from './pages/auth/TwoFactorSetupPage';
import TwoFactorLoginPage from './pages/auth/TwoFactorLoginPage';

// Student pages
import SelectBatchPage from './pages/student/SelectBatchPage';
import DashboardPage from './pages/student/DashboardPage';
import CategoryLecturesPage from './pages/student/CategoryLecturesPage';
import LecturePage from './pages/student/LecturePage';
import MyQuestionsPage from './pages/student/MyQuestionsPage';
import ProfilePage from './pages/student/ProfilePage';
import JobPortalPage from './pages/student/JobPortalPage';

// Trainer pages
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import BatchesPage from './pages/trainer/BatchesPage';
import UploadLecturePage from './pages/trainer/UploadLecturePage';
import ManageLecturesPage from './pages/trainer/ManageLecturesPage';
import StudentsPage from './pages/trainer/StudentsPage';
import AllowedEmailsPage from './pages/trainer/AllowedEmailsPage';
import QAInboxPage from './pages/trainer/QAInboxPage';
import ReportBugPage from './pages/common/ReportBugPage';
import ManageJobsPage from './pages/trainer/ManageJobsPage';

// Layouts
import StudentLayout from './components/layout/StudentLayout';
import TrainerLayout from './components/layout/TrainerLayout';
import BatchGuard from './components/layout/BatchGuard';

// Loading spinner
import { Loader2 } from 'lucide-react';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Mentore Solution...</p>
      </div>
    </div>
  );
}

/** Redirect authenticated users away from public-only routes */
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullPageLoader />;
  if (isAuthenticated) {
    if (user?.role === 'trainer') return <Navigate to="/trainer" replace />;
    if (user?.twoFactorEnabled === false) return <Navigate to="/setup-2fa" replace />;
    if (user?.batch) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/select-batch" replace />;
  }
  return children;
}

/** Require authentication */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/** Block access if 2FA not set up (redirect to setup page - students only) */
function TwoFactorGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user?.role === 'trainer') return children;
  if (user && user.twoFactorEnabled === false) {
    return <Navigate to="/setup-2fa" replace />;
  }
  return children;
}

/** Root redirect based on role */
function RootRedirect() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'trainer') return <Navigate to="/trainer" replace />;
  if (user?.twoFactorEnabled === false) return <Navigate to="/setup-2fa" replace />;
  if (user?.batch) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/select-batch" replace />;
}

/** Route handler: if trainer visits /report-bug, redirect to /trainer/report-bug */
function StudentBugReportHandler() {
  const { user } = useAuth();
  if (user?.role === 'trainer') {
    return <Navigate to="/trainer/report-bug" replace />;
  }
  return <ReportBugPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Public-only routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />

      {/* 2FA Verification during Login */}
      <Route path="/verify-2fa" element={<TwoFactorLoginPage />} />

      {/* 2FA Setup for Authenticated Users without 2FA enabled */}
      <Route
        path="/setup-2fa"
        element={
          <ProtectedRoute>
            <TwoFactorSetupPage />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Student batch selection */}
      <Route
        path="/select-batch"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <TwoFactorGuard>
              <SelectBatchPage />
            </TwoFactorGuard>
          </ProtectedRoute>
        }
      />

      {/* Lecture Player & Bug Report routes - accessible to both Students and Trainers */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['student', 'trainer']}>
            <TwoFactorGuard>
              <BatchGuard>
                <StudentLayout />
              </BatchGuard>
            </TwoFactorGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/lecture/:id" element={<LecturePage />} />
        <Route path="/report-bug" element={<StudentBugReportHandler />} />
      </Route>

      {/* Student protected routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <TwoFactorGuard>
              <BatchGuard>
                <StudentLayout />
              </BatchGuard>
            </TwoFactorGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/lectures" element={<DashboardPage />} />
        <Route path="/lectures/:category" element={<CategoryLecturesPage />} />
        <Route path="/jobs" element={<JobPortalPage />} />
        <Route path="/my-questions" element={<MyQuestionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Trainer routes */}
      <Route
        path="/trainer"
        element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TwoFactorGuard>
              <TrainerLayout />
            </TwoFactorGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<TrainerDashboard />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="upload" element={<UploadLecturePage />} />
        <Route path="lectures" element={<ManageLecturesPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="allowed-emails" element={<AllowedEmailsPage />} />
        <Route path="jobs" element={<ManageJobsPage />} />
        <Route path="questions" element={<QAInboxPage />} />
        <Route path="report-bug" element={<ReportBugPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
